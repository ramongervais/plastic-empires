// The two nav menus, driven. Markup that is present is not the same as a menu
// that opens, and a category that cannot reach the shop is worse than no menu.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
let JSDOM = null;
try { ({ JSDOM } = await import("jsdom")); } catch {}
const built = fs.existsSync("nl/index.html");
const why = !JSDOM ? "jsdom not installed" : !built ? "run build-pages.mjs first" : false;

function boot(file, path) {
  const app = fs.readdirSync(".").find((f) => /^app\..*\.js$/.test(f));
  const page = fs.readFileSync(file, "utf8")
    .replace(/<script src="\/app\.[^"]*"><\/script>/, "<script>" + fs.readFileSync(app, "utf8") + "</script>")
    .replace('<script src="/shipping.js"></script>', "<script>" + fs.readFileSync("shipping.js", "utf8") + "</script>")
    .replace(/<script src="https:\/\/cdn\.jsdelivr[^>]*><\/script>/, "<script>window.supabase={createClient:function(){return null}}</script>");
  const dom = new JSDOM(page, { url: "https://hammerandmold.com" + path, runScripts: "dangerously", pretendToBeVisual: true,
    beforeParse(w) {
      // hover:hover true, so the hover path is the one under test
      w.matchMedia = (q) => ({ matches: /hover:\s*hover/.test(q), media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } });
      w.scrollTo = () => {};
      w.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.fetch = async () => ({ ok: false, status: 0, json: async () => ({}), text: async () => "" });
      w.HTMLElement.prototype.scrollIntoView = function(){};
    } });
  return dom.window;
}
const settle = () => new Promise((r) => setTimeout(r, 400));
const t = (name, fn) => test(name, { skip: why }, fn);

t("both menus open and close, and only one at a time", async () => {
  const w = boot("index.html", "/");
  await settle();
  const d = w.document;
  const [a, b] = [d.getElementById("ndMolders"), d.getElementById("ndShop")];
  assert.ok(a && b, "both menus exist");
  const btn = (x) => x.querySelector(".navtop");
  assert.equal(btn(a).getAttribute("aria-expanded"), "false");

  btn(a).dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert.ok(a.hasAttribute("data-open"), "clicking opens it");
  assert.equal(btn(a).getAttribute("aria-expanded"), "true");

  btn(b).dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert.ok(b.hasAttribute("data-open"), "the second opens");
  assert.ok(!a.hasAttribute("data-open"), "and the first closes");

  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.ok(!b.hasAttribute("data-open"), "escape closes");
  w.close();
});

t("the workshop pieces are in the menu, not only the footer", async () => {
  const w = boot("index.html", "/");
  await settle();
  const items = [...w.document.querySelectorAll("#ndMolders .dropmenu a")].map((a) => a.getAttribute("href"));
  assert.deepEqual(items, ["/#empires", "/retrobrighting/", "/moulds/"]);
  w.close();
});

t("a Shop category drives the same filter the chips do", async () => {
  const w = boot("index.html", "/");
  await settle();
  const d = w.document;
  const everything = d.querySelector('#ndShop [data-shopmk=""]');
  assert.ok(everything, "the menu offers everything for sale");
  const ev = new w.MouseEvent("click", { bubbles: true, cancelable: true });
  everything.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, true, "it filters in place rather than navigating");
  assert.ok(!d.getElementById("ndShop").hasAttribute("data-open"), "and closes the menu behind it");
  w.close();
});

t("the Dutch menu points at Dutch pages", async () => {
  const nl = fs.readFileSync("nl/index.html", "utf8");
  const nav = nl.slice(nl.indexOf('<nav class="top"'), nl.indexOf("</nav>", nl.indexOf('<nav class="top"')));
  // The language menu is in the same nav and is the exception by design: it is
  // the one place where English is English and German is German. Cut it out
  // before holding the rest to the rule.
  const lang = nav.indexOf('id="ndLang"');
  const content = lang < 0 ? nav : nav.slice(0, lang);
  const items = [...content.matchAll(/<a href="([^"]+)"[^>]*role="menuitem"/g)].map((m) => m[1]);
  assert.ok(items.length >= 6, "the content menus are there");
  assert.deepEqual(items.filter((h) => !h.startsWith("/nl/")), [], "and every one of their items stays in Dutch");
  assert.ok(lang > 0 && nav.slice(lang).includes('href="/de/"'), "while the language menu leads out");
});
