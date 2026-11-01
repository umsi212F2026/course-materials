import { test } from "node:test";
import assert from "node:assert/strict";
import { markdown, markdownInline } from "../lib/markdown.mjs";

test("a choice gets inline markup and no paragraph", () => {
  assert.equal(markdownInline("Push to `main` **first**"), "Push to <code>main</code> <strong>first</strong>");
});

test("paragraphs split at blank lines, and a wrapped line is a space", () => {
  assert.equal(markdown("One\ntwo.\n\nThree."), "<p>One two.</p><p>Three.</p>");
});

test("everything is escaped before any markup is added", () => {
  assert.equal(markdown('<script>alert("x")</script> & co'), "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>");
});

test("code spans, bold and italic", () => {
  assert.equal(
    markdown("Run `npm ci` **now**, *not* later, and _never_ `**raw**`."),
    "<p>Run <code>npm ci</code> <strong>now</strong>, <em>not</em> later, and <em>never</em> <code>**raw**</code>.</p>"
  );
});

test("a snake_case name and a lone asterisk are left alone", () => {
  assert.equal(markdown("Set DB_URL and my_var_name to 2 * 3."), "<p>Set DB_URL and my_var_name to 2 * 3.</p>");
});

test("a link becomes an anchor only for http and https", () => {
  assert.equal(
    markdown("See [the guide](https://example.com/a?b=1&c=2) or [this](javascript:alert(1))."),
    '<p>See <a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener">the guide</a> or [this](javascript:alert(1)).</p>'
  );
});

test("a fenced block is preformatted, verbatim, with no inline markup", () => {
  assert.equal(
    markdown("Log:\n\n```js\nconst a = **b**;\n\n  <div>\n```\n\nAfter."),
    "<p>Log:</p><pre><code>const a = **b**;\n\n  &lt;div&gt;</code></pre><p>After.</p>"
  );
});

test("an unclosed fence runs to the end", () => {
  assert.equal(markdown("```\nline"), "<pre><code>line</code></pre>");
});

test("bullets, with a wrapped bullet joined and a nested list", () => {
  assert.equal(
    markdown("- one\n  more\n- two\n  - inner\n- three"),
    "<ul><li>one more</li><li>two<ul><li>inner</li></ul></li><li>three</li></ul>"
  );
});

test("a numbered list", () => {
  assert.equal(markdown("1. first\n2. second"), "<ol><li>first</li><li>second</li></ol>");
});

test("a list straight after a paragraph line starts its own block", () => {
  assert.equal(markdown("It does:\n- this\n- that"), "<p>It does:</p><ul><li>this</li><li>that</li></ul>");
});

test("a table with a header row and inline markup in its cells", () => {
  assert.equal(
    markdown("| Action | Who |\n| --- | :-: |\n| `DELETE` | **Owner** |"),
    "<table><thead><tr><th>Action</th><th>Who</th></tr></thead><tbody><tr><td><code>DELETE</code></td><td><strong>Owner</strong></td></tr></tbody></table>"
  );
});

test("a blockquote holds its own blocks, and its lines keep their breaks", () => {
  assert.equal(
    markdown("> I ran it.\n> It failed:\n>\n> ```\n> exit 1\n> ```"),
    "<blockquote><p>I ran it.<br>It failed:</p><pre><code>exit 1</code></pre></blockquote>"
  );
});

test("a heading", () => {
  assert.equal(markdown("### Your agent's plan"), "<h4>Your agent&#39;s plan</h4>");
});

const HASH = "a".repeat(64);
const FIGURE = `<div class="figure"><img src="/api/images/${HASH}.png" alt="d"></div>`;

test("renders an image line as a figure", () => {
  assert.equal(
    markdown("![The Camunda Modeler diagram for x](/api/images/" + HASH + ".png)"),
    '<div class="figure"><img src="/api/images/' + HASH + '.png" alt="The Camunda Modeler diagram for x"></div>'
  );
});

test("an image between paragraphs is its own block", () => {
  assert.equal(
    markdown(`Before.\n\n![d](/api/images/${HASH}.png)\n\nAfter.`),
    `<p>Before.</p>${FIGURE}<p>After.</p>`
  );
});

test("an image straight after a paragraph line stops the paragraph", () => {
  assert.equal(markdown(`Before.\n![d](/api/images/${HASH}.png)`), `<p>Before.</p>${FIGURE}`);
});

test("refuses every other image form", () => {
  for (const url of [
    "https://example.com/a.png",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "bootstrap-top.png",
    "/api/images/ABC.png",
    "/api/images/" + "a".repeat(63) + ".png",
  ]) {
    const out = markdown(`![x](${url})`);
    assert.ok(!out.includes("<img"), url);
    assert.ok(!out.includes("<a "), url);
    assert.ok(out.includes("![x]("), url);
  }
});

test("escapes alt text", () => {
  const out = markdown(`![<b>"x"</b>](/api/images/${HASH}.png)`);
  assert.ok(out.includes('alt="&lt;b&gt;&quot;x&quot;&lt;/b&gt;"'), out);
  assert.ok(!out.includes("<b>"), out);
});

test("an image inside a sentence is text", () => {
  const out = markdown(`See ![d](/api/images/${HASH}.png) here.`);
  assert.ok(!out.includes("<img"), out);
  assert.ok(!out.includes("<a "), out);
  assert.ok(out.includes(`![d](/api/images/${HASH}.png)`), out);
});

test("a 65-digit hash stays text", () => {
  const out = markdown(`![d](/api/images/${HASH}a.png)`);
  assert.ok(!out.includes("<img"), out);
  assert.ok(out.includes("![d]("), out);
});

test("an indented image line is a figure", () => {
  assert.equal(markdown(`   ![d](/api/images/${HASH}.png)`), FIGURE);
});

test("an image line right under a list item ends the list and is a figure", () => {
  const out = markdown(`- one\n![d](/api/images/${HASH}.png)`);
  assert.equal(out, `<ul><li>one</li></ul>${FIGURE}`);
});

test("an image inside a table cell stays text", () => {
  const out = markdown(`| a |\n| - |\n| ![d](/api/images/${HASH}.png) |`);
  assert.ok(!out.includes("<img"), out);
  assert.ok(out.includes("![d](/api/images/"), out);
});

test("placeholder control characters in the input are not read back as placeholders", () => {
  assert.ok(!markdown("a \u00010\u0001 b").includes("undefined"));
  assert.ok(!markdown("a \u00000\u0000 b").includes("undefined"));
  assert.ok(!markdownInline("a \u00010\u0001 b").includes("undefined"));
});

test("nothing in, nothing out", () => {
  assert.equal(markdown(""), "");
  assert.equal(markdown(null), "");
});
