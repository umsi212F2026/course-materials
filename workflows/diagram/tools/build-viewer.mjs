// Build a self-contained BPMN viewer: one HTML file, no network, no install.
//
//   node workflows/diagram/tools/build-viewer.mjs
//
// Writes workflows/diagram/tools/bpmn-viewer.html at the repo root. Open it in any browser, drop a .bpmn file on
// it, and click into collapsed subprocesses to drill down. It inlines bpmn-js from
// tools/node_modules, so the file works anywhere it's copied to — including on a machine
// with no node, no npm and no internet. That's the point: it's shareable with students.
//
// Rebuild it after upgrading bpmn-js.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = join(root, 'workflows/diagram/tools/node_modules/bpmn-js/dist');

const read = (p) => readFileSync(join(dist, p), 'utf8');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>BPMN viewer</title>
<style>
${read('assets/diagram-js.css')}
${read('assets/bpmn-js.css')}

html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
body { display: flex; flex-direction: column; }

header {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.6rem 1rem; border-bottom: 1px solid #d4d4d4;
  background: #fafafa; font-size: 0.9rem;
}
header strong { font-weight: 600; }
header .hint { color: #666; }

#canvas { flex: 1; position: relative; }

#drop {
  position: absolute; inset: 0; display: grid; place-items: center;
  color: #888; font-size: 1.1rem; pointer-events: none;
}
#drop.hidden { display: none; }

body.dragging #canvas { outline: 3px dashed #7a9; outline-offset: -12px; }

#error {
  display: none; padding: 1rem; color: #a00; white-space: pre-wrap;
  font-family: ui-monospace, monospace; font-size: 0.85rem;
}
</style>
</head>
<body>

<header>
  <strong>BPMN viewer</strong>
  <input type="file" id="file" accept=".bpmn,.xml">
  <span class="hint">or drop a file anywhere &middot; click a collapsed subprocess to go inside</span>
</header>

<div id="canvas"><div id="drop">no diagram loaded</div></div>
<pre id="error"></pre>

<script>${read('bpmn-navigated-viewer.production.min.js')}</script>
<script>
  const viewer = new BpmnJS({ container: '#canvas' });
  const drop = document.getElementById('drop');
  const error = document.getElementById('error');

  async function show(xml, name) {
    error.style.display = 'none';
    try {
      await viewer.importXML(xml);
      viewer.get('canvas').zoom('fit-viewport');
      drop.classList.add('hidden');
      document.title = name ? name + ' — BPMN viewer' : 'BPMN viewer';
    } catch (err) {
      error.textContent = (err.message || String(err)) +
        (err.warnings && err.warnings.length
          ? '\\n\\n' + err.warnings.map((w) => w.message).join('\\n')
          : '');
      error.style.display = 'block';
    }
  }

  function load(file) {
    const reader = new FileReader();
    reader.onload = () => show(reader.result, file.name);
    reader.readAsText(file);
  }

  document.getElementById('file').addEventListener('change', (e) => {
    if (e.target.files[0]) load(e.target.files[0]);
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.classList.add('dragging');
  });
  document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) document.body.classList.remove('dragging');
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('dragging');
    if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]);
  });
</script>
</body>
</html>
`;

const out = join(root, 'workflows/diagram/tools/bpmn-viewer.html');
writeFileSync(out, html);
console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB`);
