import { readFileSync, writeFileSync } from 'node:fs';
import { layoutProcess } from 'bpmn-auto-layout';

const [inPath, outPath] = process.argv.slice(2);
const result = await layoutProcess(readFileSync(inPath, 'utf8'));

const xml = typeof result === 'string' ? result : result.xml;
const warnings = (typeof result === 'string' ? [] : result.warnings) || [];

writeFileSync(outPath, xml);
console.log(`wrote ${outPath}`);
console.log(`warnings: ${warnings.length}`);
for (const w of warnings) console.log(`  [${w.code}] ${w.elementId}: ${w.message}`);
