//
// A student's BPMN diagram as plain lanes and steps, so a judge or a quiz question reads a few
// lines instead of XML. No XML dependency: a regex tokenizer builds a small tree, in the style of
// processOf in course-materials' record/tools/changes.mjs.
//
// TAGS ARE MATCHED BY LOCAL NAME. Camunda writes bpmn:task, other tools write bpmn2:task or no
// prefix at all, and none of that is the student's doing.
//
// NEVER THROWS. A file that is not a diagram gives no lanes and a text that says so, because the
// caller is grading it and a crash would hide the grade.

const STEP_TYPES = new Set(["task", "userTask", "serviceTask", "scriptTask", "manualTask", "subProcess", "callActivity"]);
const TRIGGERS = { timerEventDefinition: "timer", messageEventDefinition: "message", signalEventDefinition: "signal", conditionalEventDefinition: "conditional" };
const UNREADABLE = "(the diagram could not be read)";
const DOC_CAP = 300;

const local = (tag) => tag.replace(/^.*:/, "");

function parse(xml) {
  const root = { tag: "", attrs: {}, text: "", children: [] };
  const stack = [root];
  for (const [tok] of xml.matchAll(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g)) {
    const top = stack[stack.length - 1];
    if (tok.startsWith("<!--") || tok.startsWith("<?")) continue;
    if (tok.startsWith("</")) {
      if (stack.length > 1) stack.pop();
    } else if (tok.startsWith("<![CDATA[")) top.text += tok.slice(9, -3);
    else if (tok.startsWith("<")) {
      const m = /^<([^\s/>]+)([\s\S]*?)(\/?)>$/.exec(tok);
      if (!m) continue;
      const attrs = {};
      for (const [, k, dq, sq] of m[2].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[local(k)] = unescape(dq ?? sq);
      const node = { tag: local(m[1]), attrs, text: "", children: [], parent: top };
      top.children.push(node);
      if (!m[3]) stack.push(node);
    } else top.text += tok;
  }
  return root;
}

// A NUMERIC REFERENCE IS DECODED TOO, and whitespace becomes a plain space: a modeler writes a
// line break in a label as `&#10;`, and the summary gives each step one line.
function unescape(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
      const c = String.fromCodePoint(/^x/i.test(n) ? parseInt(n.slice(1), 16) : Number(n));
      return /\s/.test(c) ? " " : c;
    })
    .replace(/&amp;/g, "&");
}

// A step's documentation sits on an indented line after the step's own, so a reader can tell the
// two apart and a question about the step can quote the step line alone.
function docLine(doc) {
  const d = doc.replace(/\s+/g, " ").trim();
  return `  documentation: ${d.length > DOC_CAP ? `${d.slice(0, DOC_CAP)} [cut]` : d}`;
}

const descendants = (n) => n.children.flatMap((c) => [c, ...descendants(c)]);

export function summarizeDiagram(xml) {
  const none = { lanes: [], start: [], text: UNREADABLE };
  try {
    if (typeof xml !== "string") return none;
    const all = descendants(parse(xml));
    const processes = all.filter((n) => n.tag === "process");
    if (!processes.length) return none;

    const participants = all.filter((n) => n.tag === "participant" && n.attrs.processRef);
    const pooled = participants.length >= 2;
    const poolOf = (p) => participants.find((x) => x.attrs.processRef === p.attrs.id)?.attrs.name ?? "";

    const lanes = [];
    const start = [];
    const names = new Map();
    const flows = [];
    for (const proc of processes) {
      const nodes = descendants(proc);
      const prefix = pooled && poolOf(proc) ? `${poolOf(proc)} / ` : "";
      const laneOf = new Map();
      const mine = [];
      for (const lane of nodes.filter((n) => n.tag === "lane")) {
        const entry = { name: prefix + (lane.attrs.name ?? lane.attrs.id ?? ""), steps: [] };
        mine.push(entry);
        for (const ref of lane.children.filter((c) => c.tag === "flowNodeRef")) laneOf.set(ref.text.trim(), entry);
      }
      const orphans = { name: `${prefix}(no lane)`, steps: [] };
      for (const n of nodes) {
        if (n.attrs.id) names.set(n.attrs.id, n.attrs.name || n.attrs.id);
        if (n.tag === "startEvent") {
          // A subprocess's own start event is where the subprocess begins, not the trigger.
          if (n.parent !== proc) continue;
          const def = n.children.map((c) => TRIGGERS[c.tag]).find(Boolean);
          start.push({ name: n.attrs.name || n.attrs.id || "", trigger: def ?? "none" });
        } else if (STEP_TYPES.has(n.tag)) {
          const doc = n.children.find((c) => c.tag === "documentation");
          const step = { id: n.attrs.id ?? "", name: n.attrs.name || n.attrs.id || "", type: n.tag, doc: doc ? unescape(doc.text.trim()) : "" };
          // Modelers list only a lane's top-level nodes, so a step inside a subprocess takes the
          // lane of the nearest enclosing node that is listed.
          let home;
          for (let a = n; a && !home; a = a.parent) home = laneOf.get(a.attrs.id);
          (home ?? orphans).steps.push(step);
        } else if (n.tag === "sequenceFlow") flows.push(n.attrs);
      }
      lanes.push(...mine);
      if (orphans.steps.length) lanes.push(orphans);
    }

    const label = (id) => names.get(id) ?? id ?? "";
    const text = [
      ...lanes.flatMap((l) => l.steps.flatMap((s) => [`${l.name}: ${s.name} (${s.type})`, ...(s.doc ? [docLine(s.doc)] : [])])),
      ...start.map((s) => `Start: ${s.name} (${s.trigger})`),
      ...flows.map((f) => `Flow: ${label(f.sourceRef)} -> ${label(f.targetRef)}`),
    ].join("\n");
    return { lanes, start, text };
  } catch {
    return none;
  }
}
