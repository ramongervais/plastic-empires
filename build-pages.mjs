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
import crypto from "node:crypto";
import { translate, extractStrings, loadDict, applyHtmlRules, dropOpen, dropClose } from "./i18n.mjs";
import { jsLiterals, phraseKeys, runtimeDict, injectRuntime, decodeEntities } from "./i18n-runtime.mjs";

// The source moved out of the web root the day the stylesheet and the scripts
// were lifted out of it. Before that the file served at / was also the file the
// build read, so stripping anything out of a page meant stripping it out of the
// source. Generated output must never be able to touch its input.
const SRC = "src/index.html";

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
// Every language this build writes, read from i18n/locales.json so the table
// is data rather than code and a sixth language is a row, not a refactor.
// Each carries its own dictionaries, its own statistics and its own list of
// urls for the sitemap, because a half-finished language must not be able to
// drag a finished one down with it.
const LOCALES = JSON.parse(fs.readFileSync("i18n/locales.json", "utf8")).locales.map((L) => ({
  ...L,
  dict: loadDict(fs, "i18n/" + L.code + ".json"),
  html: fs.existsSync("i18n/" + L.code + "-html.json") ? loadDict(fs, "i18n/" + L.code + "-html.json") : {},
  js: loadDict(fs, "i18n/" + L.code + "-js.json"),
  prefix: "/" + L.code,
  // code is the URL. lang is what goes in the lang attribute and in hreflang,
  // and the two stop being the same word at Chinese: the path wants /zh/ and
  // the markup wants zh-Hant, because a crawler has to be told which script
  // this is and a reader in Taipei must not be sent to a Simplified page.
  // label is what the nav button shows, where ZH-HANT does not fit and would
  // not be read by the people it is for anyway.
  lang: L.lang || L.code,
  label: L.label || L.code.toUpperCase(),
  // seen is every key this language actually looked up. An entry nothing looked
  // up is dead weight, and that is a more honest test than searching the source:
  // the per-page titles and descriptions are injected here and never appear in it.
  stats: { hit: 0, miss: 0, missed: new Set(), seen: new Set() },
  locs: [],                                     // static pages only: the others have their own sitemap
  written: 0,
}));
const byCode = Object.fromEntries(LOCALES.map((L) => [L.code, L]));
// The other half of the site is drawn by JavaScript after the page loads: the
// lot page, bidding, the sell flow, checkout, the account. None of it is in
// index.html, so the markup pass cannot see it. Those pages carry a small
// observer instead, applying the same whole-text-node rule at runtime.

// One small flag per language, drawn rather than emoji: an emoji flag renders
// as two letters on Windows and as a different shape on every platform.
//
// A flag is a country and the button is a language, which is why the name of
// the language sits next to it and does the actual work. The flag is what
// people look for; the name is what is true.
const FLAGS = JSON.parse(fs.readFileSync("i18n/flags.json", "utf8"));
const FLAG_EN = FLAGS.en;
// ---------------------------------------------------------------------------
// One page, in one language. The three places that used to write a Dutch
// sibling by hand (the static pages, the lots, the sellers) now hand their
// finished English page to this and get the translated one back, so a rule
// about what a translated page looks like is written once.

// hreflang has to name every version including the one it is on, or the set
// does not reciprocate and Google ignores all of it. x-default points at
// English because that is where a reader with no match should land.
function alternatesFor(p) {
  const canon = (q) => (q === "/" ? "/" : q.replace(/\/+$/, "") + "/");
  const en = SITE + canon(p);
  let out = '<link rel="alternate" hreflang="en" href="' + esc(en) + '">';
  for (const L of LOCALES) {
    if (!L.public) continue;                    // not offered yet, so not advertised
    out += '<link rel="alternate" hreflang="' + L.lang + '" href="' + esc(SITE + L.prefix + canon(p)) + '">';
  }
  return out + '<link rel="alternate" hreflang="x-default" href="' + esc(en) + '">';
}

// Every internal link on a translated page pointed at the English version of
// the page it names. A reader never noticed, because the router rewrites the
// path on click. A crawler is not clicking: it follows the href, lands in
// English, and the translated tree has one way in and no way through it.
//
// Only paths the build actually owns, matched whole, so an external URL or a
// fragment is never touched. The language switch is replaced afterwards and
// keeps its English target, which is the one link that is supposed to leave.
function localeLinks(html, paths, prefix) {
  let out = html;
  for (const q of paths) {
    if (q === "/") continue;
    const slash = q.endsWith("/") ? q : q + "/";
    out = out.split('href="' + slash + '"').join('href="' + prefix + slash + '"');
  }
  out = out.replace(/href="\/#/g, 'href="' + prefix + '/#');
  return out.split('href="/"').join('href="' + prefix + '/"');
}

// Every language this page exists in, as a menu. Each entry points at this
// page's own twin and not at the home page: hard-coded it would drop a reader
// of the Kenner essay somewhere else and make them find their place again.
//
// A language that is not public yet is still listed. Somebody has to be able
// to read it in order to finish it, and a reader who finds it early sees a
// page that falls back to English rather than a broken one.
function langMenu(p, current) {
  const canon = (q) => (q === "/" ? "/" : q.replace(/\/+$/, "") + "/");
  const here = LOCALES.find((L) => L.code === current);
  const rows = [{ code: "en", lang: "en", name: "English", href: canon(p) }]
    .concat(LOCALES.map((L) => ({ code: L.code, lang: L.lang, name: L.name, href: L.prefix + canon(p) })));
  return '<div class="navdrop langdrop" id="ndLang">' +
    '<button class="navtop lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Change language">' +
      (here ? (FLAGS[here.code] || "") : FLAG_EN) + (here ? here.label : "EN") +
      '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>' +
    '</button><div class="dropmenu" role="menu">' +
    rows.map((r) => '<a href="' + esc(r.href) + '" hreflang="' + r.lang + '" lang="' + r.lang + '" role="menuitem"' +
      (r.code === (current || "en") ? ' aria-current="true"' : "") + '>' +
      (FLAGS[r.code] || "") + esc(r.name) + '</a>').join("") +
    "</div></div>";
}

function localePage(L, out, p, opts) {
  const canon = (q) => (q === "/" ? "/" : q.replace(/\/+$/, "") + "/");
  const lPath = L.prefix + canon(p);
  const lUrl = SITE + lPath;
  // A page can name another as its original. Lots do: their text is English in
  // every language, so each language copy points at the English lot.
  const canonUrl = (opts && opts.canonicalUrl) || lUrl;
  let x = applyHtmlRules(translate(dropOpen(out), L.dict, L.stats).html, L.html);
  x = dropClose(x, L.drop !== false);
  x = localeLinks(x, Object.values(PATHS), L.prefix);
  // The pre-rendered lot cards (withShop) link to /lot/<id>/, which is not one
  // of PATHS, so localeLinks leaves them alone. Every lot has a file in every
  // language, and a Dutch reader clicking a card should stay in Dutch.
  x = x.replace(/href="\/lot\//g, 'href="' + L.prefix + '/lot/');
  // dir on the html element is what turns the whole layout around. The
  // stylesheet is written in logical properties, so this one attribute does
  // the work that a mirrored stylesheet would otherwise have to.
  x = x
    .replace(/<html lang="en">/, '<html lang="' + L.lang + '"' + (L.dir === "rtl" ? ' dir="rtl"' : "") + ">")
    .replace(/(<link rel="canonical" href=")[^"]*(")/, "$1" + esc(canonUrl) + "$2")
    .replace(/(<meta property="og:url" content=")[^"]*(")/, "$1" + esc(canonUrl) + "$2")
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, "$1" + L.ogLocale + "$2")
    .replace(/"inLanguage":"en"/g, '"inLanguage":"' + L.lang + '"')
    .replace(/<div class="navdrop langdrop"[\s\S]*?<\/div><\/div>/, langMenu(p, L.code));
  if (opts && opts.head) x = opts.head(x);
  if (!x.includes('<html lang="' + L.lang + '"')) throw new Error(L.code + " " + p + ": lang attribute was not set");
  if (!x.includes('href="' + esc(canonUrl) + '"')) throw new Error(L.code + " " + p + ": canonical was not rewritten");
  // A language stays reachable while it is being filled, and out of the index
  // until it is worth reading. Half a page in English under a German lang
  // attribute is the thin-and-duplicate verdict this site can least afford.
  if (!L.public) x = x.replace(/(<meta name="robots" content=")[^"]*(")/, "$1noindex, follow$2");
  x = injectRuntime(x, L.runtime);
  if (opts && opts.fragments) writeFragments(x, L.prefix);
  x = stripViews(x, opts && opts.keep);
  fs.mkdirSync("." + lPath, { recursive: true });
  fs.writeFileSync(lPath.replace(/^\//, "") + "index.html", x);
  L.written++;                                  // what exists, whether or not it is advertised
  return lUrl;
}




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

// seen is every key the build actually looked up, across all generated pages.
// A dictionary entry that was never looked up is dead, and that is a more
// honest test than searching index.html: the per-page titles and descriptions
// are injected by this build and never appear in the source file.
// ---------------------------------------------------------------------------
// The stylesheet and the scripts, lifted out of the page.
//
// Every page carried its own copy of 142KB of CSS and 337KB of JavaScript,
// which is fine for one page and absurd for sixty-six of them in seven
// languages: 432MB published, against a 1GB ceiling, with forty-four lots in
// the shop. Hoisted into two files it is 190MB, and a reader downloads them
// once instead of on every click.
//
// The filename carries a hash of its own contents. A deploy that changes the
// JavaScript changes the name, so nobody is served last week's script out of
// their cache, and a deploy that changes nothing changes no name.
const rawHtml = fs.readFileSync(SRC, "utf8");
const assetHash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);

const html = (() => {
  let out = rawHtml;

  // One stylesheet. There is only one <style> and it is the whole design.
  const styles = [...out.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
  const css = styles.map((m) => m[1]).join("\n");
  const cssName = "app." + assetHash(css) + ".css";
  fs.writeFileSync(cssName, css);
  out = out.replace(styles[0][0], '<link rel="stylesheet" href="/' + cssName + '">');
  for (const m of styles.slice(1)) out = out.replace(m[0], "");

  // One script, in document order. They already shared one global scope as
  // separate blocks, so joining them changes nothing about what sees what.
  // External scripts and the JSON-LD stay where they are: one is somebody
  // else's file and the other is different on every page.
  const inline = [...out.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
  const js = inline.map((m) => m[1]).join("\n;\n");
  const jsName = "app." + assetHash(js) + ".js";
  fs.writeFileSync(jsName, js);
  // The app goes last, where the whole document exists. The blocks that used
  // to run mid-page only ever reached backwards, so later is safer, not
  // riskier: more of the page is there by the time they look for it.
  for (const m of inline) out = out.replace(m[0], "");
  out = out.replace("</body>", '<script src="/' + jsName + '"></script></body>');

  // Nothing of ours may be left behind in the page, or it ships twice.
  for (const m of [...styles, ...inline]) {
    if (out.includes(m[0])) throw new Error("asset extraction left a block behind");
  }
  console.log("assets: " + cssName + " " + (css.length / 1024 | 0) + "KB, " +
    jsName + " " + (js.length / 1024 | 0) + "KB, page now " + (out.length / 1024 | 0) + "KB");
  // Last deploy's hashed files are not ours to keep.
  for (const f of fs.readdirSync(".")) {
    if (/^app\.[0-9a-f]{10}\.(css|js)$/.test(f) && f !== cssName && f !== jsName) fs.rmSync(f);
  }
  return out;
})();

// Every string literal the application's own scripts can produce, and the
// subset of both dictionaries that matches one. Shipping the whole dictionary
// would put a hundred kilobytes of Terms on every page for nothing; the
// runtime only needs what JavaScript can actually write to the document.
const JS_LITERALS = jsLiterals(rawHtml);
for (const L of LOCALES) L.runtime = runtimeDict(L.dict, L.js, JS_LITERALS);

// Pull the two tables out of the app and evaluate them, rather than keeping a
// second copy here that would drift.
function grab(name) {
  const i = rawHtml.indexOf("const " + name + " = {");
  if (i < 0) throw new Error("could not find " + name + " in " + SRC);
  const open = rawHtml.indexOf("{", i);
  let depth = 0, end = -1;
  for (let j = open; j < rawHtml.length; j++) {
    const c = rawHtml[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) throw new Error("unbalanced braces reading " + name);
  return new Function("return " + rawHtml.slice(open, end + 1))();
}

// The router carries its own copy of the language list, because it runs in a
// browser and cannot read i18n/locales.json. Two copies drift, so the build
// refuses to run when they have: a router that does not know about a language
// quietly sends its readers to the home page, which is the kind of fault that
// looks like nothing at all.
{
  const m = rawHtml.match(/const LOCALE_CODES = \[([^\]]*)\]/);
  if (!m) throw new Error("could not find LOCALE_CODES in " + SRC);
  const inApp = m[1].split(",").map((x) => x.trim().replace(/^'|'$/g, "")).filter(Boolean).sort();
  const inFile = LOCALES.map((L) => L.code).sort();
  if (inApp.join() !== inFile.join()) {
    throw new Error("LOCALE_CODES in " + SRC + " is [" + inApp.join(", ") +
      "] but i18n/locales.json has [" + inFile.join(", ") + "]");
  }
  // The router reads the language off the lang attribute and has to get the
  // code back out of it. That held for eight locales and failed for the ninth:
  // Chinese is zh in the path and zh-Hant in the markup, LANG_PREFIX came out
  // empty, and every client-side navigation on the Chinese site dropped the
  // /zh/ prefix. The check above could not see it, because both files agreed
  // on the code. This one compares the code with the attribute it is read from.
  for (const L of LOCALES) {
    if (L.lang.split("-")[0] !== L.code) {
      throw new Error(L.code + ': lang is "' + L.lang + '", whose primary subtag is "' +
        L.lang.split("-")[0] + '". The router derives the code from that subtag, so it must be the code.');
    }
  }
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
// ---------------------------------------------------------------------------
// One page, one subject.
//
// Every generated file carried every view: twelve essays, help, terms and
// privacy, 29,000 words under every address. Measured on the live site on
// 14 Oct 2026: /molders/galoob/ and /molders/dor-mei/ were 377KB and 29,640
// words each, and every lot page was the same. Search Console had 22 of 39
// pages indexed and not one lot, and Google's own AI was citing the Palitoy
// essay while ranking the page 36th. A crawler cannot tell what a page is
// about when it is about everything.
//
// So each file keeps its own view and leaves the others as an empty element
// marked data-defer. Their content goes to /views/<view>.html (and
// /<code>/views/<view>.html, translated), which the router fetches the first
// time a reader goes there. The app views (home, sell, lot, account...) stay
// in every page: they are small, and they are the application.
const DEFER = ["empire", "tmnt", "ljn", "galoob", "hasbrowwf", "howitworks", "thinkway", "kaiju", "sofubi",
  "imperial", "palitoy", "dormei", "retrobright", "moulds", "privacy", "help", "terms"];

function viewSpan(page, v) {
  const open = '<main class="view" id="view-' + v + '"';
  const at = page.indexOf(open);
  if (at < 0 || page.indexOf(open, at + 1) >= 0) throw new Error("view " + v + ": expected exactly one <main>");
  const openEnd = page.indexOf(">", at) + 1;
  const close = page.indexOf("</main>", openEnd);
  // A <main> inside a view would end the slice early and leave half an essay
  // loose in the page. There is none today; this says so loudly if one arrives.
  if (page.slice(openEnd, close).includes("<main")) throw new Error("view " + v + ": nested <main>");
  return { at, openEnd, close };
}

function stripViews(page, keep) {
  for (const v of DEFER) {
    if (v === keep) continue;
    const { at, openEnd, close } = viewSpan(page, v);
    const tag = page.slice(at, openEnd).replace(/>$/, " data-defer>");
    page = page.slice(0, at) + tag + page.slice(close);
  }
  return page;
}

function writeFragments(page, prefix) {
  const dir = (prefix ? prefix.replace(/^\//, "") + "/" : "") + "views";
  fs.mkdirSync(dir, { recursive: true });
  for (const v of DEFER) {
    const { openEnd, close } = viewSpan(page, v);
    const body = page.slice(openEnd, close);
    if (body.trim().length < 500) throw new Error("view " + v + ": fragment is empty");
    fs.writeFileSync(dir + "/" + v + ".html", body);
  }
}

const MOLDER = new Set(["empire", "tmnt", "ljn", "galoob", "hasbrowwf", "thinkway", "kaiju", "imperial", "palitoy", "dormei", "sofubi"]);
// Not a molder, but the same kind of page: researched, argued, signed. It gets
// the same Article node, with a subject that is a process rather than a company.
const ARTICLE_SUBJECT = { retrobright: "Retrobrighting", moulds: "Toy manufacturing" };
const MOLDER_NAME = {
  empire: "Kenner Products",
  tmnt: "Playmates Toys",
  ljn: "LJN",
  galoob: "Galoob",
  hasbrowwf: "Hasbro",
  thinkway: "Thinkway Toys",
  kaiju: "Marusan Shoten, Bullmark and Popy",
  imperial: "Imperial Toy Corporation",
  palitoy: "Palitoy",
  dormei: "Dor Mei",
  // Not a company: a material and the trade around it. The Article subject is
  // the craft, the way Retrobrighting's is.
  sofubi: "Sofubi",
};

// "home" is not in here any more. / is served by index.html itself, so there
// is no English file to generate, but /nl/ is a real file and has to be
// written or the Dutch home page does not exist. The loop skips its English
// write, in NO_EN_FILE below, and goes on to the Dutch one.
const SKIP = new Set(["lot", "seller", "account", "checkout"]);
// Empty now. / used to be served by the source file itself, so there was
// nothing to generate; since the stylesheet and the scripts came out of it,
// the page at / is built like every other one.
const NO_EN_FILE = new Set();

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
const SUPA_URL = (rawHtml.match(/SUPA_URL = '([^']+)'/) || [])[1];
const SUPA_KEY = (rawHtml.match(/SUPA_KEY = '([^']+)'/) || [])[1];

const LOT_COLS = "id,seller_id,toy,maker,line,year,condition,completeness,blurb,notes,image_urls,starting_bid,buy_now,sale_type,status,ends_at,closed_at,badges,rare_reason,estimate_low,estimate_high,estimate_checked";

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
    // --follow, because the file moved into src/ and its history did not
    // start over when it did.
    return execSync("git log -1 --follow --format=%cI -- " + file, { encoding: "utf8" }).trim() || null;
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
    "&status=in.(live,preview,offer,sold,unsold)&order=created_at.desc";
  const res = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } });
  if (!res.ok) throw new Error("lots fetch failed: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("lots fetch returned " + typeof rows);
  return rows;
}

// seller_public is the public view: the columns a visitor is allowed to read,
// which is why this works on the anon key at all. profiles itself is own-row.
async function fetchSellers() {
  const url = SUPA_URL + "/rest/v1/seller_public?select=id,display_name,handle,type,location,bio,created_at,logo_url";
  const res = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } });
  if (!res.ok) throw new Error("sellers fetch failed: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("sellers fetch returned " + typeof rows);
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
  const toy = clean(l.toy) || "Vintage toy";
  // Titles now carry their own maker and year (the curation's title grammar,
  // 14 Oct 2026), so appending them again gave "Granny Gross ... 1988 Vintage
  // \u00b7 1988". Each is added only when the title does not already say it.
  const has = (w) => w && toy.toLowerCase().includes(w.toLowerCase());
  const maker = clean(l.maker).split(/[(,]/)[0].trim();
  const year = clean(l.year);
  // A range counts as said when any year in it is already in the title:
  // "Boba Fett 1979 Vintage" with year "1979-1980".
  const yearSaid = has(year) || (year.match(/\b(19|20)\d\d\b/g) || []).some(has);
  const makerSaid = has(maker) || has(maker.split(" ")[0]);   // "Thinkway" for "Thinkway Toys"
  const tail = [makerSaid ? "" : maker, yearSaid ? "" : year].filter(Boolean).join(" ");
  return [toy, tail].filter(Boolean).join(" \u00b7 ") + " \u00b7 Hammer & Mold";
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

// The same description with the parts that are ours in the reader's language.
// The blurb is the seller's own prose and is left exactly as they wrote it:
// translating someone's description of their own toy is not this build's job,
// and Ramon decided it stays as written.
//
// The two connectors come out of the dictionary like everything else, so a
// language that has not been translated yet returns nothing and the English
// description stands rather than a half-German sentence.
function lotDescriptionIn(L, l) {
  const t = (en) => L.dict[en] || L.js[en];
  const condWord = t("Condition {c}"), aucWord = t("at auction");
  if (!condWord && !aucWord) return null;
  const lead = clean(l.blurb) || clean(l.completeness) || clean(l.notes);
  const tail = [];
  const cond = clean(l.condition);
  if (cond && condWord) tail.push(condWord.replace("{c}", (L.js[cond] || cond).toLowerCase()));
  if (clean(l.sale_type) === "auction" && aucWord) tail.push(aucWord);
  const s = lead ? trim(lead, 150) + (tail.length ? " " + tail.join(", ") + "." : "") : "";
  return s || null;
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
    image: (Array.isArray(l.image_urls) ? l.image_urls : []).filter(Boolean).slice(0, 12),
    itemCondition: "https://schema.org/" + cond,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: price.toFixed(2),
      availability: "https://schema.org/" + avail,
      itemCondition: "https://schema.org/" + cond,
      seller: { "@type": "Organization", "@id": SITE + "/#org" },
      // From our own terms: fourteen days from receipt, by post, return postage
      // on the buyer for a change of mind (ours when it arrives damaged or not
      // as described, which schema has no field for).
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: ["NL", "BE", "DE", "FR", "ES", "IT", "AT", "IE", "PT", "PL", "DK", "SE", "FI", "GB", "US", "JP"],
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      },
    },
  };
  const q = shipQuote[l.id] || {};
  const ships = SHIP_ZONES.filter((cc) => q[cc] > 0).map((cc) => ({
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: q[cc].toFixed(2), currency: "EUR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: cc },
  }));
  if (ships.length) node.offers.shippingDetails = ships;
  const brand = clean(l.maker).split(/[(,]/)[0].trim();
  if (brand) node.brand = { "@type": "Brand", name: brand };
  if (clean(l.year)) node.releaseDate = clean(l.year);
  return node;
}

await probeUpdatedAt();
const lots = await fetchLots();

// Real postage for the product schema (Search Console, 19 Oct 2026: offers
// without shippingDetails). Asked from the pay worker, which prices it with the
// carriers exactly as checkout does: the cheapest rate per lot to three places
// that stand for the three zones. If the worker cannot answer, the schema goes
// without shipping rather than with a guessed figure.
const SHIP_ZONES = ["NL", "DE", "US"];
const shipQuote = {};
for (const cc of SHIP_ZONES) {
  const ids = lots.filter((l) => l.status === "live" || l.status === "preview").map((l) => l.id);
  for (let i = 0; i < ids.length; i += 60) {
    try {
      const r = await fetch("https://plasticempires-pay.ramongervais.workers.dev/shipping-quotes", {
        method: "POST", headers: { "Content-Type": "application/json", Origin: "https://hammerandmold.com" },
        body: JSON.stringify({ country: cc, lotIds: ids.slice(i, i + 60) }),
      });
      const d = await r.json();
      for (const [id, price] of Object.entries((d && d.quotes) || {})) (shipQuote[id] = shipQuote[id] || {})[cc] = Number(price);
    } catch (e) { console.warn("shipping quotes " + cc + ": " + e.message); }
  }
}

// ---------------------------------------------------------------------------
// The shop, in the HTML.
//
// Search Console on 14 Oct 2026, for a lot listed in sitemap-lots.xml:
// "Discovered, currently not indexed", referring page "none detected". Google
// had never fetched a single lot, because no page linked to one: the home page
// and /results/ arrive with eight grey placeholders and get their cards from
// Supabase after the script runs, and Google's first pass reads the page
// before any script. A lot known only from a sitemap is an orphan, and orphans
// wait.
//
// eBay's search and category pages arrive as finished HTML with a link to every
// item in them, and that is the model here. The build writes real cards where
// the placeholders were: every open lot on the home page, every closed one on
// /results/. They carry the classes the app's own cards carry (draft-lot), so
// injectDraftLots() and renderSold() replace them with live ones the moment
// Supabase answers, exactly as they replaced the placeholders. A reader sees
// the shop a beat sooner; a crawler sees it at all.
//
// Only on those two pages. The home view is in every file, and fifty-one lot
// links under every essay would be the duplication undone a step back.
async function fetchBidAgg(ids) {
  const agg = {};
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await fetch(SUPA_URL + "/rest/v1/bids?select=lot_id,amount&lot_id=in.(" + chunk.join(",") + ")",
      { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } });
    if (!res.ok) throw new Error("bids fetch failed: HTTP " + res.status);
    for (const b of await res.json()) {
      const m = agg[b.lot_id] || { max: 0, count: 0 };
      m.max = Math.max(m.max, Number(b.amount)); m.count++;
      agg[b.lot_id] = m;
    }
  }
  return agg;
}
const bidAgg = await fetchBidAgg(lots.map((l) => l.id));

// The same figures lotCardHtml() shows, from the same rules, so the swap to the
// live card changes nothing a reader can see unless a bid came in since.
// What the static cards print is the seller's text (title, line, maker, year)
// and a live figure (the bid count). Neither belongs on a translator's worklist,
// the same rule as lotContent below, which is declared too late to use here.
const cardContent = new Set();
function staticCard(l) {
  const a = bidAgg[l.id] || { max: 0, count: 0 };
  const closed = l.status === "sold" || l.status === "unsold";
  const fixed = l.sale_type === "fixed";
  const amount = fixed ? Number(l.buy_now || l.starting_bid || 0)
    : a.count ? a.max : (closed && l.buy_now ? Number(l.buy_now) : Number(l.starting_bid || 0));
  const money = "\u20ac " + amount.toLocaleString("nl-NL");
  const sub = closed ? (a.count ? a.count + " bids" : "Final price")
    : l.status === "preview" ? "Starting bid" : fixed ? "Fixed price" : a.count + " bids";
  const img = (Array.isArray(l.image_urls) ? l.image_urls : []).filter(Boolean)[0] || "";
  const card = img.replace(/\.(jpe?g|png|webp)(\?.*)?$/i, "_card.jpg$2");
  const maker = String(l.maker || "").split(/[(,]/)[0].trim();
  const badge = l.status === "sold" ? "Sold" : closed ? "Ended" : "";
  const id = esc(l.id), href = "/lot/" + encodeURIComponent(l.id) + "/";
  for (const t of [clean(l.toy), [clean(l.line), maker, l.year].filter(Boolean).join(" \u00b7 "), a.count + " bids", "Very Rare: " + clean(l.rare_reason), (l.estimate_low && l.estimate_high ? "Est. \u20ac " + Number(l.estimate_low).toLocaleString("nl-NL") + " \u2013 \u20ac " + Number(l.estimate_high).toLocaleString("nl-NL") : "")]) { cardContent.add(t); cardContent.add(esc(t)); }
  return '<article class="artifact-card draft-lot">' +
    '<div class="vitrine' + (closed ? " closed" : "") + '" data-nav="lot" data-lot="' + id + '" style="cursor:pointer">' +
      (img ? '<img class="cardimg" src="' + esc(card) + '" data-full="' + esc(img) + '" alt="' + esc(clean(l.toy)) +
        '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.full">' : "") +
      (badge ? '<span class="card-badge">' + badge + "</span>" : "") +
      // Same markup and order as lotCardHtml(), so the swap to the live card
      // does not move anything: all three badges as icons, bottom left.
      (Array.isArray(l.badges) && (l.badges.includes("complete") || l.badges.includes("rare") || l.badges.includes("box") || l.badges.includes("instructions"))
        ? '<div class="card-icons">' +
          (l.badges.includes("rare")
            ? '<span class="complete-icon" role="img" tabindex="0" aria-label="' + esc("Very Rare" + (l.rare_reason ? ": " + l.rare_reason : "")) + '" data-tip="' + esc("Very Rare" + (l.rare_reason ? ": " + l.rare_reason : "")) + '">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 9.5L12 3L7 9.5L12 21L17 9.5Z"/><path d="M7 9.5H2L6.5 4L12 3L17.5 4L22 9.5H17M17.5 4L17 9.5M17 9.5H7M6.5 4L7 9.5"/><path d="M22 9.5L12 21L2 9.5"/></svg></span>'
            : "") +
          (l.badges.includes("complete")
            ? '<span class="complete-icon" role="img" tabindex="0" aria-label="Complete, with all original accessories" data-tip="Complete, with all original accessories">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12L11 14L15 10"/><path d="M14.3942 3.00083L14.1481 2.79115C12.9103 1.73628 11.0897 1.73628 9.85189 2.79115L9.60584 3.00083C8.96518 3.54679 8.16862 3.87674 7.32956 3.9437L7.00731 3.96941C5.38613 4.09878 4.09878 5.38613 3.96941 7.00731L3.9437 7.32956C3.87674 8.16862 3.54679 8.96518 3.00083 9.60584L2.79115 9.85189C1.73628 11.0897 1.73628 12.9103 2.79115 14.1481L3.00083 14.3942C3.54679 15.0348 3.87674 15.8314 3.9437 16.6704L3.96941 16.9927C4.09878 18.6139 5.38613 19.9012 7.00731 20.0306L7.32956 20.0563C8.16862 20.1233 8.96518 20.4532 9.60584 20.9992L9.85188 21.2089C11.0897 22.2637 12.9103 22.2637 14.1481 21.2089L14.3942 20.9992C15.0348 20.4532 15.8314 20.1233 16.6704 20.0563L16.9927 20.0306C18.6139 19.9012 19.9012 18.6139 20.0306 16.9927L20.0563 16.6704C20.1233 15.8314 20.4532 15.0348 20.9992 14.3942L21.2089 14.1481C22.2637 12.9103 22.2637 11.0897 21.2089 9.85188L20.9992 9.60584C20.4532 8.96518 20.1233 8.16862 20.0563 7.32956L20.0306 7.00731C19.9012 5.38613 18.6139 4.09878 16.9927 3.96941L16.6704 3.9437C15.8314 3.87674 15.0348 3.54679 14.3942 3.00083Z"/></svg></span>'
            : "") +
          (l.badges.includes("box")
            ? '<span class="complete-icon" role="img" tabindex="0" aria-label="Original box included" data-tip="Original box included">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.68924 2.43826L5.3538 4.21913C4.38173 4.96038 3.89569 5.33101 4.01879 5.6655C4.14189 6 4.76432 6 6.00918 6H16C16.3645 6 16.5467 6 16.7153 5.94363C16.8839 5.88726 17.0262 5.77875 17.3108 5.56174L19.6462 3.78087C20.6183 3.03962 21.1043 2.66899 20.9812 2.3345C20.8581 2 20.2357 2 18.9908 2H9C8.63555 2 8.45332 2 8.28472 2.05637C8.11612 2.11274 7.97383 2.22125 7.68924 2.43826Z"/><path d="M4.01879 21.666C4.14189 22.0005 4.76432 22.0005 6.00918 22.0005H16C16.3645 22.0005 16.5467 22.0005 16.7153 21.9441M4.01879 21.666C3.89569 21.3315 4.38173 20.9608 5.3538 20.2196L7.68924 18.4387C7.97383 18.2217 8.11612 18.1132 8.28472 18.0568M4.01879 21.666V5.66597M16.7153 21.9441C16.8839 21.8877 17.0262 21.7792 17.3108 21.5622L19.6462 19.7813C20.6183 19.0401 21.1043 18.6695 20.9812 18.335V2.33496M16.7153 21.9441V5.94409M8.28472 18.0568C8.45332 18.0005 8.63555 18.0005 9 18.0005H14M8.28472 18.0568V9.00046"/></svg></span>'
            : "") +
          (l.badges.includes("instructions")
            ? '<span class="complete-icon" role="img" tabindex="0" aria-label="Instructions included" data-tip="Instructions included">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.99988 4.98145H6C4.11438 4.98145 3.17157 4.98145 2.58579 5.56723C2 6.15302 2 7.09606 2 8.98213V15.8814C2 17.3811 2 18.1309 2.38151 18.6564C2.50511 18.8267 2.6548 18.9763 2.82505 19.0999C3.35059 19.4815 4.10006 19.4815 5.59901 19.4815H8.95053C10.433 19.4815 11.7093 20.5278 12 21.9815V6.98145C11.7072 6.591 11.5608 6.39578 11.401 6.22746C10.756 5.54809 9.89308 5.11663 8.96261 5.00829C8.73208 4.98145 8.48802 4.98145 7.99988 4.98145Z"/><path stroke-linecap="square" d="M12 6.98145V21.9815C12.2907 20.5278 13.5671 19.4815 15.0495 19.4815H18.401C19.8999 19.4815 20.6494 19.4815 21.1749 19.0999C21.3452 18.9763 21.4949 18.8267 21.6185 18.6564C22 18.1309 22 17.3811 22 15.8814V7.48198C22 7.01697 22 6.78446 21.9616 6.59127C21.8038 5.79789 21.1836 5.17769 20.3902 5.01988C20.197 4.98145 19.9647 4.98145 19.5 4.98145"/><path d="M12 7.48027C12 7.48027 12.7705 3.24271 17.0165 2.20672C17.829 2.00848 18.2353 1.90936 18.6176 2.20964C19 2.50993 19 3.00004 19 3.98027V14.4803C19 15.3489 19 15.7832 18.7865 16.0551C18.5729 16.327 18.0541 16.4536 17.0165 16.7067C12.7705 17.7427 12 21.9803 12 21.9803"/></svg></span>'
            : "") +
          "</div>"
        : "") +
      '<span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>' +
    "</div>" +
    '<div class="label"><div class="ln"><a class="nm" href="' + href + '" data-nav="lot" data-lot="' + id + '">' + esc(clean(l.toy)) + "</a></div>" +
      '<div class="meta">' + esc([clean(l.line), maker, l.year].filter(Boolean).join(" \u00b7 ")) + "</div>" +
      '<div class="auc-card"><div><span class="amt">' + money + '</span><span class="sub">' + sub + "</span></div></div>" +
    "</div></article>";
}
const openLots = lots.filter((l) => l.status === "live" || l.status === "preview");
const closedLots = lots.filter((l) => l.status === "sold" || l.status === "unsold");
const SHOP_SK = /(<div class="collection">\s*<!--[\s\S]*?-->)\s*(?:<div class="sk"[^>]*>[\s\S]*?<\/div><\/div>\s*)+/;
const SOLD_GRID = '<div class="collection" id="soldGrid"></div>';
function withShop(page, view) {
  if (view === "home" && openLots.length) {
    if (!SHOP_SK.test(page)) throw new Error("home: shop placeholders not found, cards not injected");
    page = page.replace(SHOP_SK, (m, head) => head + "\n" + openLots.map(staticCard).join("") + "\n");
  }
  if (view === "sold" && closedLots.length) {
    if (!page.includes(SOLD_GRID)) throw new Error("results: soldGrid not found, cards not injected");
    page = page.replace(SOLD_GRID, SOLD_GRID.replace("></div>", ">" + closedLots.map(staticCard).join("") + "</div>"));
  }
  if (MOLDER.has(view)) page = withMakerLots(page, view);
  return page;
}

// Each maker page links to that maker's lots in the shop (Ramon, 18 Oct 2026).
// Search Console said of the Jabba lot "no referring page": the lots were
// reachable from the home grid and the sitemap and from nowhere else, while
// /molders/kenner/ is exactly the page a Kenner collector lands on. Up to eight
// cards, then the rest as plain links, so every lot is reachable without the
// page carrying thirty-five photographs.
const MAKER_MATCH = {
  empire: /^kenner/i, tmnt: /playmates/i, ljn: /^ljn/i, galoob: /galoob/i,
  thinkway: /thinkway/i, hasbrowwf: /hasbro/i, kaiju: /marusan|bullmark|popy/i, imperial: /imperial/i,
  palitoy: /palitoy/i, dormei: /dor\s*mei/i, sofubi: /sofubi/i,
};
function withMakerLots(page, view) {
  const re = MAKER_MATCH[view];
  const mine = re ? openLots.filter((l) => l.status === "live" && re.test(String(l.maker || "")) && (view !== "hasbrowwf" || /\bwwf\b/i.test(String(l.toy || "")))) : [];
  if (!mine.length) return page;
  const start = page.indexOf('<main class="view" id="view-' + view + '"');
  if (start < 0) throw new Error(view + ": view not found for maker lots");
  const kr = page.indexOf('<div class="ey">Keep reading</div>', start);
  const end = page.indexOf("</main>", start);
  const at = (kr > 0 && kr < end) ? page.lastIndexOf("<section", kr) : end;
  const cards = mine.slice(0, 8).map(staticCard).join("");
  const rest = mine.slice(8).map((l) =>
    '<li><a href="/lot/' + encodeURIComponent(l.id) + '/" data-nav="lot" data-lot="' + esc(l.id) + '">' + esc(clean(l.toy)) + "</a></li>").join("");
  const html = '<section class="band maker-lots"><div class="wrap">' +
    '<div class="band-head"><div><div class="ey">' + esc(MOLDER_NAME[view] || "") + '</div><h2>In the shop now</h2></div></div>' +
    '<div class="collection">' + cards + "</div>" +
    (rest ? '<div class="terms-h">More in the shop</div><ul class="maker-more">' + rest + "</ul>" : "") +
    "</div></section>";
  return page.slice(0, at) + html + page.slice(at);
}

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

  out = withShop(out, view);

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
  const alts = alternatesFor(p);

  // The switch points at this page's own twin. Hard-coded in index.html it
  // said /nl/, which would drop a reader of the Kenner essay on the Dutch home
  // page and make them find their place again.
  out = out.replace(/<a class="lang-btn"[\s\S]*?<\/a>/, langMenu(p, null));

  // The home page is the one whose views are all still full, so the
  // fragments are cut from it, in every language, in the same pass.
  if (view === "home") writeFragments(out, "");
  if (writeEn) {
    fs.writeFileSync(target, stripViews(out, view).replace("</head>", alts + "</head>"));
    written++;
    report.push("  " + p.padEnd(22) + title.slice(0, 52));
  }

  // ---- and one sibling per language ----
  // Translated from the finished English page, so every rewrite above has
  // already happened and there is one place that decides what a page says.
  for (const L of LOCALES) {
    const u = localePage(L, out, p, { keep: view, fragments: view === "home", head: (x) => x.replace("</head>", alts + "</head>") });
    if (L.public) L.locs.push({ loc: u });
  }
}


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
// A lot's title and description are the seller's words about their own toy.
// They pass through the translator like everything else and come out
// unchanged, which is correct, but they are content and not interface and have
// no business on a worklist of strings somebody ought to translate.
const lotContent = new Set();
// The lot itself in the HTML, not only after JavaScript (Ramon, 18 Oct 2026).
// #lotBody was empty until the script drew it, so any crawler that reads HTML
// without running scripts (the AI search bots robots.txt invites in) saw a lot
// page with a title and nothing else. This is a plain summary in the same
// classes; the router replaces it with the live page the moment it runs.
const MOLDER_PATH = { empire: "/molders/kenner/", tmnt: "/molders/playmates/", ljn: "/molders/ljn/", galoob: "/molders/galoob/",
  hasbrowwf: "/molders/hasbro-wwf/", thinkway: "/molders/thinkway/", kaiju: "/molders/kaiju/", imperial: "/molders/imperial/",
  palitoy: "/molders/palitoy/", dormei: "/molders/dor-mei/", sofubi: "/molders/sofubi/" };
function lotMolder(l) {
  for (const [v, re] of Object.entries(MAKER_MATCH)) {
    if (!re.test(String(l.maker || ""))) continue;
    if (v === "hasbrowwf" && !/\bwwf\b/i.test(String(l.toy || ""))) continue;
    return v;
  }
  return null;
}
function staticLot(l) {
  const a = bidAgg[l.id] || { max: 0, count: 0 };
  const eur = (n) => "\u20ac " + Number(n).toLocaleString("nl-NL", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const fixed = l.sale_type === "fixed";
  const live = l.status === "live" || l.status === "preview";
  const bn = Number(l.buy_now) || 0, start = Number(l.starting_bid) || 0;
  const price = !live ? (l.status === "sold" ? ["Sold", ""] : ["Not for sale", ""])
    : fixed ? ["Price", eur(bn || start)]
    : (bn > 0 && !a.count && !(start > 0)) ? ["Buy now", eur(bn)]
    : ["Current bid", eur(a.count ? a.max : start)];
  const img = (Array.isArray(l.image_urls) ? l.image_urls : []).filter(Boolean)[0] || "";
  const maker = String(l.maker || "").split(/[(,]/)[0].trim();
  const mv = lotMolder(l);
  const row = (k, v) => v ? '<div class="row"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>" : "";
  const text = clean(l.blurb || l.notes);
  for (const x of [clean(l.toy), text, clean(l.condition), clean(l.completeness), clean(l.line), maker, String(l.year || "")]) { lotContent.add(x); lotContent.add(esc(x)); }
  return '<div class="lot-static">' +
    '<h1 class="art-title">' + esc(clean(l.toy)) + "</h1>" +
    (img ? '<img class="lot-img" src="' + esc(img) + '" alt="' + esc(clean(l.toy)) + '" loading="eager">' : "") +
    (text ? '<p style="font-family:var(--body);font-size:18px;max-width:46ch">' + esc(text) + "</p>" : "") +
    '<div class="spec">' +
      row("Maker", maker ? (mv ? '<a href="' + MOLDER_PATH[mv] + '">' + esc(maker) + "</a>" : esc(maker)) : "") +
      row("Released", esc(String(l.year || ""))) +
      row("Line", esc(clean(l.line))) +
      row("Condition", esc(clean(l.condition))) +
      row("Completeness", esc(clean(l.completeness))) +
      row(price[0], price[1]) +
    "</div>" +
  "</div>";
}
for (const l of lots) {
  if (!l || !l.id) continue;
  const path = "/lot/" + encodeURIComponent(l.id) + "/";
  const url = SITE + path;
  const title = uniqueTitle(l);
  const desc = lotDescription(l);
  lotContent.add(esc(title)); lotContent.add(esc(desc));
  lotContent.add(title); lotContent.add(desc);
  const hero = (Array.isArray(l.image_urls) ? l.image_urls : []).filter(Boolean)[0] || "";

  // A lot inherited the home page's alternates from index.html, which told a
  // crawler that the English version of this lot is the front page. Each lot
  // names its own pair.
  // One language for lots (Ramon, 15 Oct 2026: "we only have one language").
  // The lot's own text is English everywhere, so the nine language copies are
  // the same page under a translated menu. No hreflang pairs: they would tell
  // Google ten pages are translations of each other when they are one page.
  const alts = "";

  let out = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, "")
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
  out = out.replace("</head>", alts + '<script id="lotLd" type="application/ld+json">' +
    JSON.stringify(lotSchema(l, url)) + "</script></head>");

  if (!out.includes('href="' + esc(url) + '"')) throw new Error(l.id + ": canonical was not rewritten");
  if (!out.includes('<div id="lotBody"></div>')) throw new Error(l.id + ": #lotBody not found for the static lot");
  out = out.replace('<div id="lotBody"></div>', '<div id="lotBody">' + staticLot(l) + "</div>");

  const dir = "." + path;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.replace(/^\//, "") + "index.html", stripViews(out, null));
  lotLocs.push({ loc: url, status: l.status, lastmod: lotLastmod(l) });

  // One sibling per language. Without a file here GitHub Pages answers
  // 404.html, so a buyer who reloaded a lot or sent the link to someone got
  // the English front page with a 404 status attached to it.
  //
  // The lot's own words are the seller's and stay as written, by decision
  // rather than by omission. What gets translated is everything around them,
  // plus the one part of the description that is ours.
  for (const L of LOCALES) {
    const d = lotDescriptionIn(L, l);
    const u = localePage(L, out, path, {
      lastmod: lotLastmod(l),
      // The copy exists so a reader in that language can open and reload the
      // lot with their own menus; Google is pointed at the English original.
      canonicalUrl: url,
      head: (x) => (d
        ? x.replace(/(<meta name="description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
           .replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
           .replace(/(<meta name="twitter:description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
        : x),
    });
    // Not in the sitemap: only the 56 English lots are, so Google spends its
    // visits on the pages with their own content.
    void u;
  }
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

// ---------------------------------------------------------------------------
// Sellers.
//
// A seller's shop page had no file either, so it answered 404.html: it drew
// correctly for a person and was a 404 to everything else. That is the one
// page a seller would send to a buyer, and the only page on this site that
// says who the people selling on it are.
//
// Only sellers who have actually listed something. Three of the four rows in
// the table are test accounts with no lots, no bio and no location, and three
// near-empty profile pages is the thin-content verdict this site can least
// afford while twenty-five of its URLs are still undiscovered.
const sellerLocs = [];
{
  const sellers = await fetchSellers();
  const bySeller = new Map();
  for (const l of lots) {
    if (!l || !l.seller_id) continue;
    const arr = bySeller.get(l.seller_id) || [];
    arr.push(l);
    bySeller.set(l.seller_id, arr);
  }
  const listed = sellers.filter((p) => p && p.id && (bySeller.get(p.id) || []).length);

  for (const p of listed) {
    const mine = bySeller.get(p.id) || [];
    const sold = mine.filter((l) => l.status === "sold").length;
    const live = mine.filter((l) => l.status === "live" || l.status === "preview").length;
    const name = clean(p.display_name) || "Seller";
    const kind = /dealer|shop|trader/i.test(clean(p.type)) ? "dealer" : "collector";
    const path = "/seller/" + encodeURIComponent(p.id) + "/";
    const url = SITE + path;
    // The counts are a sentence like any other, so they come out of the
    // dictionary and a language that has not been translated yet simply keeps
    // the English description rather than growing a half-translated one.
    const facts = (L) => {
      const t = (en) => (L ? (L.dict[en] || L.js[en]) : en);
      const one = t("{n} lot for sale"), many = t("{n} lots for sale"), sld = t("{n} sold");
      if (!one || !many || !sld) return null;
      const bits = [];
      if (live) bits.push((live === 1 ? one : many).replace("{n}", live));
      if (sold) bits.push(sld.replace("{n}", sold));
      return bits.join(", ");
    };
    const bio = trim(clean(p.bio), 150);
    const where = clean(p.location);
    const desc = bio || [
      name + (where ? " in " + where : "") + " sells vintage toys at Hammer & Mold.",
      facts(null) ? facts(null) + "." : "",
    ].filter(Boolean).join(" ");
    const title = name + " \u00b7 " + (kind === "dealer" ? "Dealer" : "Seller") + " \u00b7 Hammer & Mold";

    const schema = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": kind === "dealer" ? "Organization" : "Person",
        name,
        url,
        ...(where ? { address: where } : {}),
        ...(clean(p.bio) ? { description: trim(clean(p.bio), 300) } : {}),
        ...(clean(p.logo_url) ? { image: clean(p.logo_url) } : {}),
      },
    };
    const alts = alternatesFor(path);

    const head = (t, d, canon) => html
      .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, "")
      .replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(t) + "</title>")
      .replace(/(<meta name="description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
      .replace(/(<link rel="canonical" href=")[^"]*(")/, "$1" + esc(canon) + "$2")
      .replace(/(<meta property="og:title" content=")[^"]*(")/, "$1" + esc(t) + "$2")
      .replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
      .replace(/(<meta property="og:url" content=")[^"]*(")/, "$1" + esc(canon) + "$2")
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/, "$1" + esc(t) + "$2")
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
      .replace("</head>", alts + '<script id="sellerLd" type="application/ld+json">' +
        JSON.stringify(schema) + "</script></head>");

    lotContent.add(esc(title)); lotContent.add(esc(desc));
    lotContent.add(title); lotContent.add(desc);
    let out = head(title, desc, url);
    if (clean(p.logo_url)) {
      out = out
        .replace(/(<meta property="og:image" content=")[^"]*(")/, "$1" + esc(clean(p.logo_url)) + "$2")
        .replace(/(<meta name="twitter:image" content=")[^"]*(")/, "$1" + esc(clean(p.logo_url)) + "$2");
    }
    if (!out.includes('href="' + esc(url) + '"')) throw new Error(p.id + ": seller canonical was not rewritten");
    fs.mkdirSync("." + path, { recursive: true });
    fs.writeFileSync(path.replace(/^\//, "") + "index.html", stripViews(out, null));

    // The page moves when the seller's own lots move, which is the only signal
    // we have for it, plus the day they joined.
    const dates = [p.created_at, ...mine.map(lotLastmod)].filter(Boolean).map(Date.parse).filter(isFinite);
    const lastmod = dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 19) + "+00:00" : null;
    sellerLocs.push({ loc: url, lastmod });

    for (const L of LOCALES) {
      const sellerWord = L.dict["Seller"] || L.js["Seller"];
      const f = facts(L);
      const t = sellerWord ? name + " \u00b7 " + sellerWord + " \u00b7 Hammer & Mold" : null;
      const d = bio || (f ? name + (where ? " in " + where : "") + " \u00b7 " + f + "." : null);
      const u = localePage(L, out, path, {
        lastmod,
        head: (x) => {
          if (t) x = x
            .replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(t) + "</title>")
            .replace(/(<meta property="og:title" content=")[^"]*(")/, "$1" + esc(t) + "$2")
            .replace(/(<meta name="twitter:title" content=")[^"]*(")/, "$1" + esc(t) + "$2");
          if (d) x = x
            .replace(/(<meta name="description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
            .replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + esc(d) + "$2")
            .replace(/(<meta name="twitter:description" content=")[^"]*(")/, "$1" + esc(d) + "$2");
          return x;
        },
      });
      if (L.public) sellerLocs.push({ loc: u, lastmod });
    }
  }

  if (sellerLocs.length) {
    fs.writeFileSync("sitemap-sellers.xml",
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      "<!-- Generated by build-pages.mjs at deploy. Do not edit, and do not commit. -->\n" +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      sellerLocs.map((x) =>
        "  <url>\n    <loc>" + x.loc + "</loc>\n" +
        (x.lastmod ? "    <lastmod>" + x.lastmod + "</lastmod>\n" : "") +
        "    <priority>0.5</priority>\n  </url>").join("\n") +
      "\n</urlset>\n");
  } else if (fs.existsSync("sitemap-sellers.xml")) fs.rmSync("sitemap-sellers.xml");
  console.log("sellers: " + sellerLocs.length + " pre-rendered of " + sellers.length +
    " profiles, " + (sellers.length - listed.length) + " skipped for having listed nothing");
}

// The app itself is the fallback for anything per-record that has no file:
// /seller/<id>, and a /lot/<id> that was published after the last deploy.
fs.writeFileSync("404.html", stripViews(html, null));

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
  //
  // The prefixes come from locales.json rather than being named here. They
  // were named here, as /nl/ alone, and every language added after Dutch went
  // on stacking: by the time French was written the tracked file carried 1,848
  // urls where it should have carried 105, because each build appended another
  // twenty-one per public language and stripped none of them. A list of
  // languages written twice will fall out of step, so it is written once.
  sm = sm.replace(
    new RegExp("\\n  <url>\\n    <loc>[^<]*/(?:" +
      LOCALES.map((L) => L.code).join("|") + ")/[^<]*</loc>[\\s\\S]*?</url>", "g"), "");
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
  // The translated pages, appended rather than hand-kept: they are generated,
  // so a person editing sitemap.xml should not have to remember them. A
  // language that is not public yet contributes nothing here, which is the
  // whole point of the flag.
  const extra = LOCALES.filter((L) => L.public).flatMap((L) => L.locs.map((x) => x.loc));
  if (extra.length) {
    const body = extra.map((u) =>
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

// ---- Coverage, per language, and the worklists ----
//
// The number that matters is the miss list, not the percentage: it is the
// Before anything is reported: does each dictionary speak the language it is
// for? Writing six languages in one sitting leaks: a Russian word ended up in
// the Chinese, a Spanish one in the Chinese, a Chinese character in the French,
// each of them a single token inside an otherwise correct sentence and each
// invisible to a coverage percentage, which only counts whether a key has a
// value. Latin letters are fine everywhere, because the brand, the makers and
// the model numbers are Latin in every language. A script that belongs to a
// different locale is not.
{
  const SCRIPTS = [
    ["Cyrillic", /[\u0400-\u04FF]/],
    ["Greek",    /[\u0370-\u03FF]/],
    ["Han",      /[\u3000-\u30FF\u4E00-\u9FFF]/],
    ["Arabic",   /[\u0600-\u06FF]/],
    ["Hangul",   /[\uAC00-\uD7AF]/],
  ];
  // What each locale is allowed to contain besides Latin. Japanese is on the
  // Han line with Chinese because the one test covers U+3000-30FF as well as
  // the unified ideographs, which is kana and kanji together: a Japanese
  // sentence is all three scripts at once and there is no useful way to split
  // them here. The check that matters for ja is the one it still makes, that
  // no Cyrillic, Greek, Arabic or Hangul has leaked in from a neighbour.
  const ALLOWED = { zh: ["Han"], ja: ["Han"], ar: ["Arabic"] };
  const wrong = [];
  for (const L of LOCALES) {
    const ok = ALLOWED[L.code] || [];
    for (const [where, dict] of [["", L.dict], ["-js", L.js]]) {
      for (const [k, v] of Object.entries(dict)) {
        // An entry that is its own translation cannot be a leak from the
        // previous language: it is the same word in both. That is how every
        // dictionary legitimately carries العربية and 繁體中文, because the
        // language menu names each language in its own script.
        if (k.startsWith("_") || typeof v !== "string" || v === k) continue;
        for (const [name, re] of SCRIPTS) {
          if (ok.includes(name) || !re.test(v)) continue;
          wrong.push("  i18n/" + L.code + where + ".json  " + name + " in a " + L.english +
            " value\n    key:   " + JSON.stringify(k.slice(0, 60)) +
            "\n    value: " + JSON.stringify(v.slice(0, 60)));
        }
      }
    }
  }
  if (wrong.length) {
    throw new Error("a dictionary carries the wrong script:\n" + wrong.join("\n") +
      "\nThese are almost always a word left behind from the previous language.");
  }
}

// exact set of sentences still to write, in document order, so translating is
// a file to work through rather than a site to read. One file per language,
// because a worklist shared between six of them is nobody's worklist.
{
  const stamp = new Date().toISOString().slice(0, 10);
  fs.mkdirSync("i18n", { recursive: true });

  for (const L of LOCALES) {
    const total = L.stats.hit + L.stats.miss;
    const pct = total ? Math.round((L.stats.hit / total) * 100) : 0;
    const missed = [...L.stats.missed].filter((k) => !lotContent.has(k) && !cardContent.has(k));
    const file = "i18n/untranslated-" + L.code + ".txt";
    if (missed.length) {
      fs.writeFileSync(file,
        "# " + missed.length + " strings with no " + L.english + " entry, as at " + stamp + ".\n" +
        "# Copy a line into i18n/" + L.code + ".json as the key, with the " + L.english + " as its value.\n" +
        "# A string that stops appearing here is either translated or no longer on the site.\n\n" +
        missed.join("\n") + "\n");
    } else if (fs.existsSync(file)) fs.rmSync(file);

    // An entry nothing ever looked up is dead weight: either the English was
    // rewritten and the key stopped matching, or the string lives in
    // JavaScript and this pass cannot reach it. Both are worth knowing.
    const stale = Object.keys(L.dict).filter((k) => !k.startsWith("_") && !L.stats.seen.has(k));
    const sfile = "i18n/unused-" + L.code + ".txt";
    if (stale.length) {
      fs.writeFileSync(sfile,
        "# " + stale.length + " " + L.english + " entries that no page looked up, as at " + stamp + ".\n" +
        "# Either the English changed, or the string is built in JavaScript and\n" +
        "# the markup pass cannot see it. Neither is an error; both are worth a look.\n\n" +
        stale.join("\n") + "\n");
    } else if (fs.existsSync(sfile)) fs.rmSync(sfile);

    console.log(L.code + ": " + L.written + " pages, " + pct + "% of " + total +
      " strings, " + missed.length + " left" + (L.public ? "" : "  (not public yet)"));
  }

  // The runtime half is measured against English, once: the same set of
  // strings is open in every language that has not had them written yet, so
  // six copies of the same list would say nothing six times.
  const en = LOCALES[0];
  const covered = new Set([
    ...Object.keys(en.runtime),
    ...Object.keys(en.dict).map((k) => decodeEntities(k).replace(/\s+/g, " ").trim()),
    ...Object.keys(en.js).map((k) => decodeEntities(k).replace(/\s+/g, " ").trim()),
  ]);
  const jsOpen = [], jsFrag = [];
  for (const raw of JS_LITERALS) {
    if (raw !== decodeEntities(raw)) continue;
    const k = raw.replace(/\s+/g, " ").trim();
    if (!k || k.length < 3 || k.length > 700) continue;
    if (covered.has(k)) continue;
    if (/[<>{}$"=_\\]/.test(k) || /[\/@*]/.test(k)) continue;
    if (/^[,?:;)%\]#[(.-]/.test(k)) continue;
    if (!/[a-z]{2}/.test(k)) continue;
    if (/^[a-z]/.test(k) && !/ /.test(k)) continue;
    if (/^[A-Z][a-z]+[A-Z]/.test(k) && !/ /.test(k)) continue;
    if (/,\S/.test(k) || /^\d/.test(k)) continue;
    if (/^[a-z][a-z-]*( [a-z][a-z-]*)*$/.test(k) && k.length < 26) continue;
    (/^\s|\s$/.test(raw) ? jsFrag : jsOpen).push(raw);
  }
  const write = (file, head, rows) => {
    if (!rows.length) { if (fs.existsSync(file)) fs.rmSync(file); return; }
    rows.sort((a, b) => a.localeCompare(b));
    fs.writeFileSync(file, head + "\n\n" + rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  };
  write("i18n/js-untranslated.txt",
    "# " + jsOpen.length + " strings the application draws that have no entry, as at " + stamp + ".\n" +
    "# Copy one into i18n/<lang>-js.json as the key. Keys there are rendered text:\n" +
    "# a real & and \u00b7, no HTML entities, because that is what the observer sees.",
    jsOpen);
  write("i18n/js-fragments.txt",
    "# " + jsFrag.length + " fragments the application glues to data at runtime.\n" +
    "# These never exist as one text node, so no dictionary entry can reach them.\n" +
    "# Translating one means rewriting its call site to emit a whole sentence\n" +
    "# through phrase(), which is what was done to the rest of them.\n" +
    "#\n" +
    "# What is left here is not a backlog. A title suffix whose whole title is\n" +
    "# already a dictionary key, an Authorization header, and a console.warn\n" +
    "# addressed to whoever is running the migration. None of the three is text\n" +
    "# a buyer ever sees.",
    jsFrag);

  // A phrase() the dictionary has never heard of is silent at runtime: it
  // formats the English and carries on. Loud here instead, but only for a
  // language that is public, because an empty dictionary is not a bug.
  for (const L of LOCALES.filter((x) => x.public)) {
    const miss = [...phraseKeys(rawHtml)].filter((k) => {
      const d = decodeEntities(k).replace(/\s+/g, " ").trim();
      return !(k in L.js) && !(d in L.runtime) && !(d in L.dict);
    });
    if (miss.length) throw new Error(
      "phrase() keys with no " + L.english + " entry, add them to i18n/" + L.code + "-js.json:\n  " +
      miss.sort().map((k) => JSON.stringify(k)).join("\n  "));
  }

  console.log("i18n: " + phraseKeys(rawHtml).size + " phrase() keys, " +
    jsOpen.length + " js strings open, " + jsFrag.length + " fragments at call sites");
}

console.log("pre-rendered " + written + " pages, plus 404.html");
console.log(report.join("\n"));
