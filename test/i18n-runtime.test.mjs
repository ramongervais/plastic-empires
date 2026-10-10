// The runtime translator, driven through a real DOM.
//
// This repository has no dependencies on purpose, so jsdom is not installed
// and this file skips itself when it is absent:
//
//   npm i jsdom --no-save && node --test test/
//
// It is worth having installed at least once. The first run of it found an
// infinite loop: a dictionary entry whose Dutch equalled its English made the
// observer write the same value back, which fires characterData, which calls
// the observer, which writes it back. A frozen tab, on every Dutch page.
import test from "node:test";
import assert from "node:assert/strict";
import { injectRuntime, decodeEntities, runtimeDict, jsLiterals } from "../i18n-runtime.mjs";

let JSDOM = null;
try { ({ JSDOM } = await import("jsdom")); } catch { /* not installed */ }

const DICT = {
  "Place a bid": "Breng een bod uit",
  "Watch this lot": "Volg dit kavel",
  "Could not list": "Plaatsen is niet gelukt",
  "Loading…": "Laden…",
  "Reading the photos": "De foto's lezen",
  "Netherlands and the EU": "Nederland en de EU",
};

function page() {
  const html = injectRuntime(
    '<!doctype html><html lang="nl"><head><title>Kavel</title></head><body>' +
    '<div id="app"></div><script id="code"></script></body></html>', DICT);
  const dom = new JSDOM(html, { runScripts: "dangerously" });
  return dom.window.document;
}
const settle = () => new Promise((r) => setTimeout(r, 0));
const dom = (name, fn) => test(name, { skip: JSDOM ? false : "jsdom not installed" }, fn);

dom("translates a node the application renders with innerHTML", async () => {
  const d = page(), app = d.getElementById("app");
  app.innerHTML = '<button class="btn">Place a bid</button>';
  await settle();
  assert.equal(app.querySelector("button").textContent, "Breng een bod uit");
});

dom("translates a later textContent assignment", async () => {
  const d = page(), p = d.createElement("p");
  d.getElementById("app").appendChild(p);
  await settle();
  p.textContent = "Reading the photos";
  await settle();
  assert.equal(p.textContent, "De foto's lezen");
});

dom("translates the attributes that carry prose", async () => {
  const d = page(), app = d.getElementById("app");
  app.innerHTML = '<button aria-label="Watch this lot" title="Watch this lot">x</button>';
  await settle();
  const b = app.querySelector("button");
  assert.equal(b.getAttribute("aria-label"), "Volg dit kavel");
  assert.equal(b.getAttribute("title"), "Volg dit kavel");
});

dom("never touches a value attribute, where the sort keys live", async () => {
  const d = page(), app = d.getElementById("app");
  app.innerHTML = '<option value="Loading…">Loading…</option>';
  await settle();
  assert.equal(app.querySelector("option").getAttribute("value"), "Loading…");
  assert.equal(app.querySelector("option").textContent, "Laden…");
});

dom("keeps the whitespace around a match", async () => {
  const d = page(), app = d.getElementById("app");
  app.innerHTML = "<div>\n   Could not list\n  </div>";
  await settle();
  assert.equal(app.querySelector("div").textContent, "\n   Plaatsen is niet gelukt\n  ");
});

dom("does not match a substring", async () => {
  const d = page(), app = d.getElementById("app");
  app.innerHTML = "<div>Place a bid of €45</div>";
  await settle();
  assert.equal(app.querySelector("div").textContent, "Place a bid of €45");
});

dom("leaves script contents alone", async () => {
  const d = page(), s = d.getElementById("code");
  s.textContent = 'var s = "Place a bid";';
  await settle();
  assert.equal(s.textContent, 'var s = "Place a bid";');
});

dom("reaches a nested insert", async () => {
  const d = page(), app = d.getElementById("app");
  app.innerHTML = "<ul><li><em>Loading…</em></li></ul>";
  await settle();
  assert.equal(app.querySelector("em").textContent, "Laden…");
});

dom("translates the title the router sets", async () => {
  const d = page();
  d.title = "Netherlands and the EU";
  await settle();
  assert.equal(d.title, "Nederland en de EU");
});

dom("falls through to English for anything it has no entry for", async () => {
  const d = page(), app = d.getElementById("app");
  app.innerHTML = "<div>Some string nobody translated</div>";
  await settle();
  assert.equal(app.querySelector("div").textContent, "Some string nobody translated");
});

// These need no DOM.
test("refuses a dictionary entry that translates to itself", () => {
  assert.throws(() => injectRuntime("<body></body>", { Mint: "Mint" }), /translates to itself/);
});

test("decodes the entities the dictionary is keyed on", () => {
  assert.equal(decodeEntities("Hammer &amp; Mold &middot; &euro;30"), "Hammer & Mold · €30");
});

test("ships only what the application can produce, and drops identities", () => {
  const html = '<script>var a = "Place a bid", b = "Mint", c = "Never in the markup";</script>';
  const d = runtimeDict({ "Place a bid": "Breng een bod uit", Mint: "Mint", Unused: "Ongebruikt" }, {}, jsLiterals(html));
  assert.deepEqual(d, { "Place a bid": "Breng een bod uit" });
});
