// Pre-render one real file per static path.
//
// Why this exists. GitHub Pages serves static files, so /packages had nothing
// behind it and returned 404. A 404.html copy of the app makes the link work for
// a person, because the router reads location.pathname, but the status stays 404
// and Google will not index a page that 404s. Listing sixteen paths in
// sitemap.xml that all 404 is worse than listing one that does not.
//
// So each path gets a real file at <path>/index.html, which GitHub Pages serves
// with a 200. And because the file is written here, the head can be corrected per
// path BEFORE any JavaScript runs, which is the only version a link crawler ever
// sees: WhatsApp, Slack, X and Google's first pass do not execute our router.
//
// The titles are not duplicated. They are read out of the META table in
// index.html, which stays the single definition, the same way postage is read out
// of the worker rather than copied into the site.

import fs from "node:fs";
import path from "node:path";

const SRC = "index.html";
const html = fs.readFileSync(SRC, "utf8");

// Pull the two tables out of the app and evaluate them, rather than keeping a
// second copy here that would drift.
function grab(name) {
  const i = html.indexOf("const " + name + " = {");
  if (i < 0) throw new Error("could not find " + name + " in " + SRC);
  const open = html.indexOf("{", i);
  let depth = 0, end = -1;
  for (let j = open; j < html.length; j++) {
    const c = html[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) throw new Error("unbalanced braces reading " + name);
  return new Function("return " + html.slice(open, end + 1))();
}

const PATHS = grab("PATHS");
const META = grab("META");

const SITE = "https://hammerandmold.com";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Only views with a fixed path and real copy. lot and seller are per-record, so
// they cannot be pre-rendered and keep the 404.html fallback; they are not in the
// sitemap for the same reason. account is excluded on purpose: it is private and
// has nothing for a crawler.
// home is skipped for writing because index.html IS the home page. Writing it
// would put the file back on top of its own source, and the first run of this
// script did exactly that: it replaced the head's description with the shorter
// one from META and quietly dropped "Shipping included, tracked, across the EU"
// from the source file. Generated output must never be able to touch its input.
// checkout joins them for a different reason: it exists only while a purchase
// is in progress, so a crawled copy would be an empty address form asking for
// money, indexed under the shop's own name.
const SKIP = new Set(["lot", "seller", "account", "artifact", "home", "checkout"]);

let written = 0;
const report = [];

for (const view of Object.keys(PATHS)) {
  if (SKIP.has(view)) continue;
  const p = PATHS[view];
  const m = META[view];
  if (!m || !m[0]) { report.push("  skipped " + view + " (no meta)"); continue; }
  const [title, desc] = m;
  const url = SITE + p;

  // Replace, never append: a second <title> or canonical is worse than a wrong
  // one, because which of them a crawler believes is not defined anywhere.
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(title) + "</title>")
    .replace(/(<meta name="description" content=")[^"]*(")/, "$1" + esc(desc) + "$2")
    .replace(/(<link rel="canonical" href=")[^"]*(")/, "$1" + esc(url) + "$2")
    .replace(/(<meta property="og:title" content=")[^"]*(")/, "$1" + esc(title) + "$2")
    .replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + esc(desc) + "$2")
    .replace(/(<meta property="og:url" content=")[^"]*(")/, "$1" + esc(url) + "$2")
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, "$1" + esc(title) + "$2")
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, "$1" + esc(desc) + "$2");

  // Every replacement has to have bitten. A silent no-op would ship a file that
  // claims to be the packages page while its head still says the home page.
  const must = [
    ["title", "<title>" + esc(title) + "</title>"],
    ["canonical", 'href="' + esc(url) + '"'],
    ["og:url", 'content="' + esc(url) + '"'],
  ];
  for (const [what, needle] of must) {
    if (!out.includes(needle)) throw new Error(view + ": " + what + " was not rewritten");
  }

  const dir = "." + p;
  const target = path.join(dir, "index.html");
  if (path.resolve(target) === path.resolve(SRC)) throw new Error("refusing to write over the source: " + view);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, out);
  written++;
  report.push("  " + p.padEnd(22) + title.slice(0, 52));
}

// The app itself is the fallback for anything per-record, /lot/<id> above all.
fs.copyFileSync(SRC, "404.html");

// The sitemap promises these paths exist. If it lists something this did not
// write, the promise is broken, so fail the build rather than deploy it.
if (fs.existsSync("sitemap.xml")) {
  const locs = [...fs.readFileSync("sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const missing = locs.filter((u) => {
    const rel = u.replace(SITE, "") || "/";
    // "/" is index.html itself, which is why it is not generated.
    return !fs.existsSync(path.join(rel === "/" ? "." : "." + rel, "index.html"));
  });
  if (missing.length) throw new Error("sitemap lists paths with no page: " + missing.join(", "));
  console.log("sitemap: " + locs.length + " urls, all present");
}

console.log("pre-rendered " + written + " pages, plus 404.html");
console.log(report.join("\n"));
