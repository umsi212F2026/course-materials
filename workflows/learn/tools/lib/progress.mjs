// Draw a topic's progress through its sequence of sets, from surveyTopic's result. Pure: no
// reads, no printing, so the same view feeds the chat text, the one-set line and (later) the web
// panel's JSON.
//
// ASCII ONLY. The marks and the arrow are plain characters so the view lines up in every
// terminal, a Windows console included, and survives being pasted anywhere.
//
// FOUR MARKS, ORDERED LIKE A PROGRESS BAR. met, tried, not started, deferred. `tried` is a goal
// with attempts and not met: the survey has no state for it, so it is worked out here from the
// row's attempt count. A deferred goal that was also tried reads as deferred, because deferred is
// where the learner said it will be learned. Retired goals are left out of marks and counts, as
// they are from survey's own fractions.
//
// THE CURRENT SET IS THE SURVEY'S OWN, the first with a goal that is neither met nor deferred,
// converted to 1-based so the two definitions cannot drift apart. next-goal.mjs also passes over
// goals with nothing live, so it can occasionally name a later set; that is acceptable. A set
// holding only deferred goals is waiting on elsewhere, not next, and a set whose goals are all
// retired has nothing to be next about.

const MARKS = { met: '#', tried: '~', open: '.', deferred: '>' };
const ORDER = ['met', 'tried', 'open', 'deferred'];
const LEGEND = ' # met  ~ tried  . not started  > deferred';
const WIDTH = 96;
const NAMES_SHOWN = 6;

const LABELS = { vocabulary: 'Words' };
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildProgress(s) {
  const rows = new Map(s.groups.flatMap((g) => g.goals).map((r) => [r.id, r]));
  const topic = s.dir.replace(/[\\/]+$/, '').split(/[\\/]/).pop();

  const sets = s.sequence.sets.map((set, i) => {
    const number = i + 1;
    const groups = [...new Set(set.goals.map((g) => rows.get(g.id).group))];
    const label = groups.length === 1 ? (LABELS[groups[0]] ?? titleCase(groups[0])) : `Set ${number}`;

    const goals = set.goals
      .filter((g) => g.state !== 'retired')
      .map((g) => {
        const row = rows.get(g.id);
        const state =
          g.state === 'met' || g.state === 'deferred' ? g.state : row.attempts > 0 ? 'tried' : 'open';
        return {
          id: g.id,
          state,
          mark: MARKS[state],
          capability: row.capability ?? null,
          where: row.deferred ?? null,
        };
      })
      .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state));
    return { number, label, met: goals.filter((g) => g.state === 'met').length, total: goals.length, goals };
  });

  const idx = s.sequence.current ?? -1;
  const current = idx === -1 ? null : idx + 1;

  // A SPLIT CAPABILITY IS ONE NAME. Its fraction counts every live part, in any set, the way the
  // survey's capability fractions do; a slug with a single part is just that goal.
  const parts = new Map();
  for (const set of sets)
    for (const g of set.goals)
      if (g.capability) {
        const c = parts.get(g.capability) ?? { met: 0, total: 0 };
        c.total++;
        if (g.state === 'met') c.met++;
        parts.set(g.capability, c);
      }

  const next = [];
  const deferred = [];
  if (current !== null) {
    for (const g of sets[idx].goals) {
      if (g.state === 'deferred') {
        deferred.push({ id: g.id, where: g.where });
        continue;
      }
      if (g.state === 'met') continue;
      const c = g.capability && parts.get(g.capability);
      if (c && c.total > 1) {
        const name = `${g.capability} ${c.met}/${c.total}`;
        const at = next.find((n) => n.name === name);
        if (at) at.tried ||= g.state === 'tried';
        else next.push({ name, tried: g.state === 'tried' });
      } else next.push({ name: g.id, tried: g.state === 'tried' });
    }
    next.sort((a, b) => b.tried - a.tried);
  }

  return { topic, decided: s.sequence.decided, current, sets, next, deferred };
}

const header = (v) => {
  const total = v.sets.length;
  const where = v.current === null ? 'every set is done' : `set ${v.current} of ${total} is next`;
  return `${v.topic} - ${v.decided ? '' : 'sequence not decided yet - '}${where}`;
};

const marksOf = (set) => set.goals.map((g) => g.mark).join('');

// Greedy word wrap at WIDTH, every line indented one space. A unit never splits; `sep` is the
// separator before it and is dropped at a line break.
function wrap(units) {
  const lines = [];
  let line = '';
  for (const { text, sep } of units) {
    if (line && line.length + sep.length + text.length > WIDTH) {
      lines.push(line);
      line = ' ' + text;
    } else line = line ? line + sep + text : ' ' + text;
  }
  lines.push(line);
  return lines.join('\n');
}

function nextLine(v) {
  const shown = v.next.slice(0, NAMES_SHOWN);
  const more = v.next.length > NAMES_SHOWN;
  const units = [{ text: 'Next set:', sep: ' ' }];
  shown.forEach((n, i) => {
    const comma = i < shown.length - 1 || more ? ',' : '';
    units.push({ text: n.name, sep: ' ' });
    if (n.tried) units.push({ text: `(tried)${comma}`, sep: ' ' });
    else units[units.length - 1].text += comma;
  });
  if (more) units.push({ text: '...', sep: ' ' });
  v.deferred.forEach((d, i) => {
    const last = i === v.deferred.length - 1;
    const text = `${d.id} deferred: ${d.where}${last ? ')' : ','}`;
    units.push({ text: i === 0 ? '(' + text : text, sep: i === 0 ? '  ' : ' ' });
  });
  return wrap(units);
}

export function renderFull(v) {
  const labelW = Math.max(...v.sets.map((x) => x.label.length));
  const marksW = Math.max(...v.sets.map((x) => marksOf(x).length));
  const rows = v.sets.map(
    (x) =>
      ` ${x.number} ${x.label.padEnd(labelW)}  ${marksOf(x).padEnd(marksW)}  ${x.met}/${x.total}` +
      (x.number === v.current ? '   <- next' : '')
  );
  const out = [header(v), '', ...rows, ''];
  if (v.current !== null) out.push(nextLine(v), '');
  out.push(LEGEND);
  return out.join('\n');
}

export function renderSet(v, n) {
  const x = v.sets[n - 1];
  const still = v.current !== null && v.current !== n ? `; set ${v.current} is still next` : '';
  return `${x.label}  ${marksOf(x)}  ${x.met}/${x.total}   (set ${n} of ${v.sets.length}${still})`;
}
