// Give positions to whatever in a BPMN file has none, and draw its pools and lanes.
//
//   node workflows/diagram/tools/layout.mjs <file.bpmn>
//
// Rewrites the file in place. Shapes that already have a position keep it, so
// this is safe to run after every edit, including after someone has moved
// things by hand in Camunda. What it does is in lib/layout.mjs.
//
// Prints one line for each thing it placed, moved or removed, so whoever ran
// it can say what changed. Exit code 1 if the file cannot be read as BPMN.

import { readFileSync, writeFileSync } from 'node:fs';
import { layout } from './lib/layout.mjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node workflows/diagram/tools/layout.mjs <file.bpmn>');
  process.exit(1);
}

let result;
try {
  result = await layout(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`${file}: not readable as BPMN: ${e.message}`);
  process.exit(1);
}

writeFileSync(file, result.xml);
for (const id of result.placed) console.log(`placed  ${id}`);
for (const id of result.moved) console.log(`moved   ${id}`);
for (const id of result.removed) console.log(`removed ${id}`);
if (!result.placed.length && !result.moved.length && !result.removed.length)
  console.log(`${file}: nothing to place`);
