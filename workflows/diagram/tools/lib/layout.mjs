// Lane-aware, incremental layout for a BPMN file.
//
// What it promises, in order of importance:
//
// 1. A shape that already has a position keeps it. Someone may have put it there
//    by hand in Camunda, and nothing records why. The exceptions are the two moves
//    that keep the drawing true: a node whose lane changed moves into its new lane
//    (x unchanged), and when a new step goes between two placed ones, everything
//    from the second one rightward slides over to make room. Both are reported.
// 2. Only what lacks a position gets one: new flow nodes, data references, text
//    annotations, lanes, pools, and the edges between them. So a revision's diff
//    touches what the revision changed and little else.
// 3. Lanes and pools are drawn. bpmn-auto-layout does not draw them at all, which
//    is why this exists.
// 4. Reading and writing go through bpmn-moddle, the serializer Camunda Modeler
//    itself uses, so opening and saving in Camunda does not reformat the file.
//
// Running it twice gives the same file as running it once.

import { BpmnModdle } from 'bpmn-moddle';

const GAP = 50; // horizontal space between neighbours
const ROW = 140; // height of one row inside a lane
const MARGIN = 15; // clearance a new shape keeps from existing ones
const POOL_LABEL = 30; // the strip on a pool's left that carries its name
const LANE_PAD = 25; // space kept below the lowest shape in a lane

const r = Math.round;

const is = (el, type) => el?.$instanceOf?.(type);
const isFlowNode = (el) => is(el, 'bpmn:FlowNode');
const isDataRef = (el) => is(el, 'bpmn:DataObjectReference') || is(el, 'bpmn:DataStoreReference');

function sizeOf(el) {
  if (is(el, 'bpmn:Event')) return [36, 36];
  if (is(el, 'bpmn:Gateway')) return [50, 50];
  if (is(el, 'bpmn:DataObjectReference')) return [36, 50];
  if (is(el, 'bpmn:DataStoreReference')) return [50, 50];
  if (is(el, 'bpmn:TextAnnotation')) return [100, 30];
  return [100, 80];
}

const right = (b) => b.x + b.width;
const bottom = (b) => b.y + b.height;
const cx = (b) => b.x + b.width / 2;
const cy = (b) => b.y + b.height / 2;
const overlaps = (a, b, m = 0) =>
  a.x - m < right(b) && right(a) + m > b.x && a.y - m < bottom(b) && bottom(a) + m > b.y;

export async function layout(xml) {
  const moddle = new BpmnModdle();
  const { rootElement: defs } = await moddle.fromXML(xml);
  const report = { placed: [], moved: [], removed: [] };

  const ids = new Set([...xml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const freshId = (base) => {
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}_${n}`;
    ids.add(id);
    return id;
  };

  const rootEls = defs.get('rootElements');
  const diagrams = defs.get('diagrams');

  // --- 1. Drop DI whose element is gone -------------------------------------
  // An id that no longer resolves leaves bpmnElement unset after parsing.
  for (let i = diagrams.length - 1; i >= 0; i--) {
    const plane = diagrams[i].plane;
    if (!plane?.bpmnElement) {
      report.removed.push(diagrams[i].id);
      diagrams.splice(i, 1);
      continue;
    }
    const els = plane.get('planeElement');
    for (let j = els.length - 1; j >= 0; j--)
      if (!els[j].bpmnElement) {
        report.removed.push(els[j].id);
        els.splice(j, 1);
      }
  }

  // --- 2. A process with lanes needs a pool to draw them in -----------------
  const processes = rootEls.filter((e) => is(e, 'bpmn:Process'));
  let collab = rootEls.find((e) => is(e, 'bpmn:Collaboration'));
  if (!collab && processes.some((p) => p.get('laneSets').length)) {
    collab = moddle.create('bpmn:Collaboration', { id: freshId('collaboration') });
    collab.$parent = defs;
    for (const p of processes) {
      const part = moddle.create('bpmn:Participant', {
        id: freshId(`${p.id}_pool`),
        name: p.name || 'Workflow',
        processRef: p,
      });
      part.$parent = collab;
      collab.get('participants').push(part);
    }
    rootEls.unshift(collab);
  }

  const mainEl = collab || processes[0];
  if (!mainEl) return { xml: (await moddle.toXML(defs, { format: true })).xml, ...report };

  let main =
    diagrams.find((d) => d.plane.bpmnElement === mainEl) ||
    diagrams.find((d) => is(d.plane.bpmnElement, 'bpmn:Process'));
  if (main) main.plane.bpmnElement = mainEl;
  else main = newDiagram(mainEl, 'diagram', 'plane', true);

  function newDiagram(el, diagramBase, planeBase, first = false) {
    const plane = moddle.create('bpmndi:BPMNPlane', { id: freshId(planeBase), bpmnElement: el });
    const d = moddle.create('bpmndi:BPMNDiagram', { id: freshId(diagramBase), plane });
    plane.$parent = d;
    d.$parent = defs;
    if (first) diagrams.unshift(d);
    else diagrams.push(d);
    return d;
  }

  // --- shape bookkeeping ------------------------------------------------------
  // Per plane: element id -> DI. `delta` records how far an existing shape moved,
  // so an edge whose two ends moved together can be translated rather than rerouted.
  const delta = new Map();
  const isNew = new Set();
  const relaned = new Set();

  const indexPlane = (plane) => {
    const m = new Map();
    for (const e of plane.get('planeElement')) m.set(e.bpmnElement.id, e);
    return m;
  };

  function addShape(plane, index, el, b, attrs = {}) {
    const di = moddle.create('bpmndi:BPMNShape', {
      id: freshId(`${el.id}_di`),
      bpmnElement: el,
      bounds: moddle.create('dc:Bounds', { x: r(b.x), y: r(b.y), width: b.width, height: b.height }),
      ...attrs,
    });
    di.$parent = plane;
    plane.get('planeElement').push(di);
    index.set(el.id, di);
    isNew.add(di);
    if (!is(el, 'bpmn:Participant') && !is(el, 'bpmn:Lane')) report.placed.push(el.id);
    return di;
  }

  function moveShape(di, dx, dy) {
    if (!dx && !dy) return;
    di.bounds.x = r(di.bounds.x + dx);
    di.bounds.y = r(di.bounds.y + dy);
    if (di.label?.bounds) {
      di.label.bounds.x = r(di.label.bounds.x + dx);
      di.label.bounds.y = r(di.label.bounds.y + dy);
    }
    if (isNew.has(di)) return;
    const d = delta.get(di) || { dx: 0, dy: 0 };
    delta.set(di, { dx: d.dx + dx, dy: d.dy + dy });
    if (!report.moved.includes(di.bpmnElement.id)) report.moved.push(di.bpmnElement.id);
  }

  // --- 3. Lay out the main plane ----------------------------------------------
  const mainIndex = indexPlane(main.plane);
  if (collab) {
    let prevBottom = null;
    for (const part of collab.get('participants')) {
      if (!part.processRef) continue;
      prevBottom = layoutPool(main.plane, mainIndex, part, prevBottom);
    }
    edgesOf(main.plane, mainIndex, null, collab.get('messageFlows').map((mf) => [mf, mf.sourceRef, mf.targetRef, 'straight']));
  } else {
    layoutFree(main.plane, mainIndex, processes[0]);
  }

  // --- 4. Each collapsed subprocess with content gets its own plane ----------
  const subprocesses = [];
  const collect = (container) => {
    for (const el of container.get('flowElements'))
      if (is(el, 'bpmn:SubProcess')) {
        subprocesses.push(el);
        collect(el);
      }
  };
  for (const p of processes) collect(p);
  for (const sub of subprocesses) {
    if (!sub.get('flowElements').length) continue;
    const owner = diagrams.flatMap((d) => d.plane.get('planeElement')).find((e) => e.bpmnElement === sub);
    if (owner?.isExpanded) continue; // drawn inline; its content lives on the parent plane
    const d = diagrams.find((x) => x.plane.bpmnElement === sub) || newDiagram(sub, `${sub.id}_diagram`, `${sub.id}_plane`);
    layoutFree(d.plane, indexPlane(d.plane), sub);
  }

  const { xml: out } = await moddle.toXML(defs, { format: true });
  return { xml: out, ...report };

  // ===========================================================================

  function leafLanes(laneSet) {
    if (!laneSet) return [];
    return laneSet.get('lanes').flatMap((l) => (l.childLaneSet ? leafLanes(l.childLaneSet) : [l]));
  }

  function layoutPool(plane, index, part, prevBottom) {
    const proc = part.processRef;
    let pool = index.get(part.id);
    if (!pool)
      pool = addShape(
        plane,
        index,
        part,
        { x: 160, y: prevBottom == null ? 80 : prevBottom + 40, width: 600, height: ROW },
        { isHorizontal: true }
      );
    const pb = pool.bounds;
    const innerX = pb.x + POOL_LABEL;

    const lanes = leafLanes(proc.get('laneSets')[0]);
    const bands = [];
    if (!lanes.length) {
      bands.push({ lane: null, x: innerX, y: pb.y, height: pb.height, shapes: [] });
    } else {
      for (const lane of lanes) {
        const di = index.get(lane.id);
        const last = bands[bands.length - 1];
        const y = di ? di.bounds.y : last ? last.y + last.height : pb.y;
        bands.push({ lane, di, x: innerX, y, height: di ? di.bounds.height : ROW, shapes: [] });
      }
    }

    const laneOf = new Map();
    for (const b of bands) for (const n of b.lane?.get('flowNodeRef') || []) laneOf.set(n.id, b);
    for (const b of bands) b.claims = (n) => laneOf.get(n.id) === b;
    placeContents(plane, index, proc, bands, (n) => laneOf.get(n.id) || bands[0]);

    // Grow each lane to hold what is in it, pushing the lanes below down.
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      // Only what this run placed or moved can make a lane grow. Shapes already
      // there were put there by someone, perhaps across a lane line on purpose.
      const driven = b.shapes.filter((s) => isNew.has(s) || relaned.has(s));
      const need = Math.max(b.y + (b.di ? 0 : ROW), ...driven.map((s) => bottom(s.bounds) + LANE_PAD));
      const dy = need - (b.y + b.height);
      if (dy <= 0) continue;
      b.height += dy;
      b.changed = true;
      for (const below of bands.slice(i + 1)) {
        below.y += dy;
        below.changed = true;
        for (const s of below.shapes) moveShape(s, 0, dy);
      }
    }

    // The pool wraps its lanes and everything in them; it never shrinks.
    const allShapes = bands.flatMap((b) => b.shapes);
    const maxRight = Math.max(right(pb), ...allShapes.map((s) => right(s.bounds) + GAP));
    const widthChanged = r(maxRight - pb.x) !== pb.width;
    pb.width = r(maxRight - pb.x);
    const lastBand = bands[bands.length - 1];
    pb.height = r(Math.max(pb.height, lastBand.y + lastBand.height - pb.y));
    if (lanes.length) {
      // An existing lane is rewritten only if it had to grow or move, or the
      // pool got wider; otherwise its bounds are someone's and stay as they are.
      for (const b of bands) {
        const box = { x: innerX, y: b.y, width: pb.width - POOL_LABEL, height: b.height };
        if (b.di) {
          if (b.changed) Object.assign(b.di.bounds, { y: r(box.y), height: r(box.height) });
          if (b.changed || widthChanged) Object.assign(b.di.bounds, { x: r(box.x), width: r(box.width) });
        } else {
          addShape(plane, index, b.lane, box, { isHorizontal: true });
          report.placed.push(b.lane.id);
        }
      }
    }

    edgesOf(plane, index, proc);
    return bottom(pb);
  }

  function layoutFree(plane, index, container) {
    const band = { lane: null, x: 100, y: 80, height: Infinity, shapes: [] };
    placeContents(plane, index, container, [band], () => band);
    edgesOf(plane, index, container);
  }

  function placeContents(plane, index, container, bands, bandOf) {
    const elements = container.get('flowElements');
    const nodes = elements.filter(isFlowNode);
    const dataRefs = elements.filter(isDataRef);
    const annotations = container.get('artifacts').filter((a) => is(a, 'bpmn:TextAnnotation'));
    const containerShapes = () => bands.flatMap((b) => b.shapes);
    const bandOfShape = new Map();
    const register = (b, di) => {
      b.shapes.push(di);
      bandOfShape.set(di, b);
    };
    const bandAt = (y) => bands.find((b) => y >= b.y && y < b.y + b.height) || bands[bands.length - 1];

    // Existing shapes, and which of them are now in the wrong lane. The test is
    // check-di's: a box may be drawn across two lanes, so it is only in the wrong
    // lane if it does not overlap the one it claims at all. A node in no lane is
    // never moved; that is the convention for a step with more than one performer.
    const relane = new Set();
    for (const n of nodes) {
      const di = index.get(n.id);
      if (!di) continue;
      const b = bandOf(n);
      register(b, di);
      const d = di.bounds;
      if (b.lane && b.claims(n) && !(d.y < b.y + b.height && b.y < bottom(d))) relane.add(n.id);
    }
    for (const el of [...dataRefs, ...annotations]) {
      const di = index.get(el.id);
      if (di) register(bandAt(cy(di.bounds)), di);
    }

    // Control flow, with loops broken so there is a left-to-right order.
    const flows = elements.filter((e) => is(e, 'bpmn:SequenceFlow') && e.sourceRef && e.targetRef);
    const out = new Map(nodes.map((n) => [n.id, []]));
    for (const f of flows) out.get(f.sourceRef.id)?.push(f.targetRef);
    const back = new Set();
    const state = new Map();
    const dfs = (n) => {
      state.set(n.id, 'open');
      for (const t of out.get(n.id) || []) {
        if (!out.has(t.id)) continue;
        if (state.get(t.id) === 'open') back.add(`${n.id}>${t.id}`);
        else if (!state.has(t.id)) dfs(t);
      }
      state.set(n.id, 'done');
    };
    const incoming = new Set(flows.map((f) => f.targetRef.id));
    for (const n of nodes) if (!incoming.has(n.id) && !state.has(n.id)) dfs(n);
    for (const n of nodes) if (!state.has(n.id)) dfs(n);
    const fwd = flows.filter((f) => !back.has(`${f.sourceRef.id}>${f.targetRef.id}`) && out.has(f.targetRef.id));
    const preds = new Map(nodes.map((n) => [n.id, []]));
    const succs = new Map(nodes.map((n) => [n.id, []]));
    for (const f of fwd) {
      preds.get(f.targetRef.id).push(f.sourceRef);
      succs.get(f.sourceRef.id).push(f.targetRef);
    }

    // Kahn's algorithm, ties broken by document order, so the result is stable.
    const order = [];
    const indeg = new Map(nodes.map((n) => [n.id, preds.get(n.id).length]));
    const ready = nodes.filter((n) => !indeg.get(n.id));
    while (ready.length) {
      const n = ready.shift();
      order.push(n);
      for (const t of succs.get(n.id)) {
        indeg.set(t.id, indeg.get(t.id) - 1);
        if (!indeg.get(t.id)) {
          ready.push(t);
          ready.sort((a, b) => nodes.indexOf(a) - nodes.indexOf(b));
        }
      }
    }

    const fits = (b, box, except) =>
      !b.shapes.some((s) => s !== except && overlaps(box, s.bounds, MARGIN));

    // The first free row at a given x, nearest the preferred row first.
    function findRow(b, left, w, h, baseCy, except) {
      for (const k of [0, 1, -1, 2, -2, 3, -3, 4, 5, 6, 7, 8]) {
        const box = { x: left, y: baseCy + k * ROW - h / 2, width: w, height: h };
        if (b.lane && box.y < b.y + 10) continue;
        if (fits(b, box, except)) return box.y;
      }
      return baseCy - h / 2 + 9 * ROW;
    }

    // From a new node, forward through nodes with no shape yet: the width the
    // longest such chain needs (each node and the gap after it), and the placed
    // shapes the chain runs into.
    function chainAhead(n, seen = new Set()) {
      seen.add(n.id);
      const [w] = sizeOf(n);
      let width = 0;
      const ahead = [];
      for (const t of succs.get(n.id)) {
        const di = index.get(t.id);
        if (di) ahead.push(di);
        else if (!seen.has(t.id)) {
          const sub = chainAhead(t, seen);
          width = Math.max(width, sub.width);
          ahead.push(...sub.ahead);
        }
      }
      return { width: w + GAP + width, ahead };
    }

    function shiftFrom(x0, dx) {
      for (const s of containerShapes()) if (s.bounds.x >= x0) moveShape(s, dx, 0);
    }

    for (const n of order) {
      const [w, h] = sizeOf(n);
      const b = bandOf(n);
      const placedPreds = preds.get(n.id).map((p) => index.get(p.id)).filter(Boolean);
      // Which row to try first: a node that merges paths sits in the row of the
      // step it leads into; anything else follows its predecessor's row.
      const sameBandPred = placedPreds.find((p) => bandOfShape.get(p) === b);
      const sameBandSucc = succs.get(n.id).map((t) => index.get(t.id)).find((t) => t && bandOfShape.get(t) === b);
      const merges = preds.get(n.id).length + flows.filter((f) => f.targetRef === n && back.has(`${f.sourceRef.id}>${n.id}`)).length > 1;
      const baseCy =
        merges && sameBandSucc ? cy(sameBandSucc.bounds) : sameBandPred ? cy(sameBandPred.bounds) : b.y + ROW / 2;

      if (relane.has(n.id)) {
        const di = index.get(n.id);
        const from = bandOfShape.get(di);
        if (from) from.shapes.splice(from.shapes.indexOf(di), 1);
        const y = findRow(b, di.bounds.x, w, h, b.y + ROW / 2, di);
        moveShape(di, 0, y - di.bounds.y);
        relaned.add(di);
        register(b, di);
        continue;
      }
      if (index.get(n.id)) continue;

      const placedSuccs = succs.get(n.id).map((s) => index.get(s.id)).filter(Boolean);
      let left;
      if (placedPreds.length) {
        // A flow that changes lane needs room to turn clear of the labels
        // that events and gateways carry below them.
        left = Math.max(...placedPreds.map((p) => right(p.bounds) + (bandOfShape.get(p) === b ? GAP : GAP + 30)));
        // Make room once, for the whole chain of new steps that starts here and
        // runs into shapes already placed, so no later shift lands on this one.
        const { width, ahead } = chainAhead(n);
        if (ahead.length) {
          const minL = Math.min(...ahead.map((s) => s.bounds.x));
          const need = left + width - minL;
          if (need > 0) shiftFrom(minL, need);
        }
      } else if (placedSuccs.length) {
        const minL = Math.min(...placedSuccs.map((s) => s.bounds.x));
        left = minL - GAP - w;
        const need = b.x + GAP - left;
        if (need > 0) {
          shiftFrom(-Infinity, need);
          left += need;
        }
      } else {
        const all = containerShapes();
        left = all.length ? Math.max(...all.map((s) => right(s.bounds))) + GAP : b.x + GAP;
      }
      const top = findRow(b, left, w, h, baseCy);
      const di = addShape(plane, index, n, { x: left, y: top, width: w, height: h });
      register(b, di);
    }

    // Data references sit just below the first step that reads or writes them.
    const anchorOf = (ref) =>
      nodes.find(
        (n) =>
          (n.get?.('dataOutputAssociations') || []).some((a) => a.targetRef === ref) ||
          (n.get?.('dataInputAssociations') || []).some((a) => (a.get('sourceRef') || []).includes(ref))
      );
    const placeNear = (el, anchorDi, w, h, dyFromAnchor) => {
      const b = anchorDi ? bandOfShape.get(anchorDi) : bands[bands.length - 1];
      let left, top;
      if (anchorDi) {
        left = anchorDi.bounds.x + anchorDi.bounds.width / 2 - w / 2;
        top = dyFromAnchor(anchorDi.bounds);
        if (b.lane) top = Math.max(top, b.y + 5);
      } else {
        const all = containerShapes();
        left = all.length ? Math.max(...all.map((s) => right(s.bounds))) + GAP : b.x + GAP;
        top = b.y + 20;
      }
      let box = { x: left, y: top, width: w, height: h };
      for (let k = 0; k < 12 && !fits(b, box); k++)
        box = k === 6 ? { ...box, x: left, y: top + ROW } : { ...box, x: box.x + 70 };
      register(b, addShape(plane, index, el, box));
    };
    for (const ref of dataRefs) {
      if (index.get(ref.id)) continue;
      const [w, h] = sizeOf(ref);
      const a = anchorOf(ref);
      placeNear(ref, a && index.get(a.id), w, h, (ab) => bottom(ab) + 25);
    }
    for (const t of annotations) {
      if (index.get(t.id)) continue;
      const assoc = container
        .get('artifacts')
        .find((a) => is(a, 'bpmn:Association') && (a.sourceRef === t || a.targetRef === t));
      const other = assoc && (assoc.sourceRef === t ? assoc.targetRef : assoc.sourceRef);
      placeNear(t, other && index.get(other.id), 100, 30, (ab) => ab.y - 50);
    }
  }

  function edgesOf(plane, index, container, extra = []) {
    const elements = container ? container.get('flowElements') : [];
    const todo = [...extra];
    for (const f of elements)
      if (is(f, 'bpmn:SequenceFlow')) todo.push([f, f.sourceRef, f.targetRef, 'sequence']);
    for (const n of elements) {
      if (!is(n, 'bpmn:Activity')) continue;
      for (const a of n.get('dataOutputAssociations')) todo.push([a, n, a.targetRef, 'straight']);
      for (const a of n.get('dataInputAssociations')) todo.push([a, a.get('sourceRef')[0], n, 'straight']);
    }
    for (const a of container ? container.get('artifacts') : [])
      if (is(a, 'bpmn:Association')) todo.push([a, a.sourceRef, a.targetRef, 'straight']);

    // Which sides of each shape already carry an edge, so a new edge can use a
    // free one rather than drawing over another.
    const sides = new Map();
    const used = (di) => sides.get(di) || sides.set(di, new Set()).get(di);
    const sideOf = (b, p) => {
      const d = { left: Math.abs(p.x - b.x), right: Math.abs(p.x - right(b)), top: Math.abs(p.y - b.y), bottom: Math.abs(p.y - bottom(b)) };
      return Object.keys(d).reduce((a, k) => (d[k] < d[a] ? k : a));
    };

    // Pass 1: keep, or translate, every edge whose two ends did not move apart.
    const reroute = [];
    for (const [el, src, tgt, kind] of todo) {
      const s = src && index.get(src.id);
      const t = tgt && index.get(tgt.id);
      if (!s || !t) continue;
      const di = index.get(el.id);
      if (di && di.get('waypoint').length) {
        const ds = isNew.has(s) ? null : delta.get(s) || { dx: 0, dy: 0 };
        const dt = isNew.has(t) ? null : delta.get(t) || { dx: 0, dy: 0 };
        // A kept edge that a shape placed this run now sits on is rerouted too.
        const crossed = () => {
          const wp = di.get('waypoint');
          for (const other of index.values()) {
            if (!isNew.has(other) || !other.bounds || other === s || other === t) continue;
            const o = other.bounds;
            for (let i = 1; i < wp.length; i++) {
              const box = {
                x: Math.min(wp[i - 1].x, wp[i].x) + ds.dx,
                y: Math.min(wp[i - 1].y, wp[i].y) + ds.dy,
                width: Math.abs(wp[i].x - wp[i - 1].x),
                height: Math.abs(wp[i].y - wp[i - 1].y),
              };
              if (overlaps(box, o, -2)) return true;
            }
          }
          return false;
        };
        if (ds && dt && ds.dx === dt.dx && ds.dy === dt.dy && !crossed()) {
          if (ds.dx || ds.dy) {
            for (const p of di.get('waypoint')) {
              p.x = r(p.x + ds.dx);
              p.y = r(p.y + ds.dy);
            }
            if (di.label?.bounds) {
              di.label.bounds.x = r(di.label.bounds.x + ds.dx);
              di.label.bounds.y = r(di.label.bounds.y + ds.dy);
            }
          }
          const wp = di.get('waypoint');
          const back = kind === 'sequence' && t.bounds.x < right(s.bounds);
          const a = sideOf(s.bounds, wp[0]);
          const b = sideOf(t.bounds, wp[wp.length - 1]);
          used(s).add(a);
          used(t).add(b);
          if (back) {
            used(s).add(`${a}:back`);
            used(t).add(`${b}:back`);
          }
          continue;
        }
      }
      reroute.push({ el, src, tgt, kind, s, t, di });
    }

    // Pass 2: route the rest. Forward flows first, so loops take what is left.
    const rank = (e) => (e.kind !== 'sequence' ? 2 : e.t.bounds.x >= right(e.s.bounds) ? 0 : 1);
    reroute.sort((a, b) => rank(a) - rank(b));
    for (const e of reroute) {
      let di = e.di;
      if (di) {
        di.label = undefined; // Camunda places a label that has no bounds
      } else {
        di = moddle.create('bpmndi:BPMNEdge', { id: freshId(`${e.el.id}_di`), bpmnElement: e.el });
        di.$parent = plane;
        plane.get('planeElement').push(di);
        index.set(e.el.id, di);
      }
      const { pts, from, to } = route(e.s.bounds, e.t.bounds, e.kind, e.src, e.tgt, used(e.s), used(e.t));
      used(e.s).add(from);
      used(e.t).add(to);
      if (rank(e) === 1) {
        used(e.s).add(`${from}:back`);
        used(e.t).add(`${to}:back`);
      }
      di.waypoint = pts.map(([x, y]) => moddle.create('dc:Point', { x: r(x), y: r(y) }));
    }
  }
}

// An orthogonal route for a sequence flow, or a straight line for the rest.
// Every endpoint sits on the middle of a side, which for a diamond or a circle
// is on its outline. `sUsed` and `tUsed` are the sides already carrying an edge.
// Returns the points and the side used at each end.
export function route(s, t, kind, src, tgt, sUsed = new Set(), tUsed = new Set()) {
  if (kind === 'straight') {
    const dx = cx(t) - cx(s);
    const dy = cy(t) - cy(s);
    const side = (b, ux, uy) =>
      Math.abs(ux) * b.height > Math.abs(uy) * b.width
        ? ux > 0 ? ['right', [right(b), cy(b)]] : ['left', [b.x, cy(b)]]
        : uy > 0 ? ['bottom', [cx(b), bottom(b)]] : ['top', [cx(b), b.y]];
    const [from, p] = side(s, dx, dy);
    const [to, q] = side(t, -dx, -dy);
    return { pts: [p, q], from, to };
  }
  const edgeY = (b, side) => (side === 'top' ? b.y : bottom(b));
  if (t.x >= right(s)) {
    const sy = cy(s);
    const ty = cy(t);
    if (Math.abs(sy - ty) < 1) return { pts: [[right(s), sy], [t.x, ty]], from: 'right', to: 'left' };
    const toward = ty > sy ? 'bottom' : 'top';
    const away = ty > sy ? 'top' : 'bottom';
    // Branches leaving a gateway the same way share that side and split off at
    // their own heights, the usual drawing. Only a loop on that side prevents it.
    if (src?.$instanceOf('bpmn:Gateway') && !sUsed.has(`${toward}:back`))
      return { pts: [[cx(s), edgeY(s, toward)], [cx(s), ty], [t.x, ty]], from: toward, to: 'left' };
    if (tgt?.$instanceOf('bpmn:Gateway') && !tUsed.has(away))
      return { pts: [[right(s), sy], [cx(t), sy], [cx(t), edgeY(t, away)]], from: 'right', to: away };
    const mid = (right(s) + t.x) / 2;
    return { pts: [[right(s), sy], [mid, sy], [mid, ty], [t.x, ty]], from: 'right', to: 'left' };
  }
  // Backward, a loop: under both shapes if both bottoms are free, else over both.
  const over = (sUsed.has('bottom') || tUsed.has('bottom')) && !sUsed.has('top') && !tUsed.has('top');
  const side = over ? 'top' : 'bottom';
  const y = over ? Math.min(s.y, t.y) - 25 : Math.max(bottom(s), bottom(t)) + 25;
  return {
    pts: [[cx(s), edgeY(s, side)], [cx(s), y], [cx(t), y], [cx(t), edgeY(t, side)]],
    from: side,
    to: side,
  };
}
