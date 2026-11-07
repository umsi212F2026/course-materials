// node --test workflows/diagram/tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { layout } from '../lib/layout.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(here, 'fixtures', name), 'utf8');
const NO_DI = fixture('three-lanes-no-di.bpmn');
const PLACED = fixture('three-lanes-placed.bpmn');

// element id -> {x, y, width, height}, for every shape in the file
function shapes(xml) {
  const out = {};
  const re = /<bpmndi:BPMNShape [^>]*bpmnElement="([^"]+)"[^>]*>\s*<dc:Bounds x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g;
  for (const m of xml.matchAll(re)) out[m[1]] = { x: +m[2], y: +m[3], width: +m[4], height: +m[5] };
  return out;
}
// element id -> the edge's whole DI block, for comparing edges unchanged
function edges(xml) {
  const out = {};
  for (const m of xml.matchAll(/<bpmndi:BPMNEdge [^>]*bpmnElement="([^"]+)"[\s\S]*?<\/bpmndi:BPMNEdge>/g)) out[m[1]] = m[0];
  return out;
}
const laneMembers = (xml) => {
  const out = {};
  for (const m of xml.matchAll(/<bpmn:lane id="([^"]+)"[^>]*>([\s\S]*?)<\/bpmn:lane>/g))
    for (const r of m[2].matchAll(/<bpmn:flowNodeRef>([^<]+)</g)) out[r[1]] = m[1];
  return out;
};

function checkDi(xml) {
  const dir = mkdtempSync(join(tmpdir(), 'layout-test-'));
  const file = join(dir, 'w.bpmn');
  writeFileSync(file, xml);
  return execFileSync(process.execPath, [join(here, '..', 'check-di.mjs'), file], { encoding: 'utf8' });
}

test('a diagram with no layout gets a shape for everything, and check-di passes', async () => {
  const { xml } = await layout(NO_DI);
  const s = shapes(xml);
  for (const id of ['tracker', 'lane_human', 'lane_agent', 'lane_program', 'posting_saved', 'fetch_posting',
    'merge_assess', 'assess_posting', 'review_verdict', 'worth_applying', 'posting_tracked', 'posting_dropped', 'postings_store'])
    assert.ok(s[id], `${id} has a shape`);
  const e = edges(xml);
  for (const id of ['to_fetch', 'to_merge', 'to_assess', 'to_review', 'to_decide', 'yes', 'no', 'rerun', 'assess_writes_postings'])
    assert.ok(e[id], `${id} has an edge`);
  assert.match(checkDi(xml), /DI consistent/);
});

test('every node lies inside the band of its lane', async () => {
  const { xml } = await layout(NO_DI);
  const s = shapes(xml);
  for (const [node, lane] of Object.entries(laneMembers(xml))) {
    const n = s[node];
    const l = s[lane];
    assert.ok(n.y >= l.y && n.y + n.height <= l.y + l.height, `${node} inside ${lane}`);
  }
});

test('a laid-out diagram comes back byte for byte, and running twice equals once', async () => {
  assert.equal((await layout(PLACED)).xml, PLACED);
  const once = (await layout(NO_DI)).xml;
  assert.equal((await layout(once)).xml, once);
});

test('a new branch adds only its own shapes and edges', async () => {
  const edited = PLACED
    .replace('<bpmn:flowNodeRef>posting_dropped</bpmn:flowNodeRef>',
      '<bpmn:flowNodeRef>posting_dropped</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>save_for_later</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>posting_saved_for_later</bpmn:flowNodeRef>')
    .replace('<bpmn:outgoing>rerun</bpmn:outgoing>', '<bpmn:outgoing>rerun</bpmn:outgoing>\n      <bpmn:outgoing>later</bpmn:outgoing>')
    .replace('</bpmn:process>',
      '  <bpmn:userTask id="save_for_later" name="Save for later" />\n' +
      '    <bpmn:endEvent id="posting_saved_for_later" name="posting saved for later" />\n' +
      '    <bpmn:sequenceFlow id="later" name="not yet" sourceRef="worth_applying" targetRef="save_for_later" />\n' +
      '    <bpmn:sequenceFlow id="to_later_end" sourceRef="save_for_later" targetRef="posting_saved_for_later" />\n' +
      '  </bpmn:process>');
  const { xml, placed, moved } = await layout(edited);
  const before = shapes(PLACED);
  const after = shapes(xml);
  assert.deepEqual(placed.sort(), ['posting_saved_for_later', 'save_for_later']);
  // The branch needs a third row in HUMAN operator, so that lane grows and the
  // lanes below it move down together: same dy for all, x untouched.
  const lanes = laneMembers(PLACED);
  const below = (id) => lanes[id] === 'lane_agent' || lanes[id] === 'lane_program' || id === 'postings_store';
  const dy = after.fetch_posting.y - before.fetch_posting.y;
  assert.ok(dy > 0);
  assert.deepEqual(moved.sort(), Object.keys(before).filter((id) => below(id)).sort());
  for (const id of Object.keys(before)) {
    if (/^lane_|^tracker$/.test(id)) continue;
    assert.deepEqual(after[id], below(id) ? { ...before[id], y: before[id].y + dy } : before[id], `${id}`);
  }
  // Edges inside the HUMAN operator lane are untouched.
  const eb = edges(PLACED);
  const ea = edges(xml);
  for (const id of ['to_decide', 'yes', 'no']) assert.equal(ea[id], eb[id], `${id} edge unchanged`);
  assert.ok(ea.later && ea.to_later_end);
  assert.match(checkDi(xml), /DI consistent/);
});

test('a step inserted between two placed ones makes room, and says what moved', async () => {
  const edited = PLACED
    .replace('<bpmn:flowNodeRef>fetch_posting</bpmn:flowNodeRef>', '<bpmn:flowNodeRef>fetch_posting</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>clean_posting</bpmn:flowNodeRef>')
    .replace('<bpmn:sequenceFlow id="to_merge" sourceRef="fetch_posting"', '<bpmn:sequenceFlow id="to_merge" sourceRef="clean_posting"')
    .replace('</bpmn:process>',
      '  <bpmn:serviceTask id="clean_posting" name="Clean posting" />\n' +
      '    <bpmn:sequenceFlow id="to_clean" sourceRef="fetch_posting" targetRef="clean_posting" />\n' +
      '  </bpmn:process>');
  const { xml, placed, moved } = await layout(edited);
  const before = shapes(PLACED);
  const after = shapes(xml);
  assert.deepEqual(placed, ['clean_posting']);
  assert.ok(moved.includes('merge_assess'));
  // Everything left of the insertion stays; everything right of it moves by one amount.
  const dx = after.merge_assess.x - before.merge_assess.x;
  assert.ok(dx > 0);
  for (const id of Object.keys(before)) {
    if (/^lane_|^tracker$/.test(id)) continue;
    const expect = before[id].x >= before.merge_assess.x ? before[id].x + dx : before[id].x;
    assert.equal(after[id].x, expect, `${id} x`);
    assert.equal(after[id].y, before[id].y, `${id} y`);
  }
  assert.match(checkDi(xml), /DI consistent/);
});

test('a chain of two new steps inserted between placed ones keeps its order, on one row', async () => {
  // assess_posting -> check_deadline -> deadline_passed? -> review_verdict
  const edited = PLACED
    .replace('<bpmn:flowNodeRef>review_verdict</bpmn:flowNodeRef>',
      '<bpmn:flowNodeRef>check_deadline</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>deadline_passed</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>review_verdict</bpmn:flowNodeRef>')
    .replace('<bpmn:sequenceFlow id="to_review" sourceRef="assess_posting"', '<bpmn:sequenceFlow id="to_review" sourceRef="deadline_passed"')
    .replace('</bpmn:process>',
      '  <bpmn:userTask id="check_deadline" name="Check deadline" />\n' +
      '    <bpmn:exclusiveGateway id="deadline_passed" name="deadline passed?" />\n' +
      '    <bpmn:sequenceFlow id="to_check" sourceRef="assess_posting" targetRef="check_deadline" />\n' +
      '    <bpmn:sequenceFlow id="to_deadline" sourceRef="check_deadline" targetRef="deadline_passed" />\n' +
      '  </bpmn:process>');
  const { xml } = await layout(edited);
  const s = shapes(xml);
  const right = (b) => b.x + b.width;
  const cy = (b) => b.y + b.height / 2;
  assert.ok(right(s.assess_posting) < s.check_deadline.x, 'assess before check');
  assert.ok(right(s.check_deadline) < s.deadline_passed.x, 'check before gateway');
  assert.ok(right(s.deadline_passed) < s.review_verdict.x, 'gateway before review');
  assert.equal(cy(s.check_deadline), cy(s.review_verdict), 'check on the review row');
  assert.equal(cy(s.deadline_passed), cy(s.review_verdict), 'gateway on the review row');
  assert.match(checkDi(xml), /DI consistent/);
});

test('a new merge sits in the row of the step it leads into, and no edge crosses a shape', async () => {
  // "no" from worth_applying and a new path from deadline_passed both reach posting_dropped
  // through a new merge. This is what a test agent drew, replayed.
  const edited = PLACED
    .replace('<bpmn:flowNodeRef>review_verdict</bpmn:flowNodeRef>',
      '<bpmn:flowNodeRef>check_deadline</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>deadline_passed</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>merge_dropped</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>review_verdict</bpmn:flowNodeRef>')
    .replace('<bpmn:sequenceFlow id="to_review" sourceRef="assess_posting"', '<bpmn:sequenceFlow id="to_review" name="no" sourceRef="deadline_passed"')
    .replace('<bpmn:sequenceFlow id="no" name="no" sourceRef="worth_applying" targetRef="posting_dropped" />',
      '<bpmn:sequenceFlow id="no" name="no" sourceRef="worth_applying" targetRef="merge_dropped" />')
    .replace('</bpmn:process>',
      '  <bpmn:userTask id="check_deadline" name="Check deadline" />\n' +
      '    <bpmn:exclusiveGateway id="deadline_passed" name="deadline passed?" />\n' +
      '    <bpmn:exclusiveGateway id="merge_dropped" />\n' +
      '    <bpmn:sequenceFlow id="to_check" sourceRef="assess_posting" targetRef="check_deadline" />\n' +
      '    <bpmn:sequenceFlow id="to_deadline" sourceRef="check_deadline" targetRef="deadline_passed" />\n' +
      '    <bpmn:sequenceFlow id="expired" name="yes" sourceRef="deadline_passed" targetRef="merge_dropped" />\n' +
      '    <bpmn:sequenceFlow id="to_dropped" sourceRef="merge_dropped" targetRef="posting_dropped" />\n' +
      '  </bpmn:process>');
  const { xml } = await layout(edited);
  const s = shapes(xml);
  const cy = (b) => b.y + b.height / 2;
  assert.equal(cy(s.merge_dropped), cy(s.posting_dropped), 'merge on the row of posting dropped');
  // No edge passes through a shape other than its own two ends.
  const flows = {};
  for (const m of xml.matchAll(/<bpmn:sequenceFlow id="([^"]+)"[^>]*sourceRef="([^"]+)" targetRef="([^"]+)"/g)) flows[m[1]] = [m[2], m[3]];
  for (const [id, block] of Object.entries(edges(xml))) {
    if (!flows[id]) continue;
    const pts = [...block.matchAll(/x="([-\d.]+)" y="([-\d.]+)"/g)].map((m) => [+m[1], +m[2]]);
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      for (const [sid, box] of Object.entries(s)) {
        if (flows[id].includes(sid) || /^lane_|^tracker$|_store$/.test(sid)) continue;
        const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
        const hit = x0 < box.x + box.width - 2 && x1 > box.x + 2 && y0 < box.y + box.height - 2 && y1 > box.y + 2;
        assert.ok(!hit, `${id} crosses ${sid}`);
      }
    }
  }
  assert.match(checkDi(xml), /DI consistent/);
});

test('a step moved to another lane changes only its y and its edges', async () => {
  const edited = PLACED
    .replace('        <bpmn:flowNodeRef>review_verdict</bpmn:flowNodeRef>\n', '')
    .replace('<bpmn:flowNodeRef>assess_posting</bpmn:flowNodeRef>', '<bpmn:flowNodeRef>assess_posting</bpmn:flowNodeRef>\n        <bpmn:flowNodeRef>review_verdict</bpmn:flowNodeRef>');
  const { xml, moved } = await layout(edited);
  const before = shapes(PLACED);
  const after = shapes(xml);
  assert.deepEqual(moved, ['review_verdict']);
  assert.equal(after.review_verdict.x, before.review_verdict.x);
  assert.notEqual(after.review_verdict.y, before.review_verdict.y);
  for (const id of Object.keys(before)) {
    if (/^lane_|^tracker$|^review_verdict$/.test(id)) continue;
    assert.deepEqual(after[id], before[id], `${id} unchanged`);
  }
  const eb = edges(PLACED);
  const ea = edges(xml);
  for (const id of Object.keys(eb))
    if (!['to_review', 'to_decide'].includes(id)) assert.equal(ea[id], eb[id], `${id} edge unchanged`);
  assert.match(checkDi(xml), /DI consistent/);
});

test('a deleted step takes its layout with it and nothing else changes', async () => {
  const edited = PLACED
    .replace('        <bpmn:flowNodeRef>posting_dropped</bpmn:flowNodeRef>\n', '')
    .replace('      <bpmn:outgoing>no</bpmn:outgoing>\n', '')
    .replace(/    <bpmn:endEvent id="posting_dropped"[\s\S]*?<\/bpmn:endEvent>\n/, '')
    .replace(/    <bpmn:sequenceFlow id="no"[^\n]*\n/, '');
  const { xml, removed } = await layout(edited);
  assert.deepEqual(removed.sort(), ['no_di', 'posting_dropped_di']);
  const before = shapes(PLACED);
  const after = shapes(xml);
  assert.equal(after.posting_dropped, undefined);
  for (const id of Object.keys(after)) assert.deepEqual(after[id], before[id], `${id} unchanged`);
  assert.match(checkDi(xml), /DI consistent/);
});
