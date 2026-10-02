import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';
import { foldStatus, readStatus } from '../lib/status.mjs';

const topic = () => makeTopic({ goals: CAP_GOAL('c-read') });

test('deferred without --where is refused', () => {
  const r = run('record-status.mjs', [topic(), 'deferred', 'c-read']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /say where/);
});

test('deferred with --where "" is refused', () => {
  const r = run('record-status.mjs', [topic(), 'deferred', 'c-read', '--where', '']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /say where/);
});

test('deferred with an unknown goal id is refused', () => {
  const r = run('record-status.mjs', [topic(), 'deferred', 'c-nope', '--where', 'PS3']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /is not in/);
});

test('deferred then resumed folds to no deferral', () => {
  const dir = topic();
  assert.equal(run('record-status.mjs', [dir, 'deferred', 'c-read', '--where', 'PS3']).code, 0);
  assert.equal(foldStatus(readStatus(dir)).deferredGoals.get('c-read'), 'PS3');
  assert.equal(run('record-status.mjs', [dir, 'resumed', 'c-read']).code, 0);
  assert.equal(foldStatus(readStatus(dir)).deferredGoals.has('c-read'), false);
});

test('resumed with no prior deferral is accepted', () => {
  const r = run('record-status.mjs', [topic(), 'resumed', 'c-read']);
  assert.equal(r.code, 0);
  assert.equal(r.stderr, '');
});

test('deferred on a met goal warns but records', () => {
  const dir = topic();
  run('record-attempt.mjs', [dir, 'c-read', 'a-x/1', '--axes', '{"unaided":"yes","criterion":"met"}']);
  const r = run('record-status.mjs', [dir, 'deferred', 'c-read', '--where', 'PS3']);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /already met/);
  assert.ok(readStatus(dir).some((e) => e.kind === 'deferred' && e.goal === 'c-read'));
});
