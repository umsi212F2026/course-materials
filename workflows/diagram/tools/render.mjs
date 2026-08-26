// Render a BPMN file to PNG. Optionally render a drill-down level instead of the root.
//
//   node workflows/diagram/tools/render.mjs in.bpmn out.png              # root plane
//   node workflows/diagram/tools/render.mjs in.bpmn out.png Conv_criteria # the plane for that subprocess
//
// This drives bpmn-js through puppeteer directly rather than shelling out to
// bpmn-to-image, which renders only the FIRST <BPMNDiagram> and has no flag for
// choosing one. The source file is never modified.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const [inPath, outPath, planeFor] = process.argv.slice(2);

if (!inPath || !outPath) {
  console.error('usage: node workflows/diagram/tools/render.mjs <in.bpmn> <out.png> [subprocessId]');
  process.exit(1);
}

const xml = readFileSync(inPath, 'utf8');

let source = inPath;

if (planeFor) {
  const blocks = xml.match(/<bpmndi:BPMNDiagram\b[\s\S]*?<\/bpmndi:BPMNDiagram>/g) || [];
  const wanted = blocks.findIndex((b) =>
    new RegExp(`<bpmndi:BPMNPlane\\b[^>]*bpmnElement="${planeFor}"`).test(b)
  );

  if (wanted === -1) {
    const planes = blocks
      .map((b) => (b.match(/<bpmndi:BPMNPlane\b[^>]*bpmnElement="([^"]+)"/) || [])[1])
      .filter(Boolean);
    console.error(`no plane for "${planeFor}". planes in this file: ${planes.join(', ')}`);
    process.exit(1);
  }

  const reordered = [blocks[wanted], ...blocks.filter((_, i) => i !== wanted)];
  let n = 0;
  source = join(mkdtempSync(join(tmpdir(), 'bpmnplane-')), 'reordered.bpmn');
  writeFileSync(source, xml.replace(/<bpmndi:BPMNDiagram\b[\s\S]*?<\/bpmndi:BPMNDiagram>/g, () => reordered[n++]));
}

const skeleton = new URL('./skeleton.html', import.meta.url);
const viewerScript = import.meta.resolve('bpmn-js/dist/bpmn-viewer.production.min.js');

const browser = await puppeteer.launch({ headless: 'new' });

try {
  const page = await browser.newPage();
  await page.goto(skeleton.href);

  const size = await page.evaluate(async (diagramXML, script) => {
    await loadScript(script);
    return openDiagram(diagramXML);
  }, readFileSync(source, 'utf8'), viewerScript);

  await page.setViewport({
    width: Math.round(size.width),
    height: Math.round(size.height),
  });
  await page.evaluate(() => resize());

  console.log(`writing ${outPath}`);
  await page.screenshot({
    path: outPath,
    clip: { x: 0, y: 0, width: Math.round(size.width), height: Math.round(size.height) },
  });
} finally {
  await browser.close();
}
