// The router, driven through a real DOM against the files the build writes.
//
// This is the test that would have caught the /nl/ bug: every Dutch page but
// the home page replaced itself with the home view the moment JavaScript
// booted, because /nl/terms matched nothing in the path table. The markup was
// right, which is why it survived being checked by hand and by curl.
//
// Needs jsdom and a build:  npm i jsdom --no-save && node build-pages.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

let JSDOM = null;
try { ({ JSDOM } = await import("jsdom")); } catch { /* not installed */ }
const built = fs.existsSync("nl/terms/index.html");
const why = !JSDOM ? "jsdom not installed" : !built ? "run build-pages.mjs first" : false;

// jsdom fetches neither <script src>, so inline the one that is ours and stub
// the one that is not, and stand in for the browser APIs it does not
// implement. Without this the main block dies on its first line.
function boot(file, path) {
  const page = fs.readFileSync(file, "utf8")
    .replace('<script src="/shipping.js"></script>', "<script>" + fs.readFileSync("shipping.js", "utf8") + "</script>")
    .replace(/<script src="https:\/\/cdn\.jsdelivr[^>]*><\/script>/, "<script>window.supabase={createClient:function(){return null}}</script>");
  const dom = new JSDOM(page, {
    url: "https://hammerandmold.com" + path,
    runScripts: "dangerously", pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, media: "", onchange: null,
        addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } });
      w.scrollTo = () => {};
      w.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.fetch = async () => ({ ok: false, status: 0, json: async () => ({}), text: async () => "" });
    },
  });
  return dom.window;
}
const settle = () => new Promise((r) => setTimeout(r, 500));
const shown = (d) => [...d.querySelectorAll("[id^=view-]")].filter((s) => !s.hidden).map((s) => s.id)[0];
const t = (name, fn) => test(name, { skip: why }, fn);

t("a Dutch page stays on its own view instead of falling back to home", async () => {
  for (const [file, path, view] of [
    ["nl/terms/index.html", "/nl/terms/", "view-terms"],
    ["nl/help/index.html", "/nl/help/", "view-help"],
    ["nl/molders/kenner/index.html", "/nl/molders/kenner/", "view-empire"],
    ["nl/retrobrighting/index.html", "/nl/retrobrighting/", "view-retrobright"],
    ["nl/index.html", "/nl/", "view-home"],
  ]) {
    const w = boot(file, path);
    await settle();
    assert.equal(shown(w.document), view, path);
    w.close();
  }
});

t("and keeps its own title", async () => {
  const w = boot("nl/terms/index.html", "/nl/terms/");
  await settle();
  assert.equal(w.document.title, "Voorwaarden · Hammer & Mold");
  w.close();
});

t("the English pages are unaffected", async () => {
  const w = boot("terms/index.html", "/terms/");
  await settle();
  assert.equal(shown(w.document), "view-terms");
  assert.equal(w.document.title, "Terms · Hammer & Mold");
  w.close();
});

t("navigating inside the Dutch site stays Dutch", async () => {
  const w = boot("nl/index.html", "/nl/");
  await settle();
  const d = w.document;
  // The href is the Dutch one now, which is the point of the rewrite: a
  // crawler follows it into Dutch instead of out of it.
  const link = d.querySelector('a[href="/nl/packages/"]');
  assert.ok(link, "the Dutch home page should link to /nl/packages/");
  link.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(shown(d), "view-plans");
  assert.equal(w.location.pathname, "/nl/packages/");
  w.close();
});

t("the language button is a real navigation, not a routed one", async () => {
  const w = boot("nl/about/index.html", "/nl/about/");
  await settle();
  const b = w.document.getElementById("langBtn");
  assert.equal(b.getAttribute("href"), "/about/");
  assert.ok(b.querySelector("svg.lang-flag"), "the switch carries a flag");
  assert.equal(b.textContent.trim(), "EN", "and the two letters, which are the part that is true");
  // Clicked on the flag rather than the anchor, because that is where a thumb
  // lands and e.target is then the <svg> inside it.
  const ev = new w.MouseEvent("click", { bubbles: true, cancelable: true });
  b.querySelector("svg.lang-flag").dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, false, "the router must not swallow the language switch");
  w.close();
});

t("a lot has a Dutch file of its own and routes to the lot view", async () => {
  // Without a file here GitHub Pages answers 404.html, and a Dutch buyer who
  // reloaded a lot or sent the link on got the English front page with a 404
  // attached. The id changes every build, so take whichever one is there.
  const id = fs.readdirSync("nl/lot")[0];
  assert.ok(id, "the build wrote no Dutch lot pages");
  const w = boot("nl/lot/" + id + "/index.html", "/nl/lot/" + id + "/");
  await settle();
  assert.equal(shown(w.document), "view-lot");
  assert.equal(w.document.documentElement.lang, "nl");
  assert.equal(w.document.querySelector("link[rel=canonical]").href,
    "https://hammerandmold.com/nl/lot/" + id + "/");
  // and its alternates name the lot, not the front page it inherited them from
  const alts = [...w.document.querySelectorAll("link[rel=alternate]")]
    .map((a) => a.hreflang + " " + a.href.replace("https://hammerandmold.com", ""));
  assert.deepEqual(alts, ["en /lot/" + id + "/", "nl /nl/lot/" + id + "/", "x-default /lot/" + id + "/"]);
  w.close();
});

t("a seller who has listed something has a real page in both languages", async () => {
  // It answered 404.html before: it drew correctly for a person and was a 404
  // to everything else, on the one page a seller would send to a buyer.
  const id = fs.readdirSync("seller")[0];
  assert.ok(id, "the build wrote no seller pages");
  for (const [dir, path, lang, title] of [
    ["seller/" + id, "/seller/" + id + "/", "en", "Ramon Gervais · Seller · Hammer & Mold"],
    ["nl/seller/" + id, "/nl/seller/" + id + "/", "nl", "Ramon Gervais · Verkoper · Hammer & Mold"],
  ]) {
    const w = boot(dir + "/index.html", path);
    await settle();
    assert.equal(shown(w.document), "view-seller", path);
    assert.equal(w.document.documentElement.lang, lang);
    assert.equal(w.document.title, title);
    assert.equal(w.document.querySelector("link[rel=canonical]").href, "https://hammerandmold.com" + path);
    assert.equal(JSON.parse(w.document.getElementById("sellerLd").textContent)["@type"], "ProfilePage");
    w.close();
  }
});

t("a Dutch page links to Dutch pages, not to their English twins", () => {
  // A reader never noticed this, because the router rewrites the path on
  // click. A crawler does not click: it follows the href, lands in English,
  // and the Dutch tree has one way in and no way through it.
  const nl = fs.readFileSync("nl/index.html", "utf8");
  const home = nl.slice(nl.indexOf('id="view-home"'), nl.indexOf("</main>", nl.indexOf('id="view-home"')));
  const english = [...home.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith("/nl/"));
  assert.deepEqual(english, [], "every internal link on the Dutch home page should stay in Dutch");
  assert.ok(home.includes('href="/nl/molders/sofubi/"'), "and the molder cards are real links");

  // Except the one link that is supposed to leave.
  const lang = nl.match(/<a class="lang-btn"[^>]*href="([^"]*)"/)[1];
  assert.equal(lang, "/");

  // The English side is untouched apart from its own switch.
  const en = fs.readFileSync("index.html", "utf8");
  assert.equal([...en.matchAll(/href="(\/nl\/[^"]*)"/g)].length, 1);
});

t("the English fallback still finds the view behind a /nl path", async () => {
  // /seller, /checkout and /account have no file, so GitHub Pages answers
  // 404.html, which is a copy of the English page. It has to understand a
  // Dutch URL anyway or it shows the home page to someone who asked for their
  // account.
  for (const [path, view] of [["/nl/account/", "view-account"], ["/nl/seller/cornerstone/", "view-seller"]]) {
    const w = boot("404.html", path);
    await settle();
    assert.equal(shown(w.document), view, path);
    w.close();
  }
});

t("the Dutch pages boot without a JavaScript error", async () => {
  const errs = [];
  const { VirtualConsole } = await import("jsdom");
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errs.push(e.message || String(e)));
  const page = fs.readFileSync("nl/index.html", "utf8")
    .replace('<script src="/shipping.js"></script>', "<script>" + fs.readFileSync("shipping.js", "utf8") + "</script>")
    .replace(/<script src="https:\/\/cdn\.jsdelivr[^>]*><\/script>/, "<script>window.supabase={createClient:function(){return null}}</script>");
  const dom = new JSDOM(page, { url: "https://hammerandmold.com/nl/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } });
      w.scrollTo = () => {};
      w.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.fetch = async () => ({ ok: false, status: 0, json: async () => ({}), text: async () => "" });
    } });
  await settle();
  dom.window.close();
  assert.deepEqual(errs, []);
});
