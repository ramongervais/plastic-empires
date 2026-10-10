// Runtime half of the translation system.
//
// The build-time translator in i18n.mjs only reaches text that exists in
// index.html. A third of this site is drawn by JavaScript after the page
// loads: the lot page, bidding, the sell flow, checkout, the account. None of
// that is in the file, so the dictionary never saw it.
//
// Rather than wrap six hundred string literals in a t() call across 329KB of
// application JavaScript, the Dutch pages carry a small observer that applies
// the same rule the build applies: replace a whole text node, never a
// substring. Same matching, same dictionary shape, two moments in time.
//
// What it does not do: a sentence the application assembles out of fragments
// and data ("Current bid " + x + " · " + n + " bids") never exists as one text
// node, so there is nothing to look up. Those have to be rewritten at the call
// site to emit a whole sentence. They are listed in i18n/js-fragments.txt.

import vm from "node:vm";

const ENT = [
  [/&amp;/g, "&"], [/&middot;/g, "·"], [/&euro;/g, "€"],
  [/&rsquo;/g, "’"], [/&lsquo;/g, "‘"], [/&ldquo;/g, "“"],
  [/&rdquo;/g, "”"], [/&larr;/g, "←"], [/&rarr;/g, "→"],
  [/&nbsp;/g, " "], [/&quot;/g, '"'], [/&lt;/g, "<"], [/&gt;/g, ">"],
  [/&#8594;/g, "→"], [/&#8209;/g, "‑"], [/&#39;/g, "'"],
];

// The dictionary is keyed on source HTML, entities and all. The observer sees
// rendered text, where those entities are already characters. Decode both
// sides or nothing matches.
export function decodeEntities(s) {
  let out = s;
  for (const [re, ch] of ENT) out = out.replace(re, ch);
  return out.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}

// Every string literal in the page's own inline scripts. Used to decide which
// dictionary entries are worth shipping to the browser: the runtime only needs
// what the application can actually produce.
export function jsLiterals(html) {
  let js = "";
  for (const m of html.matchAll(/<script(?![^>]*src=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) js += m[1] + "\n";
  const out = new Set();
  for (const m of js.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    if (!raw) continue;
    const s = raw
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\(['"`\\])/g, "$1");
    out.add(s);
    out.add(decodeEntities(s));
  }
  return out;
}

// The dictionary the browser gets: everything the application can emit, in the
// form it will be seen in. Entries that translate to themselves are dropped,
// since the observer skips them anyway.
export function runtimeDict(dict, jsDict, literals) {
  const out = {};
  const add = (k, v) => {
    const dk = decodeEntities(k).replace(/\s+/g, " ").trim();
    const dv = decodeEntities(v);
    if (!dk || dk === dv) return;
    out[dk] = dv;
  };
  for (const [k, v] of Object.entries(dict)) {
    if (k.startsWith("_")) continue;
    if (literals.has(k) || literals.has(decodeEntities(k))) add(k, v);
  }
  for (const [k, v] of Object.entries(jsDict)) {
    if (k.startsWith("_")) continue;
    add(k, v);
  }
  return out;
}

// Every string handed to phrase() in the application. A phrase() key with no
// dictionary entry falls back to English without complaining, which is the
// right behaviour at runtime and the wrong thing to find out about in six
// months, so the build lists them.
export function phraseKeys(html) {
  let js = "";
  for (const m of html.matchAll(/<script(?![^>]*src=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) js += m[1] + "\n";
  const unq = (raw) => raw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\(['"`\\])/g, "$1");
  const out = new Set();
  // phrase('x', …) and the singular/plural form phrase(cond ? 'one' : 'many', …)
  for (const m of js.matchAll(/phrase\(\s*'((?:[^'\\]|\\.)*)'/g)) out.add(unq(m[1]));
  for (const m of js.matchAll(/phrase\(\s*[^'"`,)]+\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
    out.add(unq(m[1])); out.add(unq(m[2]));
  }
  return out;
}

const OBSERVER = `(function(){
var D=window.__NL__||{},SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,PRE:1,CODE:1},
A=['placeholder','title','aria-label','alt'];
function k(s){return s.replace(/\\s+/g,' ').trim()}
function tx(n){var v=n.nodeValue;if(!v)return;var q=k(v);if(!q)return;var h=D[q];
if(h===undefined)return;var w=v.match(/^\\s*/)[0]+h+v.match(/\\s*\$/)[0];
if(w===v)return;n.nodeValue=w}
function at(e){if(!e.getAttribute)return;for(var i=0;i<A.length;i++){var a=A[i],
v=e.getAttribute(a);if(v==null)continue;var h=D[k(v)];if(h!==undefined&&h!==v)e.setAttribute(a,h)}}
function walk(n){if(n.nodeType===3){tx(n);return}if(n.nodeType!==1||SKIP[n.tagName])return;
at(n);for(var c=n.firstChild;c;c=c.nextSibling)walk(c)}
try{new MutationObserver(function(m){for(var i=0;i<m.length;i++){var r=m[i];
if(r.type==='characterData'){tx(r.target)}else{for(var j=0;j<r.addedNodes.length;j++)walk(r.addedNodes[j])}}})
.observe(document,{childList:true,subtree:true,characterData:true})}catch(e){}
function once(){walk(document.body||document.documentElement);var t=document.querySelector('title');if(t)tx(t.firstChild||t)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',once);else once();
})();`;

// Two insertions, because they are needed at two different moments.
//
// The dictionary goes in the head: the page has several script blocks and the
// first one runs long before </body>, so a phrase() call in it would format
// the English and move on. Putting the dictionary last meant the top of the
// page was quietly never translated.
//
// The observer goes before </body>. In the head it would see the whole body
// being parsed as mutations, which on an 800KB page is a great deal of work
// to discover that the markup is already Dutch. At the end it installs once
// and walks the finished document a single time.
export function injectRuntime(html, dict) {
  // An entry that translates to itself used to hang the page: writing the same
  // value back fires characterData, which calls the handler, which writes it
  // back again. The observer now refuses to write an unchanged value, and the
  // dictionary is not allowed to carry one either. Two locks on one door,
  // because the failure mode is a frozen tab rather than a wrong word.
  for (const [k, v] of Object.entries(dict)) {
    if (k === v) throw new Error("runtime dictionary: " + JSON.stringify(k) + " translates to itself");
  }
  const json = JSON.stringify(dict).replace(/</g, "\\u003c");
  const head = "<script>window.__NL__=" + json + "</script>";
  const body = "<script>" + OBSERVER + "</script>";
  if (!html.includes("</head>")) throw new Error("no </head> to inject the dictionary into");
  if (!html.includes("</body>")) throw new Error("no </body> to inject the runtime translator before");
  new vm.Script("window.__NL__=" + json);
  new vm.Script(OBSERVER);  // a syntax error here would be silent in the browser
  return html.replace("</head>", head + "</head>").replace("</body>", body + "</body>");
}
