// Render a question's Markdown as HTML, for the practice page and the quiz app alike.
//
// ONE RENDERER FOR BOTH, because a student practises the page they will sit. The quiz app keeps
// an exact copy of this file (client/src/markdown.mjs in si212-quiz), and a test there fails when
// the two differ, so change this one and copy it across.
//
// IT COVERS WHAT THE BANKS USE, not all of Markdown: paragraphs, fenced blocks, bullets and
// numbered lists (nested by indentation), tables, blockquotes, headings, code spans, bold,
// italic and http(s) links. Anything else shows as the text it is, which is readable.
//
// ESCAPING COMES FIRST, so nothing a bank says can become markup it did not ask for, and no
// dependency: the quiz tools ship to students with nothing to install.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const FENCE = /^\s*(`{3,}|~{3,})/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
const QUOTE = /^\s*>/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const ROW = /^\s*\|/;
const RULE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const startsBlock = (line) => FENCE.test(line) || HEADING.test(line) || QUOTE.test(line) || ITEM.test(line) || ROW.test(line);

/** Code spans are set aside before anything else, so their contents are never read as markup. */
function inline(text) {
  const codes = [];
  return esc(text)
    .replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?![\w*])/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/\u0000(\d+)\u0000/g, (_, n) => `<code>${codes[n]}</code>`);
}

const cells = (line) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** A list starting at lines[i], whose items sit at that line's indentation. Returns [html, next i]. */
function list(lines, i) {
  const [, indent, marker] = ITEM.exec(lines[i]);
  const tag = /\d/.test(marker) ? 'ol' : 'ul';
  const items = [];
  while (i < lines.length) {
    const line = lines[i];
    const m = ITEM.exec(line);
    if (m && m[1].length === indent.length) {
      items.push({ text: m[3], nested: '' });
      i++;
    } else if (m && m[1].length > indent.length && items.length) {
      const [html, next] = list(lines, i);
      items[items.length - 1].nested += html;
      i = next;
    } else if (line.trim() && !m && !startsBlock(line) && items.length) {
      items[items.length - 1].text += ` ${line.trim()}`;
      i++;
    } else if (!line.trim() && ITEM.exec(lines[i + 1] ?? '')?.[1].length >= indent.length) {
      i++;
    } else break;
  }
  return [`<${tag}>${items.map((it) => `<li>${inline(it.text)}${it.nested}</li>`).join('')}</${tag}>`, i];
}

/** Block structure. Inside a blockquote, `breaks` keeps each line's break, because a quoted
 *  exchange is lines the author broke on purpose. */
function blocks(lines, breaks = false) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (FENCE.test(line)) {
      const mark = FENCE.exec(line)[1];
      const body = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith(mark); i++) body.push(lines[i]);
      i++;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
    } else if (HEADING.test(line)) {
      out.push(`<h4>${inline(HEADING.exec(line)[1])}</h4>`);
      i++;
    } else if (QUOTE.test(line)) {
      const inner = [];
      for (; i < lines.length && QUOTE.test(lines[i]); i++) inner.push(lines[i].replace(/^\s*> ?/, ''));
      out.push(`<blockquote>${blocks(inner, true)}</blockquote>`);
    } else if (ROW.test(line) && RULE.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && ROW.test(lines[i]); i++) rows.push(cells(lines[i]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      );
    } else if (ITEM.test(line)) {
      const [html, next] = list(lines, i);
      out.push(html);
      i = next;
    } else {
      const para = [line.trim()];
      for (i++; i < lines.length && lines[i].trim() && !startsBlock(lines[i]); i++) para.push(lines[i].trim());
      out.push(`<p>${para.map(inline).join(breaks ? '<br>' : ' ')}</p>`);
    }
  }
  return out.join('');
}

/** Markdown in, HTML out. Null or empty gives the empty string. */
export function markdown(src) {
  return blocks(String(src ?? '').replace(/\r\n?/g, '\n').split('\n'));
}

/** One line's inline markup and no blocks, for an mcq choice, which sits inside a label. */
export function markdownInline(src) {
  return inline(String(src ?? ''));
}
