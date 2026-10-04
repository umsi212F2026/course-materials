// The mechanical halves of grading, shared by both front ends.
//
// SHARED FOR THE SAME REASON bank.mjs IS. The instructor's batch runner and a student's
// practice quiz have to settle a multiple choice the same way and score a script the same way,
// or "you practise against the real grader" quietly stops being true. The judging is not here
// at all: that is workflows/quiz/skills/quiz/grade/SKILL.md, followed by an agent, and keeping
// it out of code is what lets one skill serve both.
//
// NOTHING HERE READS A FILE OR A NETWORK. Each front end brings its own already-parsed draw
// and submissions, which is what makes all of this testable without a database or a cluster.

/** What each credit is worth. Exported because both front ends score with it, and two
 *  copies of this object is how a practice quiz and a real one start to disagree. */
export const CREDIT_VALUE = { full: 1, half: 0.5, none: 0 };

/** One row per (student, item) for every student who was assigned a draw.
 *
 *  `source` says where the text came from, and it is the honest distinction the export
 *  went to trouble to preserve: a submission, a draft that was never sent, or nothing at
 *  all because they never opened it. */
export function collectAnswers(drawFile, submissionsFile) {
  const submitted = new Map(submissionsFile.submissions.map((s) => [s.uniqname, s]));
  const drafted = new Map(submissionsFile.drafts.map((d) => [d.uniqname, d]));

  const rows = [];
  for (const draw of drawFile.draws) {
    const sub = submitted.get(draw.uniqname);
    const draft = drafted.get(draw.uniqname);
    const source = sub ? "submission" : draft ? "draft" : "absent";
    const byItem = new Map((sub ?? draft)?.answers?.map((a) => [a.item_id, a.text]) ?? []);

    for (const item of draw.items) {
      const text = byItem.get(item.id) ?? null;
      rows.push({
        uniqname: draw.uniqname,
        canvas_id: draw.canvas_id ?? sub?.canvas_id ?? draft?.canvas_id ?? null,
        source,
        item,
        text,
      });
    }
  }
  return rows;
}

/** An mcq is right when the stored text equals the recorded answer index. Nothing else
 *  counts: an empty answer, a stray space, or a value from an older render of the page is
 *  not the answer, and guessing at intent here would be a silent regrade. */
export function settleMcq(item, text) {
  return text !== null && text.trim() === String(item.answer) ? "full" : "none";
}

/** The goals an item names: its `goals` when it carries them, else its one `goal`, else none. */
export const itemGoals = (item) => item.goals ?? (item.goal ? [item.goal] : []);

/** The free answers, grouped by the question they answer. An item with no answers at all
 *  is left out: there is nothing to rule on, and an empty group in the queue reads as work
 *  to do. */
export function buildQueue(rows) {
  const groups = new Map();
  for (const r of rows) {
    if (r.item.type === "mcq") continue;
    if (r.text === null || r.text.trim() === "") continue;
    if (!groups.has(r.item.id)) {
      groups.set(r.item.id, {
        item: r.item.id,
        bank: r.item.bank ?? null,
        goal: r.item.goal ?? null,
        // EVERY GOAL THE QUESTION NAMES, ALWAYS AN ARRAY. A folder question may name several,
        // and then `goal` above is null and this is the only place the grader learns what it
        // is ruling on per goal. A single-file item names one or none, and gets `[goal]` or `[]`.
        goals: itemGoals(r.item),
        prompt: r.item.prompt,
        rubric: r.item.rubric,
        answers: [],
      });
    }
    groups.get(r.item.id).answers.push({ uniqname: r.uniqname, answer: r.text });
  }
  return [...groups.values()];
}

/** A per-goal verdict settled into one mark, or a string saying why it cannot be.
 *
 *  IT MUST NAME EXACTLY THE QUESTION'S GOALS. A goal left out is not a goal the student got
 *  nothing on, and averaging over the rest would quietly score a two-goal question as if it had
 *  one: that is a claim about the grading run, so it is a problem, as a missing verdict is.
 *
 *  The value is the mean of the per-goal credits. The credit is the one they share when they all
 *  agree and `partial` when they do not; `partial` has no entry in CREDIT_VALUE on purpose, so
 *  anything that scores a multi-goal item has to read its `value`. Each goal gets its own axes,
 *  because each is recorded against its own goal: half credit on a goal is `not met` for it. */
function settlePerGoal(item, perGoal, unaided) {
  const want = itemGoals(item);
  const missing = want.filter((g) => !Object.hasOwn(perGoal, g));
  if (missing.length) return `per_goal is missing ${missing.join(", ")}`;
  const extra = Object.keys(perGoal).filter((g) => !want.includes(g));
  if (extra.length) return `per_goal names ${extra.join(", ")}, which the question does not`;
  if (!want.length) return "per_goal given, but the question names no goal";

  const settled = {};
  for (const g of want) {
    const p = perGoal[g] ?? {};
    if (!Object.hasOwn(CREDIT_VALUE, p.credit)) return `per_goal ${g}: credit "${p.credit}" is not full, half or none`;
    const own = p.axes?.unaided === "no" || p.axes?.unaided === "unclear" ? p.axes.unaided : unaided;
    settled[g] = {
      credit: p.credit,
      missed: p.missed ?? "",
      axes: { unaided: own, criterion: p.axes?.criterion === "unchecked" ? "unchecked" : p.credit === "full" ? "met" : "not met" },
    };
  }
  const credits = want.map((g) => settled[g].credit);
  return {
    credit: credits.every((c) => c === credits[0]) ? credits[0] : "partial",
    value: credits.reduce((t, c) => t + CREDIT_VALUE[c], 0) / credits.length,
    perGoal: settled,
  };
}

/** Fold the verdicts back onto the rows and score each student.
 *
 *  A free answer with no verdict is a PROBLEM rather than a zero. The difference matters:
 *  a zero is a claim about the student, and a missing verdict is a claim about the grading
 *  run, and quietly turning the second into the first is how a grading bug reaches a
 *  gradebook looking like a result. */
export function mergeGrades(rows, verdicts, { date, session, corrections = [] }) {
  const problems = [];
  // Last correction wins, so re-reviewing an answer is just appending another line.
  const fixes = new Map();
  for (const c of corrections) fixes.set(`${c.uniqname}\u0000${c.item}`, c);
  const fixesUsed = new Set();
  const verdictTimes = new Map();
  for (const v of verdicts) if (v.at) verdictTimes.set(`${v.uniqname}\u0000${v.item}`, String(v.at));
  const byKey = new Map(verdicts.map((v) => [`${v.uniqname}\u0000${v.item}`, v]));
  const used = new Set();

  const students = new Map();
  for (const r of rows) {
    if (!students.has(r.uniqname)) {
      students.set(r.uniqname, {
        uniqname: r.uniqname,
        canvas_id: r.canvas_id,
        status: r.source,
        items: [],
      });
    }
    const student = students.get(r.uniqname);

    let credit;
    let missed = "";
    let flag = false;
    let flagReason = "";
    let criterion;
    // `yes` UNLESS A VERDICT SAYS OTHERWISE. In class it is true by construction: the quiz is
    // sat in the room with nothing else open. In practice the page is answered cold too, but
    // the agent is in the room afterwards, and an answer the student went back and talked
    // through before submitting is not an unaided one. The grade skill is the only thing that
    // can see the difference, so where it reports one, that is what gets recorded.
    let unaided = "yes";
    // SET ONLY BY A PER-GOAL VERDICT, and absent from the output otherwise, which is what keeps
    // a verdict without `per_goal` merging to exactly the object it always has.
    let value = null;
    let perGoal = null;

    if (r.item.type === "mcq") {
      credit = settleMcq(r.item, r.text);
      criterion = credit === "full" ? "met" : "not met";
    } else if (r.text === null || r.text.trim() === "") {
      // Nothing written is not a partial, and it needs no adjudicator to say so.
      credit = "none";
      criterion = "not met";
    } else {
      const key = `${r.uniqname}\u0000${r.item.id}`;
      const v = byKey.get(key);
      if (!v) {
        problems.push(`${r.uniqname} ${r.item.id}: answered, but no verdict came back`);
        continue;
      }
      used.add(key);
      missed = v.missed ?? "";
      flag = Boolean(v.flag);
      // WHY IT IS FLAGGED IS NOT WHAT THE STUDENT IS TOLD. `missed` is written to the student
      // and is empty on full credit, so a flag on a correct answer had nowhere to put its
      // reason and three of them came out silent: flagged, with nobody able to reconstruct
      // what for. This field is the reviewer's.
      flagReason = v.flag_reason ?? "";
      if (v.axes?.unaided === "no" || v.axes?.unaided === "unclear") unaided = v.axes.unaided;
      if (v.per_goal) {
        const settled = settlePerGoal(r.item, v.per_goal, unaided);
        if (typeof settled === "string") {
          problems.push(`${r.uniqname} ${r.item.id}: ${settled}`);
          continue;
        }
        ({ credit, value, perGoal } = settled);
      } else {
        credit = v.credit;
      }
      criterion = credit === "full" ? "met" : "not met";
      // A CAPABILITY ITEM IS MARKED AND ESTABLISHES NOTHING, and those two are not in tension:
      // one is a mark, the other is evidence. The student answered the question that was asked,
      // so the credit stands; nobody watched them do the thing, so the criterion is `unchecked`
      // and no review date moves on it.
      if (v.axes?.criterion === "unchecked") criterion = "unchecked";
      if (!perGoal && !Object.hasOwn(CREDIT_VALUE, credit)) {
        problems.push(`${r.uniqname} ${r.item.id}: credit "${credit}" is not full, half or none`);
        continue;
      }
    }

    // A CORRECTION OVERRIDES, IT DOES NOT ERASE. The grader's own verdict stays beside it as
    // `grader_credit`, because the reason for reading every script this term is to compare the
    // grader's flags against what the instructor actually overrode. Overwriting the original
    // would destroy the only evidence that comparison runs on.
    const fixKey = `${r.uniqname}\u0000${r.item.id}`;
    const rawFix = fixes.get(fixKey);
    // A CORRECTION APPLIES ONLY IF IT IS NEWER THAN THE VERDICT IT CORRECTS. That one rule is
    // what lets a regrade supersede an earlier hand correction without anything rewriting an
    // append-only file: the regrade appends fresher verdicts, and corrections made against the
    // old criteria simply stop being the latest word. A verdict with no timestamp predates the
    // rule and a correction always wins over it, which is the behaviour everything graded so
    // far already has.
    const verdictAt = verdictTimes.get(fixKey) ?? "";
    const fix = rawFix && String(rawFix.at ?? "") >= verdictAt ? rawFix : null;
    let corrected = false;
    let graderCredit = null;
    if (fix) {
      if (!Object.hasOwn(CREDIT_VALUE, fix.credit)) {
        problems.push(`correction for ${r.uniqname} ${r.item.id}: credit "${fix.credit}" is not full, half or none`);
      } else {
        fixesUsed.add(fixKey);
        corrected = true;
        graderCredit = credit;
        credit = fix.credit;
        // A CORRECTION REPLACES THE AVERAGE, because it is one mark on the whole question and
        // the instructor gave it knowing what the per-goal rulings were. Those stay beside it
        // in `per_goal`, as the grader's, for the same reason `grader_credit` does.
        value = null;
        if (typeof fix.comment === "string") missed = fix.comment;
        // A CORRECTION CHANGES THE MARK, NOT WHETHER ANYBODY WATCHED. `unchecked` on a
        // capability item says nobody established the capability, and a second opinion on how
        // well the question was answered does not establish it either.
        if (criterion !== "unchecked") criterion = credit === "full" ? "met" : "not met";
      }
    }

    student.items.push({
      item: r.item.id,
      type: r.item.type,
      goal: r.item.goal ?? null,
      credit,
      missed,
      flag,
      flag_reason: flagReason,
      corrected,
      grader_credit: graderCredit,
      axes: { unaided, criterion },
      ...(value !== null ? { value } : {}),
      ...(perGoal ? { per_goal: perGoal } : {}),
    });
  }

  for (const v of verdicts) {
    if (!used.has(`${v.uniqname}\u0000${v.item}`)) {
      problems.push(`verdict for ${v.uniqname} ${v.item} matches no answered item`);
    }
  }
  const graded = new Set(rows.map((r) => `${r.uniqname}\u0000${r.item.id}`));
  for (const c of corrections) {
    const key = `${c.uniqname}\u0000${c.item}`;
    if (!fixesUsed.has(key) && !graded.has(key)) {
      problems.push(`correction for ${c.uniqname} ${c.item} matches no graded item`);
    }
  }

  const list = [...students.values()].map((s) => ({
    ...s,
    score: Number(s.items.reduce((t, i) => t + (i.value ?? CREDIT_VALUE[i.credit]), 0).toFixed(2)),
    out_of: s.items.length,
  }));
  list.sort((a, b) => a.uniqname.localeCompare(b.uniqname));

  return { date, session, graded: new Date().toISOString(), students: list, problems };
}
