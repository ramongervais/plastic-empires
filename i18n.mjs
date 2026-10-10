// Translation by exact text node, driven by a dictionary.
//
// The site is one 780KB HTML file with every sentence written inline. Marking
// 23,000 words with data-t keys would mean touching every line of markup and
// keeping two things in step forever, so nothing is marked at all: the English
// source stays the single source of truth, and a build walks the document and
// swaps whole text nodes for their Dutch equivalent where one exists.
//
// Three properties fall out of that, and they are the reason for the approach:
//
//   A string with no translation falls through to English. A half-finished
//   dictionary produces a working bilingual page rather than a broken one, so
//   this can ship today and fill up over weeks.
//
//   The dictionary is keyed on the English sentence itself. Change a sentence
//   in index.html and its entry stops matching, which surfaces in the coverage
//   report as a new untranslated string rather than silently serving the old
//   Dutch for copy that no longer says that.
//
//   Whole text nodes only, never substrings. "Sell" appears inside dozens of
//   longer sentences, and a substring pass would rewrite the middle of them.
//
// Script and style content is skipped entirely. The 988 sentences living in JS
// string literals are a second pass with different rules; doing them here would
// mean rewriting code with a text tool.

const SKIP_TAGS = new Set(["script", "style", "textarea", "pre", "code"]);

// Attributes a person reads. title and alt reach the screen, placeholder and
// aria-label reach a screen reader, and the meta ones reach Google and Slack.
const ATTRS = ["alt", "title", "placeholder", "aria-label", "aria-description", "content", "value"];

// Only these meta names and properties carry prose. Leaving it open would
// translate charset, viewport and every URL in the head.
const META_OK = /^(description|og:title|og:description|og:image:alt|twitter:title|twitter:description|apple-mobile-web-app-title|og:site_name)$/;

// A handful of places where the Dutch needs different markup and not just
// different words, which a text-node dictionary cannot express. The home h1
// is the case that forced it: the English carries a <br> mid-sentence to break
// "Know the toy." from "Then own it", and the longer Dutch line then wraps on
// its own and lands in four. Kept deliberately small and exact: whole
// fragments, matched once, so this stays a list of decisions rather than a
// second find-and-replace pass over the document.
export function applyHtmlRules(html, rules) {
  let out = html;
  for (const [from, to] of Object.entries(rules || {})) {
    if (from.startsWith("_")) continue;
    if (!out.includes(from)) continue;
    out = out.split(from).join(to);
  }
  return out;
}

export function loadDict(fs, file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { return {}; }
}

// Normalised for lookup, not for output. Markup wraps lines wherever it likes,
// so the same sentence can carry newlines and runs of spaces that mean nothing;
// the dictionary would otherwise need an entry per accident of indentation.
const key = (s) => s.replace(/\s+/g, " ").trim();

export function translate(html, dict, stats) {
  stats = stats || { hit: 0, miss: 0, missed: new Set() };
  let out = "";
  let i = 0;

  const lookup = (raw) => {
    const k = key(raw);
    // Nothing to translate in a number, a single symbol or an empty run.
    if (!k || k.length < 2 || !/[A-Za-z]{2}/.test(k)) return null;
    if (stats.seen) stats.seen.add(k);
    if (Object.prototype.hasOwnProperty.call(dict, k)) { stats.hit++; return dict[k]; }
    stats.miss++; stats.missed.add(k);
    return null;
  };

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt < 0) { out += translateTextRun(html.slice(i), lookup); break; }

    // The run of text before this tag.
    if (lt > i) out += translateTextRun(html.slice(i, lt), lookup);

    // Comments and doctype pass through untouched.
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt);
      const stop = end < 0 ? html.length : end + 3;
      out += html.slice(lt, stop); i = stop; continue;
    }
    if (html.startsWith("<!", lt)) {
      const end = html.indexOf(">", lt);
      const stop = end < 0 ? html.length : end + 1;
      out += html.slice(lt, stop); i = stop; continue;
    }

    // The tag itself.
    const gt = findTagEnd(html, lt);
    if (gt < 0) { out += html.slice(lt); break; }
    const tag = html.slice(lt, gt + 1);
    const name = (tag.match(/^<\/?\s*([a-zA-Z0-9-]+)/) || [])[1];
    out += translateAttrs(tag, lookup);
    i = gt + 1;

    // Everything inside a skipped element is copied verbatim, including any
    // markup it contains, because its contents are code and not prose.
    if (name && SKIP_TAGS.has(name.toLowerCase()) && !tag.startsWith("</") && !tag.endsWith("/>")) {
      const close = html.toLowerCase().indexOf("</" + name.toLowerCase(), i);
      if (close < 0) { out += html.slice(i); break; }
      out += html.slice(i, close);
      i = close;
    }
  }
  return { html: out, stats };
}

// A tag can hold a > inside a quoted attribute value, so the end is found by
// stepping over quoted runs rather than by the first > after the <.
function findTagEnd(s, start) {
  let q = null;
  for (let j = start + 1; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === ">") return j;
  }
  return -1;
}

// A text run can carry entities and several sentences separated by <br>, which
// the walker has already split out. Leading and trailing whitespace is kept so
// the markup keeps its shape and words do not weld to their neighbours.
function translateTextRun(run, lookup) {
  if (!/\S/.test(run)) return run;
  const lead = run.match(/^\s*/)[0];
  const tail = run.match(/\s*$/)[0];
  const core = run.slice(lead.length, run.length - tail.length);
  const hit = lookup(core);
  return hit == null ? run : lead + hit + tail;
}

function translateAttrs(tag, lookup) {
  if (tag.startsWith("</")) return tag;
  const isMeta = /^<meta\b/i.test(tag);
  let metaOk = true;
  if (isMeta) {
    const n = (tag.match(/\b(?:name|property)\s*=\s*"([^"]*)"/i) || [])[1] || "";
    metaOk = META_OK.test(n);
  }
  return tag.replace(/\b([a-zA-Z-]+)\s*=\s*"([^"]*)"/g, (m, attr, val) => {
    const a = attr.toLowerCase();
    if (!ATTRS.includes(a)) return m;
    if (a === "content" && !(isMeta && metaOk)) return m;
    // value is prose on a button and data everywhere else.
    if (a === "value" && !/<(button|option)\b/i.test(tag)) return m;
    const hit = lookup(val);
    return hit == null ? m : attr + '="' + hit.replace(/"/g, "&quot;") + '"';
  });
}

// Everything a dictionary would need an entry for, in document order, so a
// translator gets a worklist rather than having to read the source.
export function extractStrings(html) {
  const found = [];
  const seen = new Set();
  translate(html, {}, {
    hit: 0, miss: 0,
    missed: { add: (k) => { if (!seen.has(k)) { seen.add(k); found.push(k); } } },
  });
  return found;
}
