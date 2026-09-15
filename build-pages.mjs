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

const SKIP = new Set(["lot", "seller", "account", "home", "checkout"]);

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
  let out = html
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
  if (path.resolve(target) === path.resolve(SRC)) throw new Error("refusing to write over the source: " + view);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, out);
  written++;
  report.push("  " + p.padEnd(22) + title.slice(0, 52));
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

async function fetchLots() {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("could not read SUPA_URL/SUPA_KEY out of index.html");
  // Everything a buyer could land on. Drafts are nobody's business, and a sold
  // lot is the archive: "what did this actually fetch" is a real search and the
  // answer is a page we already own.
  const url = SUPA_URL + "/rest/v1/lots?select=" + LOT_COLS +
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
  lotLocs.push({ loc: url, status: l.status });
}

// A second sitemap rather than appending to the hand-kept one, because these
// come and go with the auctions and that file is written by a person. Declared
// in robots.txt, so it is found without anybody having to submit it.
if (lotLocs.length) {
  const body = lotLocs.map((x) =>
    "  <url>\n    <loc>" + x.loc + "</loc>\n    <changefreq>" +
    (x.status === "sold" || x.status === "unsold" ? "monthly" : "daily") +
    "</changefreq>\n    <priority>" + (x.status === "sold" || x.status === "unsold" ? "0.4" : "0.7") +
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
