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
import { execSync } from "node:child_process";
import { translate, extractStrings, loadDict, applyHtmlRules } from "./i18n.mjs";

const SRC = "index.html";

// ---------------------------------------------------------------------------
// Dutch.
//
// Every page this build writes gets a sibling under /nl/, translated by exact
// text node against i18n/nl.json. A string with no entry falls through to
// English, so a dictionary that is one page full produces a working site
// rather than a broken one, and the untranslated remainder is written to
// i18n/untranslated.txt as the worklist for the next pass.
//
// Under /nl/ on the same domain rather than on hammerandmold.nl, because
// GitHub Pages serves one custom domain per repository: the CNAME holds
// hammerandmold.com and two apex domains on one Pages site is not a thing
// their platform does. The .nl can redirect here.
const NL_DICT = loadDict(fs, "i18n/nl.json");
const NL_HTML = loadDict(fs, "i18n/nl-html.json");
const NL_PREFIX = "/nl";

// One switch. Flip to true when the dictionary is full enough to show a Dutch
// reader a Dutch page, and the Dutch pages become indexable and enter the
// sitemap in the same move.
//
// Until then they carry noindex and stay out of the sitemap, for a reason
// specific to this site rather than a general caution: of 63 urls submitted,
// Google has indexed 22 and has not discovered 25. Handing it nineteen more
// pages that are ninety-five per cent English under a Dutch lang attribute
// spends crawl budget that the English pages are currently short of, and
// invites exactly the thin-and-duplicate verdict this site can least afford.
// The pages are live and reachable at /nl/ either way.
const NL_PUBLIC = true;
// seen is every key the build actually looked up, across all generated pages.
// A dictionary entry that was never looked up is dead, and that is a more
// honest test than searching index.html: the per-page titles and descriptions
// are injected by this build and never appear in the source file.
const i18nStats = { hit: 0, miss: 0, missed: new Set(), seen: new Set() };
const nlLocs = [];
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
// The documentary pages, and the company each one is about. "about" is the field
// that tells a machine these are pages concerning a real manufacturer rather than
// pages that merely mention one.
const MOLDER = new Set(["empire", "tmnt", "ljn", "galoob", "thinkway", "kaiju", "imperial", "palitoy", "dormei"]);
// Not a molder, but the same kind of page: researched, argued, signed. It gets
// the same Article node, with a subject that is a process rather than a company.
const ARTICLE_SUBJECT = { retrobright: "Retrobrighting" };
const MOLDER_NAME = {
  empire: "Kenner Products",
  tmnt: "Playmates Toys",
  ljn: "LJN",
  galoob: "Galoob",
  thinkway: "Thinkway Toys",
  kaiju: "Marusan Shoten, Bullmark and Popy",
  imperial: "Imperial Toy Corporation",
  palitoy: "Palitoy",
  dormei: "Dor Mei",
};

// "home" is not in here any more. / is served by index.html itself, so there
// is no English file to generate, but /nl/ is a real file and has to be
// written or the Dutch home page does not exist. The loop skips its English
// write, in NO_EN_FILE below, and goes on to the Dutch one.
const SKIP = new Set(["lot", "seller", "account", "checkout"]);
const NO_EN_FILE = new Set(["home"]);

let written = 0;
const report = [];

for (const view of Object.keys(PATHS)) {
  if (SKIP.has(view)) continue;
  const p = PATHS[view];
  const m = META[view];
  if (!m || !m[0]) { report.push("  skipped " + view + " (no meta)"); continue; }
  const [title, desc] = m;
  // Trailing slash, because that is the form GitHub Pages answers with a 200.
  // Naming the other one in the canonical points every crawler at a redirect.
  const url = SITE + (p === "/" ? p : p.replace(/\/+$/, "") + "/");

  // Replace, never append: a second <title> or canonical is worse than a wrong
  // one, because which of them a crawler believes is not defined anywhere.
  // index.html is the home page AND the template for every other page, so any
  // alternates written into its head for / would ride along into all eighteen.
  // Stripped here, added per page below.
  let out = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, "")
    .replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(title) + "</title>")
    .replace(/(<meta name="description" content=")[^"]*(")/, "$1" + esc(desc) + "$2")
    .replace(/(<link rel="canonical" href=")[^"]*(")/, "$1" + esc(url) + "$2")
    .replace(/(<meta property="og:title" content=")[^"]*(")/, "$1" + esc(title) + "$2")
    .replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + esc(desc) + "$2")
    .replace(/(<meta property="og:url" content=")[^"]*(")/, "$1" + esc(url) + "$2")
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, "$1" + esc(title) + "$2")
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, "$1" + esc(desc) + "$2");

  // Structured data for the documentary pages, per path.
  //
  // These nine are articles: researched, argued, and written from toys somebody
  // actually held. Until now they carried only the site-wide Organization node,
  // so a crawler saw nine anonymous pages with no author and no subject. That is
  // the exact shape Google's guidance tells you not to be, and the one this site
  // had least excuse for, because the first-hand part is true.
  //
  // Injected here rather than written into index.html because the author, the
  // headline and the subject differ per page, and the source file has one head.
  if (view.startsWith("molders") || MOLDER.has(view) || ARTICLE_SUBJECT[view]) {
    const node = {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": url + "#article",
      headline: title.split(" \u00b7 ")[0],
      description: desc,
      url,
      isPartOf: { "@id": SITE + "/#website" },
      publisher: { "@id": SITE + "/#org" },
      author: {
        "@type": "Person",
        name: "Ramon Gervais",
        url: SITE + "/about",
        affiliation: { "@id": SITE + "/#org" },
      },
      about: ARTICLE_SUBJECT[view]
        ? { "@type": "Thing", name: ARTICLE_SUBJECT[view] }
        : { "@type": "Organization", name: MOLDER_NAME[view] || title.split(" \u00b7 ")[0] },
      inLanguage: "en",
    };
    out = out.replace(
      "</head>",
      '<script type="application/ld+json">' + JSON.stringify(node) + "</script></head>"
    );
    if (!out.includes('"@type":"Article"')) throw new Error(view + ": Article schema was not injected");
  }

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
  const writeEn = !NO_EN_FILE.has(view);
  if (writeEn && path.resolve(target) === path.resolve(SRC)) throw new Error("refusing to write over the source: " + view);
  if (writeEn) fs.mkdirSync(dir, { recursive: true });

  // Both languages carry both alternates and an x-default. Without them Google
  // reads /sell/ and /nl/sell/ as the same page twice and picks one, which is
  // the normal way a translated site loses to its own copy.
  // Same normalisation as the English url twenty lines up, or the two differ by
  // a trailing slash and the canonical points at an address that redirects.
  const nlPath = NL_PREFIX + (p === "/" ? "/" : p.replace(/\/+$/, "") + "/");
  const nlUrl = SITE + nlPath;
  const alts =
    '<link rel="alternate" hreflang="en" href="' + esc(url) + '">' +
    '<link rel="alternate" hreflang="nl" href="' + esc(nlUrl) + '">' +
    '<link rel="alternate" hreflang="x-default" href="' + esc(url) + '">';

  // The switch points at this page's own twin. Hard-coded in index.html it
  // said /nl/, which would drop a reader of the Kenner essay on the Dutch home
  // page and make them find their place again.
  const enSwitch = '<a class="lang-btn" id="langBtn" href="' + esc(nlPath) + '" hreflang="nl" aria-label="Doorgaan in het Nederlands">NL</a>';
  out = out.replace(/<a class="lang-btn"[^>]*>[^<]*<\/a>/, enSwitch);

  if (writeEn) {
    fs.writeFileSync(target, out.replace("</head>", alts + "</head>"));
    written++;
    report.push("  " + p.padEnd(22) + title.slice(0, 52));
  }

  // ---- The Dutch sibling ----
  // Translated from the finished English page, so every rewrite above has
  // already happened and there is one place that decides what a page says.
  let nl = applyHtmlRules(translate(out, NL_DICT, i18nStats).html, NL_HTML);
  nl = nl
    .replace(/<html lang="en">/, '<html lang="nl">')
    .replace(/(<link rel="canonical" href=")[^"]*(")/, "$1" + esc(nlUrl) + "$2")
    .replace(/(<meta property="og:url" content=")[^"]*(")/, "$1" + esc(nlUrl) + "$2")
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, "$1nl_NL$2")
    .replace(/"inLanguage":"en"/g, '"inLanguage":"nl"')
    .replace(
      /<a class="lang-btn"[^>]*>[^<]*<\/a>/,
      '<a class="lang-btn" id="langBtn" href="' + esc(p === "/" ? "/" : p.replace(/\/+$/, "") + "/") + '" hreflang="en" aria-label="Continue in English">EN</a>'
    )
    .replace("</head>", alts + "</head>");
  if (!nl.includes('<html lang="nl">')) throw new Error(view + ": nl lang attribute was not set");
  if (!nl.includes('hreflang="en" aria-label="Continue in English"')) throw new Error(view + ": nl language switch was not rewritten");
  if (!NL_PUBLIC) {
    nl = nl.replace(/(<meta name="robots" content=")[^"]*(")/, "$1noindex, follow$2");
    if (!nl.includes('content="noindex, follow"')) throw new Error(view + ": nl noindex was not set");
  }
  if (!nl.includes('href="' + esc(nlUrl) + '"')) throw new Error(view + ": nl canonical was not rewritten");
  const nlDir = "." + nlPath;
  fs.mkdirSync(nlDir, { recursive: true });
  fs.writeFileSync(path.join(nlDir, "index.html"), nl);
  nlLocs.push(nlUrl);
}

// ---------------------------------------------------------------------------
// Lots.
//
// Until now a lot was the one thing on this site a search engine could never
// see. /lot/<id> has no file behind it, so GitHub Pages answered the 404.html
// fallback, and the fallback answers with a 404 status. A person got the lot
// because the router reads the path; Google got a 404 and left. The whole of
// the actual inventory was unindexable, on a site whose competitor has
// eighty-seven thousand listings in front of the same buyers.
//
// So each lot gets a real file with a real head, the same way the fixed paths
// do, plus the Product and Offer the client already builds at runtime. The
// difference is that this version exists before any JavaScript runs, which is
// the only version a crawler reads.
//
// The credentials are the ones already in index.html and already in every
// visitor's browser: a publishable key against row-level security. Read once
// from the source rather than copied here, so there is one definition.
const SUPA_URL = (html.match(/SUPA_URL = '([^']+)'/) || [])[1];
const SUPA_KEY = (html.match(/SUPA_KEY = '([^']+)'/) || [])[1];

const LOT_COLS = "id,toy,maker,line,year,condition,completeness,blurb,notes,image_urls,starting_bid,buy_now,sale_type,status,ends_at,closed_at";

// Honest lastmod needs a date the page's own content actually moved on.
//
// Google uses lastmod to decide what to recrawl and ignores a sitemap where
// everything claims to have changed today, so the one thing that matters is
// that these dates do NOT move on a deploy that changed nothing. The cron runs
// twice a day; two of those a day stamping "now" on sixty URLs would be worse
// than the no lastmod at all that we had.
//
// Static pages are all generated out of index.html, so the honest date is the
// last commit that touched it. A lot page is its own row, so it is whichever of
// the dates we hold is latest. updated_at is the right one and does not exist
// yet; the query asks for it separately and falls back, so this ships before
// that migration rather than waiting on it.
function gitDate(file) {
  try {
    return execSync("git log -1 --format=%cI -- " + file, { encoding: "utf8" }).trim() || null;
  } catch (e) { return null; }
}
const w3c = (d) => { const t = Date.parse(d); return isFinite(t) ? new Date(t).toISOString().slice(0, 19) + "+00:00" : null; };
function lotLastmod(l) {
  const dates = [l.updated_at, l.closed_at, l.created_at].filter(Boolean).map(Date.parse).filter(isFinite);
  return dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 19) + "+00:00" : null;
}

// One probe, before the real query. PostgREST answers 42703 for a column that
// is not there, and a build must not fall over because a migration has not run.
let HAS_UPDATED_AT = false;
async function probeUpdatedAt() {
  if (!SUPA_URL || !SUPA_KEY) return;
  try {
    const r = await fetch(SUPA_URL + "/rest/v1/lots?select=updated_at&limit=1", { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } });
    HAS_UPDATED_AT = r.ok;
  } catch (e) { HAS_UPDATED_AT = false; }
  console.log("lastmod: lots.updated_at " + (HAS_UPDATED_AT ? "present" : "absent, falling back to closed_at/created_at"));
}

async function fetchLots() {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("could not read SUPA_URL/SUPA_KEY out of index.html");
  // Everything a buyer could land on. Drafts are nobody's business, and a sold
  // lot is the archive: "what did this actually fetch" is a real search and the
  // answer is a page we already own.
  const url = SUPA_URL + "/rest/v1/lots?select=" + LOT_COLS + (HAS_UPDATED_AT ? ",updated_at" : "") + ",created_at" +
    "&status=in.(live,preview,sold,unsold)&order=created_at.desc";
  const res = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } });
  if (!res.ok) throw new Error("lots fetch failed: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("lots fetch returned " + typeof rows);
  return rows;
}

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
function trim(s, n) {
  s = clean(s);
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf(" "));
  return (stop > n * 0.6 ? cut.slice(0, stop) : cut).replace(/[.,;\s]+$/, "") + "\u2026";
}

function lotTitle(l) {
  const bits = [clean(l.toy) || "Vintage toy"];
  const maker = clean(l.maker).split(/[(,]/)[0].trim();
  if (maker) bits.push(maker + (clean(l.year) ? " " + clean(l.year) : ""));
  else if (clean(l.year)) bits.push(clean(l.year));
  return bits.join(" \u00b7 ") + " \u00b7 Hammer & Mold";
}

function lotDescription(l) {
  // The blurb is written for a reader, so it is the right thing to hand a
  // search engine too. Completeness is the fallback because on a vintage toy
  // that is the sentence a buyer is actually looking for.
  const lead = clean(l.blurb) || clean(l.completeness) || clean(l.notes);
  const tail = [];
  if (clean(l.condition)) tail.push("Condition " + clean(l.condition).toLowerCase());
  if (clean(l.sale_type) === "auction") tail.push("at auction");
  const s = lead ? trim(lead, 150) + (tail.length ? " " + tail.join(", ") + "." : "") : "";
  return s || (lotTitle(l).split(" \u00b7 Hammer")[0] + ", at Hammer & Mold.");
}

function lotSchema(l, url) {
  const sold = l.status === "sold" || l.status === "unsold";
  const ended = l.ends_at && new Date(l.ends_at).getTime() < Date.now();
  const avail = sold || ended ? "SoldOut" : (l.status === "preview" ? "PreOrder" : "InStock");
  const cond = /mint|sealed|misb|mib/i.test(clean(l.condition)) ? "NewCondition" : "UsedCondition";
  const price = Number(l.buy_now || l.starting_bid || 0);
  const node = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: clean(l.toy) || "Vintage toy",
    description: lotDescription(l),
    image: (Array.isArray(l.image_urls) ? l.image_urls : []).filter(Boolean).slice(0, 6),
    itemCondition: "https://schema.org/" + cond,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: price.toFixed(2),
      availability: "https://schema.org/" + avail,
      itemCondition: "https://schema.org/" + cond,
      seller: { "@type": "Organization", "@id": SITE + "/#org" },
    },
  };
  const brand = clean(l.maker).split(/[(,]/)[0].trim();
  if (brand) node.brand = { "@type": "Brand", name: brand };
  if (clean(l.year)) node.releaseDate = clean(l.year);
  return node;
}

await probeUpdatedAt();
const lots = await fetchLots();

// Two of the same toy is normal in this shop: two Boba Fetts came through in
// the same week. Identical titles across two URLs is not normal, it is the
// duplicate a search engine drops one of. So a repeat gets the thing a
// collector would actually use to tell them apart, its condition, and only if
// that still collides does it fall back to a fragment of the id.
const titleCount = new Map();
for (const l of lots) {
  const t = lotTitle(l);
  titleCount.set(t, (titleCount.get(t) || 0) + 1);
}
const titleUsed = new Map();
function uniqueTitle(l) {
  const base = lotTitle(l);
  if ((titleCount.get(base) || 0) < 2) return base;
  const cond = clean(l.condition);
  const withCond = cond ? base.replace(" \u00b7 Hammer & Mold", " \u00b7 " + cond + " \u00b7 Hammer & Mold") : base;
  const seen = (titleUsed.get(withCond) || 0) + 1;
  titleUsed.set(withCond, seen);
  if (seen === 1) return withCond;
  return withCond.replace(" \u00b7 Hammer & Mold", " \u00b7 " + String(l.id).slice(0, 6) + " \u00b7 Hammer & Mold");
}

const lotLocs = [];
for (const l of lots) {
  if (!l || !l.id) continue;
  const path = "/lot/" + encodeURIComponent(l.id) + "/";
  const url = SITE + path;
  const title = uniqueTitle(l);
  const desc = lotDescription(l);
  const hero = (Array.isArray(l.image_urls) ? l.image_urls : []).filter(Boolean)[0] || "";

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(title) + "</title>")
    .replace(/(<meta name="description" content=")[^"]*(")/, "$1" + esc(desc) + "$2")
    .replace(/(<link rel="canonical" href=")[^"]*(")/, "$1" + esc(url) + "$2")
    .replace(/(<meta property="og:title" content=")[^"]*(")/, "$1" + esc(title) + "$2")
    .replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + esc(desc) + "$2")
    .replace(/(<meta property="og:url" content=")[^"]*(")/, "$1" + esc(url) + "$2")
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, "$1" + esc(title) + "$2")
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, "$1" + esc(desc) + "$2");
  if (hero) {
    out = out
      .replace(/(<meta property="og:image" content=")[^"]*(")/, "$1" + esc(hero) + "$2")
      .replace(/(<meta name="twitter:image" content=")[^"]*(")/, "$1" + esc(hero) + "$2");
  }
  out = out.replace("</head>", '<script id="lotLd" type="application/ld+json">' +
    JSON.stringify(lotSchema(l, url)) + "</script></head>");

  if (!out.includes('href="' + esc(url) + '"')) throw new Error(l.id + ": canonical was not rewritten");

  const dir = "." + path;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.replace(/^\//, "") + "index.html", out);
  lotLocs.push({ loc: url, status: l.status, lastmod: lotLastmod(l) });
}

// A second sitemap rather than appending to the hand-kept one, because these
// come and go with the auctions and that file is written by a person. Declared
// in robots.txt, so it is found without anybody having to submit it.
if (lotLocs.length) {
  const body = lotLocs.map((x) =>
    "  <url>\n    <loc>" + x.loc + "</loc>\n" +
    (x.lastmod ? "    <lastmod>" + x.lastmod + "</lastmod>\n" : "") +
    "    <priority>" + (x.status === "sold" || x.status === "unsold" ? "0.4" : "0.7") +
    "</priority>\n  </url>"
  ).join("\n");
  fs.writeFileSync("sitemap-lots.xml",
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    "<!-- Generated by build-pages.mjs at deploy. Do not edit, and do not commit. -->\n" +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "\n</urlset>\n");
}
console.log("lots: " + lotLocs.length + " pre-rendered, sitemap-lots.xml written");

// The app itself is the fallback for anything per-record that has no file:
// /seller/<id>, and a /lot/<id> that was published after the last deploy.
fs.copyFileSync(SRC, "404.html");

// ---- lastmod on the hand-kept sitemap ----
//
// Those nineteen pages are all generated out of index.html, so the date that
// is true for every one of them is the last commit that touched it. Written
// into the deployed copy only: the file in the repo stays hand-kept and
// stays clean in a diff, and the date cannot drift out of step with the
// source because it is read from the source every build.
//
// Deliberately not "now". Two scheduled deploys a day stamping today on
// nineteen URLs is a sitemap that claims the whole site changes twice daily,
// which is the one thing that makes Google stop believing the field.
if (fs.existsSync("sitemap.xml")) {
  // No invented date. If git cannot tell us when index.html last changed, the
  // honest answer is no lastmod at all: that is the state we were already in,
  // and a date that says "today" on every deploy is worse than none, because
  // it teaches Google to stop reading the field.
  const srcDate = w3c(gitDate(SRC));
  let sm = fs.readFileSync("sitemap.xml", "utf8");
  if (!srcDate) console.log("sitemap: no git date for " + SRC + ", leaving lastmod off");
  // Anything this build appended last time comes out first. sitemap.xml is
  // tracked and written in place, so without this a second run appends the
  // eighteen Dutch urls again: 19 became 37 became 55. Found by running it
  // twice, which is the only way this class of bug ever shows up.
  sm = sm.replace(/\n  <url>\n    <loc>[^<]*\/nl\/[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
  // Stripped before it is added, so this is idempotent. The file is tracked
  // and written in place, so a second run, or a run over a copy that already
  // carries a stamp, has to land on the same result rather than stacking a
  // second lastmod inside every url. Found by running the build twice.
  sm = sm.replace(/\n\s*<lastmod>[^<]*<\/lastmod>/g, "");
  // changefreq goes with it. Google has said for years that it ignores the
  // field, and here it was actively wrong: /molders/kenner/ claimed "yearly"
  // about a page rewritten twice this week.
  sm = sm.replace(/\n\s*<changefreq>[^<]*<\/changefreq>/g, "");
  if (srcDate) sm = sm.replace(/(<loc>[^<]*<\/loc>)/g, "$1\n    <lastmod>" + srcDate + "</lastmod>");
  // The Dutch pages, appended rather than hand-kept: they are generated, so a
  // person editing sitemap.xml should not have to remember them.
  if (NL_PUBLIC && nlLocs.length) {
    const body = nlLocs.map((u) =>
      "  <url>\n    <loc>" + u + "</loc>\n" +
      (srcDate ? "    <lastmod>" + srcDate + "</lastmod>\n" : "") +
      "    <priority>0.6</priority>\n  </url>").join("\n");
    sm = sm.replace("</urlset>", body + "\n</urlset>");
  }
  fs.writeFileSync("sitemap.xml", sm);
  console.log("sitemap: lastmod " + srcDate + " on " + (sm.match(/<lastmod>/g) || []).length + " urls, changefreq removed");
}

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

// ---- Dutch coverage, and the worklist ----
//
// The number that matters is the miss list, not the percentage: it is the
// exact set of sentences still to write, in document order, so translating is
// a file to work through rather than a site to read.
{
  const total = i18nStats.hit + i18nStats.miss;
  const pct = total ? Math.round((i18nStats.hit / total) * 100) : 0;
  const missed = [...i18nStats.missed];
  fs.mkdirSync("i18n", { recursive: true });
  fs.writeFileSync("i18n/untranslated.txt",
    "# " + missed.length + " strings without a Dutch entry, as at " + new Date().toISOString().slice(0, 10) + ".\n" +
    "# Copy a line into i18n/nl.json as the key, with the Dutch as its value.\n" +
    "# A string that stops appearing here is either translated or no longer on the site.\n\n" +
    missed.join("\n") + "\n");
  console.log("nl: " + nlLocs.length + " pages written, " + pct + "% of " + total +
    " strings translated, " + missed.length + " left in i18n/untranslated.txt");
  // An entry nothing ever looked up is dead weight: either the English was
  // rewritten and the key stopped matching, or the string lives in JavaScript
  // and this pass cannot reach it. Both are worth knowing and neither is
  // visible any other way.
  const stale = Object.keys(NL_DICT).filter((k) => !k.startsWith("_") && !i18nStats.seen.has(k));
  if (stale.length) {
    fs.writeFileSync("i18n/unused.txt",
      "# " + stale.length + " dictionary entries that no page looked up, as at " +
      new Date().toISOString().slice(0, 10) + ".\n" +
      "# Either the English changed, or the string is built in JavaScript and the\n" +
      "# markup pass cannot see it. Neither is an error; both are worth checking.\n\n" +
      stale.join("\n") + "\n");
    console.log("nl: " + stale.length + " dictionary entries unused, listed in i18n/unused.txt");
  } else if (fs.existsSync("i18n/unused.txt")) fs.rmSync("i18n/unused.txt");
}

console.log("pre-rendered " + written + " pages, plus 404.html");
console.log(report.join("\n"));
