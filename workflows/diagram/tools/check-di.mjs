// Check that a BPMN file's diagram interchange actually matches its semantics,
// and that its control flow goes somewhere.
//
//   node workflows/diagram/tools/check-di.mjs workflows/learn/learn.bpmn
//
// Catches the failures that are invisible in the XML and obvious once rendered:
// a flow node with no shape, an edge with no waypoints, and — the common one after
// hand-editing coordinates — an edge whose endpoints have drifted away from the shapes
// it connects, so the arrow floats in space.
//
// And the failure that is invisible in BOTH: a node the flow can never reach, or a
// node that can never reach an end event. The second is what a closed loop looks like
// — the picture reads as a spine, the token never leaves. No renderer will show you
// that and no amount of staring will either.
//
// Semantic rules beyond these (implicit splits, missing end events, unresolved
// references) belong to bpmnlint:
//
//   node workflows/diagram/tools/node_modules/.bin/bpmnlint -c workflows/diagram/.bpmnlintrc workflows/*/*.bpmn
//
// Lanes: a box may be DRAWN across two lanes — the geometry then says more than the model
// can, since a lane set is a partition. What must hold is that the lane it claims is one it
// actually sits in. bpmn-js assigns the lane a box mostly overlaps, so accepting its answer
// keeps file and editor in agreement.
//
// Exit code 1 if anything is wrong.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = process.argv[2];
if (!file) {
  console.error('usage: node workflows/diagram/tools/check-di.mjs <file.bpmn>');
  process.exit(1);
}
const xml = readFileSync(file, 'utf8');

const TOL = 12; // px an endpoint may sit off a shape's border

// --- semantics -------------------------------------------------------------
const nodes = new Set();
for (const m of xml.matchAll(
  /<bpmn:(startEvent|endEvent|userTask|serviceTask|scriptTask|manualTask|task|subProcess|adHocSubProcess|callActivity|exclusiveGateway|parallelGateway|inclusiveGateway|dataObjectReference|textAnnotation)\b[^>]*id="([^"]+)"/g
)) nodes.add(m[2]);

const starts = new Set();
for (const m of xml.matchAll(/<bpmn:startEvent\b[^>]*id="([^"]+)"/g)) starts.add(m[1]);

const ends = new Set();
for (const m of xml.matchAll(/<bpmn:endEvent\b[^>]*id="([^"]+)"/g)) ends.add(m[1]);

const edges = new Map(); // id -> {from, to}
const sequenceFlows = new Set(); // the subset that carries a token
for (const m of xml.matchAll(/<bpmn:sequenceFlow\b[^>]*id="([^"]+)"[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"/g)) {
  edges.set(m[1], { from: m[2], to: m[3] });
  sequenceFlows.add(m[1]);
}

for (const m of xml.matchAll(/<bpmn:association\b[^>]*id="([^"]+)"[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"/g))
  edges.set(m[1], { from: m[2], to: m[3] });

// An association belongs to the INNERMOST activity enclosing it. Subprocesses nest, so a
// non-greedy match on the container reads a child's associations as its parent's — which
// silently checks the wrong shape. Take the last activity opening tag before the match.
const ACTIVITY = /<bpmn:(?:userTask|serviceTask|scriptTask|manualTask|task|subProcess|adHocSubProcess|callActivity)\b[^>]*id="([^"]+)"/g;
const ownerAt = (index) => {
  let owner = null;
  for (const m of xml.matchAll(ACTIVITY)) {
    if (m.index > index) break;
    owner = m[1];
  }
  return owner;
};

for (const a of xml.matchAll(/<bpmn:dataInputAssociation[^>]*id="([^"]+)"[^>]*>\s*<bpmn:sourceRef>\s*([^<\s]+)/g)) {
  const owner = ownerAt(a.index);
  if (owner) edges.set(a[1], { from: a[2], to: owner });
}
for (const a of xml.matchAll(/<bpmn:dataOutputAssociation[^>]*id="([^"]+)"[^>]*>\s*<bpmn:targetRef>\s*([^<\s]+)/g)) {
  const owner = ownerAt(a.index);
  if (owner) edges.set(a[1], { from: owner, to: a[2] });
}

// --- diagram ---------------------------------------------------------------
const shapes = new Map();
for (const m of xml.matchAll(
  /<bpmndi:BPMNShape\b[^>]*bpmnElement="([^"]+)"[^>]*>\s*<dc:Bounds x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g
)) shapes.set(m[1], { x: +m[2], y: +m[3], w: +m[4], h: +m[5] });

const drawn = new Map();
for (const m of xml.matchAll(/<bpmndi:BPMNEdge\b[^>]*bpmnElement="([^"]+)"[^>]*>([\s\S]*?)<\/bpmndi:BPMNEdge>/g)) {
  const pts = [...m[2].matchAll(/<di:waypoint x="([-\d.]+)" y="([-\d.]+)"/g)].map((p) => ({ x: +p[1], y: +p[2] }));
  drawn.set(m[1], pts);
}

// --- checks ----------------------------------------------------------------
const problems = [];

for (const id of nodes) if (!shapes.has(id)) problems.push(`${id}: flow node has no BPMNShape`);
for (const id of edges.keys()) if (!drawn.has(id)) problems.push(`${id}: edge has no BPMNEdge`);
for (const id of drawn.keys()) if (!edges.has(id)) problems.push(`${id}: BPMNEdge refers to no element`);

const distanceToBox = (p, b) => {
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w));
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h));
  return Math.hypot(dx, dy);
};

for (const [id, { from, to }] of edges) {
  const pts = drawn.get(id);
  if (!pts || pts.length < 2) {
    if (pts) problems.push(`${id}: fewer than two waypoints`);
    continue;
  }
  for (const [end, nodeId, p] of [['start', from, pts[0]], ['end', to, pts[pts.length - 1]]]) {
    const box = shapes.get(nodeId);
    if (!box) continue;
    const d = distanceToBox(p, box);
    if (d > TOL) {
      problems.push(
        `${id}: ${end} point (${p.x}, ${p.y}) is ${Math.round(d)}px adrift of ${nodeId} ` +
          `[${box.x},${box.y} ${box.w}x${box.h}]`
      );
    }
  }
}

// --- reachability ----------------------------------------------------------
// Sequence flows only. A data association is a dotted line, not a token path, so it
// can never make a node reachable — which is exactly the mistake that once let curation
// become a closed loop, the arrows out of it all being data associations.
//
// Sequence flows never cross a container boundary in valid BPMN, so a subprocess's
// children form their own component with their own start and end events, and the same
// two walks check them without any special handling.

const flowNodes = [...nodes].filter((id) => !/^DOR_/.test(id) && shapes.has(id));
const annotations = new Set(
  [...xml.matchAll(/<bpmn:textAnnotation\b[^>]*id="([^"]+)"/g)].map((m) => m[1])
);

const dataObjects = new Set(
  [...xml.matchAll(/<bpmn:dataObjectReference\b[^>]*id="([^"]+)"/g)].map((m) => m[1])
);

const forward = new Map();
const backward = new Map();
for (const id of sequenceFlows) {
  const { from, to } = edges.get(id);
  if (!forward.has(from)) forward.set(from, []);
  if (!backward.has(to)) backward.set(to, []);
  forward.get(from).push(to);
  backward.get(to).push(from);
}

const walk = (seeds, adjacency) => {
  const seen = new Set(seeds);
  const queue = [...seeds];
  while (queue.length) {
    for (const next of adjacency.get(queue.pop()) || []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen;
};

// Activities inside an ad-hoc subprocess are deliberately unsequenced — that is what
// ad-hoc means, and it is why the conversation idiom uses one. They have no flow, no
// start and no end by design, so reachability is not a question that applies to them.
const adHocChildren = new Set();
for (const block of xml.matchAll(/<bpmn:adHocSubProcess\b[\s\S]*?<\/bpmn:adHocSubProcess>/g))
  for (const c of block[0].matchAll(
    /<bpmn:(?:userTask|serviceTask|scriptTask|manualTask|task|subProcess|callActivity|startEvent|endEvent|exclusiveGateway|parallelGateway|inclusiveGateway)\b[^>]*id="([^"]+)"/g
  )) adHocChildren.add(c[1]);

const participating = flowNodes.filter((id) => !dataObjects.has(id) && !adHocChildren.has(id) && !annotations.has(id));

if (!starts.size) {
  problems.push('no start event: cannot check reachability');
} else {
  const reachable = walk([...starts], forward);
  for (const id of participating) {
    if (!reachable.has(id)) problems.push(`${id}: unreachable — no path from any start event`);
  }
}

if (!ends.size) {
  problems.push('no end event: every path is a dead end, so the dead-end check cannot run');
} else {
  const terminating = walk([...ends], backward);
  for (const id of participating) {
    if (!terminating.has(id)) {
      problems.push(`${id}: dead end — no path from here to any end event`);
    }
  }
}

// --- lanes against geometry ------------------------------------------------
// Lane membership carries the executor, and nothing else does. A node declared in one lane
// but drawn in another says two different things. A node in NO lane is the convention for
// "more than one executor", which is only true if it actually straddles a boundary — and
// until it does, the XML and the canvas disagree with nobody to notice.

const laneName = new Map();
for (const m of xml.matchAll(/<bpmn:lane\b[^>]*>/g)) {
  const id = (m[0].match(/ id="([^"]+)"/) || [])[1];
  if (id) laneName.set(id, (m[0].match(/ name="([^"]*)"/) || [])[1] || id);
}
const laneOf = new Map();
// A self-closing lane has no members; matching it as an opening tag would run the scan
// forward and collect the NEXT lane's members instead.
for (const m of xml.matchAll(/<bpmn:lane\b([^>]*[^\/])>([\s\S]*?)<\/bpmn:lane>/g)) {
  const id = (m[1].match(/ id="([^"]+)"/) || [])[1];
  if (!id) continue;
  for (const r of m[2].matchAll(/<bpmn:flowNodeRef>\s*([^<\s]+)/g)) laneOf.set(r[1], id);
}

const isFlowNode = (id) => nodes.has(id) && !dataObjects.has(id) && !annotations.has(id);

for (const plane of xml.matchAll(/<bpmndi:BPMNPlane\b[^>]*>([\s\S]*?)<\/bpmndi:BPMNPlane>/g)) {
  const laneBoxes = [], nodeBoxes = [];
  for (const m of plane[1].matchAll(
    /<bpmndi:BPMNShape\b[^>]*bpmnElement="([^"]+)"[^>]*>\s*<dc:Bounds x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g
  )) {
    const box = { id: m[1], y: +m[3], h: +m[5] };
    if (laneName.has(box.id)) laneBoxes.push(box);
    else if (isFlowNode(box.id)) nodeBoxes.push(box);
  }
  if (laneBoxes.length < 2) continue;

  for (const n of nodeBoxes) {
    const declared = laneOf.get(n.id);

    // Overlap, not containment. A box may be drawn across two lanes — the geometry then says
    // more than the model can, since a lane set is a partition and a node joins at most one.
    // What must hold is that the lane it claims is one it actually sits in.
    const touching = laneBoxes.filter((l) => n.y < l.y + l.h && l.y < n.y + n.h);

    if (!declared) {
      problems.push(`${n.id}: in no lane — nothing says which executor runs it`);
    } else if (!touching.some((l) => l.id === declared)) {
      const lane = laneBoxes.find((l) => l.id === declared);
      problems.push(
        `${n.id}: claims lane "${laneName.get(declared)}" but is drawn nowhere near it ` +
          `[node y ${n.y}-${n.y + n.h}, lane y ${lane ? `${lane.y}-${lane.y + lane.h}` : '?'}]`
      );
    }
  }
}

// --- repeated files --------------------------------------------------------
// A file drawn twice is two dataObjectReferences pointing at ONE dataObject. A modeler
// will happily give you two separate objects that merely share a label, and nothing on
// the canvas distinguishes that from a real repeat — same icon, same name, same colour,
// a different file as far as the model is concerned.

const dataRefs = [...xml.matchAll(/<bpmn:dataObjectReference\b[^>]*>/g)]
  .map((m) => ({
    id: (m[0].match(/ id="([^"]+)"/) || [])[1],
    name: (m[0].match(/ name="([^"]+)"/) || [])[1],
    ref: (m[0].match(/ dataObjectRef="([^"]+)"/) || [])[1],
  }))
  .filter((r) => r.id);

const flat = (t) => (t || '').replace(/\n/g, ' ');
const group = (key, value) => {
  const out = new Map();
  for (const r of dataRefs) {
    if (!r[key]) continue;
    if (!out.has(r[key])) out.set(r[key], new Map());
    out.get(r[key]).set(r[value], r.id);
  }
  return out;
};

for (const [name, refs] of group('name', 'ref')) {
  if (refs.size > 1) {
    const where = [...refs].map(([ref, id]) => id + ' -> ' + (ref || 'no dataObjectRef')).join(', ');
    problems.push(
      '"' + flat(name) + '" is drawn ' + refs.size + ' times but is ' + refs.size +
        ' different data objects (' + where + ') — point them at one dataObject, or name them differently'
    );
  }
}

for (const [ref, names] of group('ref', 'name')) {
  if (names.size > 1) {
    const where = [...names].map(([n, id]) => id + ' = "' + flat(n) + '"').join(', ');
    problems.push(ref + ' is one data object drawn under ' + names.size + ' names (' + where + ')');
  }
}

// --- bindings -------------------------------------------------------------
// Every step names the skill file or program that runs it, in two places: the visible
// label and bpmn:documentation. Nothing keeps those two in step, and nothing checks
// either against the repo — so a rename drifts silently, a step drawn twice grows two
// different labels, and NOT WRITTEN YET stays on a file somebody wrote weeks ago.

// A path may name a file in THIS repo (`workflows/<name>/skills/.../SKILL.md`) or
// one in an external repo cloned as a sibling (`obra/superpowers:skills/foo/SKILL.md`).
// The `owner/repo:` prefix is what makes the second kind followable by a reader
// — without it, `skills/brainstorming/SKILL.md` looks local, and this repo has
// its own skills/ for it to be confused with.
const PATH =
  /(?:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+:)?[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/[A-Za-z0-9_-]+\.(?:md|mjs|json)/g;
const EXTERNAL = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+):(.+)$/;
const ROOTED = /^(?:workflows|notes|plans|scripts)\//;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

// Where to look for an external clone. "Beside this repo" is right for the main
// checkout, but a linked worktree lives in the corral
// (~/Documents/Documents/code/.worktrees/), and its neighbours are other
// worktrees — not the clone. So also resolve the MAIN checkout and look beside
// that. In a worktree, .git is a FILE reading `gitdir: <main>/.git/worktrees/<name>`.
const siblingRoots = [dirname(repoRoot)];
try {
  const dotGit = resolve(repoRoot, '.git');
  if (statSync(dotGit).isFile()) {
    const gitdir = (readFileSync(dotGit, 'utf8').match(/gitdir:\s*(.+)/) || [])[1];
    if (gitdir) siblingRoots.push(dirname(resolve(gitdir.trim(), '../../..')));
  }
} catch {
  // No .git, or unreadable — the sibling-of-repoRoot guess is all we have.
}
const missingClones = new Set();
const carriers = new Map(); // path -> [{id, label}]

for (const m of xml.matchAll(/<bpmn:(\w+)\s([^>]*?)(\/?)>/g)) {
  const [, tag, attrs, selfClosing] = m;
  const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
  const label = (attrs.match(/\bname="([^"]*)"/) || [])[1];
  if (!id || label === undefined) continue;

  // Documentation is the element's first child when present. Bound the search at this
  // element's own closing tag so a sibling's documentation never gets attributed here.
  let doc = '';
  if (!selfClosing) {
    const rest = xml.slice(m.index + m[0].length);
    const end = rest.indexOf(`</bpmn:${tag}>`);
    doc =
      (rest.slice(0, end === -1 ? undefined : end).match(
        /<bpmn:documentation>([\s\S]*?)<\/bpmn:documentation>/
      ) || [])[1] || '';
  }
  const inLabel = [...new Set(label.match(PATH) || [])];
  const inDoc = [...new Set(doc.match(PATH) || [])];

  for (const p of inLabel)
    if (inDoc.length && !inDoc.includes(p))
      problems.push(
        `${id}: label says ${p} but bpmn:documentation says ${inDoc.join(', ')} — a rename went into one and not the other`
      );

  for (const p of new Set([...inLabel, ...inDoc])) {
    if (!carriers.has(p)) carriers.set(p, []);
    carriers.get(p).push({ id, label: flat(label) });
  }
}

for (const [p, on] of carriers) {
  const labels = new Set(on.filter((o) => o.label.includes(p)).map((o) => o.label));
  if (labels.length !== undefined && labels.size > 1)
    problems.push(
      `${p} is drawn on ${on.length} steps with ${labels.size} different labels ` +
        `(${[...labels].map((l) => '"' + l + '"').join(' / ')}) — the same step drawn twice has to read the same both times`
    );

  const flagged = on.some((o) => /NOT WRITTEN YET/.test(o.label));

  // `owner/repo:path` — resolve against the sibling clone. If that clone isn't
  // present, say so once at the end rather than reporting every path as broken:
  // on a machine that hasn't run workflows/develop/tools/get-superpowers.sh, absence is expected
  // and is not a defect in the diagram.
  const ext = p.match(EXTERNAL);
  if (ext) {
    const [, , repo, inner] = ext;
    const cloneRoot = siblingRoots
      .map((root) => resolve(root, repo))
      .find((candidate) => existsSync(candidate));
    if (!cloneRoot) {
      missingClones.add(repo);
      continue;
    }
    const extOnDisk = existsSync(resolve(cloneRoot, inner));
    if (!extOnDisk && !flagged)
      problems.push(
        `${p} does not exist in the ${repo} clone — it may have moved upstream since the pin`
      );
    if (extOnDisk && flagged)
      problems.push(`${p} exists now — drop NOT WRITTEN YET from ${on.map((o) => o.id).join(', ')}`);
    continue;
  }

  if (!ROOTED.test(p)) {
    // A path on a label is there so a reader can go open it. One that only resolves if you
    // already know which folder the step lives in doesn't do that job.
    problems.push(
      `${p} on ${on.map((o) => o.id).join(', ')} is not a path from the repo root — a reader can't follow it`
    );
    continue;
  }

  const onDisk = existsSync(resolve(repoRoot, p));
  if (!onDisk && !flagged)
    problems.push(`${p} does not exist — write it, or mark the label NOT WRITTEN YET`);
  if (onDisk && flagged)
    problems.push(`${p} exists now — drop NOT WRITTEN YET from ${on.map((o) => o.id).join(', ')}`);
}

// Not a problem — a note. The diagram is fine; this machine just hasn't cloned
// what it refers to, so those bindings went unchecked. Say which, so a silent
// skip never reads as a pass.
for (const repo of missingClones)
  console.log(`${file}: note — '${repo}' is not cloned beside this repo, so its paths went unchecked`);
if (missingClones.has('superpowers'))
  console.log(`  clone it: workflows/develop/tools/get-superpowers.sh`);

if (!problems.length) {
  console.log(
    `${file}: ${nodes.size} nodes, ${edges.size} edges, ${carriers.size} bindings — DI consistent, flow reaches an end`
  );
} else {
  console.log(`${file}: ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
