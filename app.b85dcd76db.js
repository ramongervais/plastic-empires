
  // A sentence built out of fragments and numbers never exists as one text
  // node, so the Dutch translator that watches the document cannot see it:
  // it matches whole nodes, which is the rule that stops it rewriting a lot
  // title that happens to contain an English word. So write the sentence
  // whole, with {placeholders}, translate it, and fill the numbers in after.
  // On the English site __NL__ is absent and this is a plain format call.
  //
  // In the head, and not in the main script block, because the page has more
  // than one: the Retrobrighting carousel runs first and called this before
  // the block that defined it had been reached.
  function phrase(s, vals){
    const D = window.__NL__;
    if (D && D[s] !== undefined) s = D[s];
    return s.replace(/\{(\w+)\}/g, (_, k) => (vals && vals[k] != null ? vals[k] : ''));
  }
  // Dates follow the dictionary too. Seven calls were hard-wired to en-GB,
  // which put "10 Oct 2026" in the middle of a Dutch sentence.
  const LOC = () => (window.__NL__ ? 'nl-NL' : 'en-GB');

;

    // One index, two columns, different lengths. "Next" moves the comparison
    // rather than one picture, so the pairing the order was built around holds.
    (function(){
      var sec = document.getElementById('rb-evidence');
      if (!sec) return;
      // One piece per .rb-piece, and each keeps its own index. With a single
      // shared one, adding a second toy would make its before column step in
      // time with the first car's after column, which is nonsense.
      [].forEach.call(sec.querySelectorAll('.rb-piece'), function(piece){ wire(piece); });

      function wire(sec){
      var cols = [].map.call(sec.querySelectorAll('[data-rb-frame]'), function(f){
        var side = f.getAttribute('data-rb-frame');
        return {
          imgs:  [].slice.call(f.querySelectorAll('img')),
          dots:  sec.querySelector('[data-rb-dots="' + side + '"]'),
          count: sec.querySelector('[data-rb-count="' + side + '"]')
        };
      });
      if (!cols.length) return;
      var idx = 0;

      cols.forEach(function(c){
        c.imgs.forEach(function(_, k){
          var b = document.createElement('button');
          b.className = 'rb-dot' + (k === 0 ? ' on' : '');
          b.type = 'button';
          b.setAttribute('aria-label', phrase('Photograph {n} of {total}', { n: k + 1, total: c.imgs.length }));
          b.addEventListener('click', function(){ idx = k; paint(); go(); });
          c.dots.appendChild(b);
        });
      });

      function paint(){
        cols.forEach(function(c){
          var at = ((idx % c.imgs.length) + c.imgs.length) % c.imgs.length;
          c.imgs.forEach(function(im, k){ im.classList.toggle('on', k === at); });
          [].forEach.call(c.dots.children, function(d, k){ d.classList.toggle('on', k === at); });
          c.count.textContent = (at + 1) + ' / ' + c.imgs.length;
        });
      }

      [].forEach.call(sec.querySelectorAll('[data-rb-step]'), function(b){
        b.addEventListener('click', function(){
          idx += Number(b.getAttribute('data-rb-step'));
          paint(); go();
        });
      });

      // A reader who has turned motion off gets the arrows and no carousel.
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var timer = null;
      function stop(){ if (timer){ clearInterval(timer); timer = null; } }
      function go(){
        stop();
        if (still) return;
        // Nothing ticks for a tab nobody is looking at. It costs nothing on a
        // DOM-only carousel, and it is the habit worth keeping.
        if (document.visibilityState === 'hidden') return;
        timer = setInterval(function(){ idx++; paint(); }, 3000);
      }

      sec.addEventListener('mouseenter', stop);
      sec.addEventListener('mouseleave', go);
      sec.addEventListener('focusin', stop);
      sec.addEventListener('focusout', go);
      document.addEventListener('visibilitychange', go);
      go();
      }
    })();
  
;

  const COMMERCIAL = "https://www.youtube.com/watch?v=GVmwlCIPsgU";
  const SUPA_URL = 'https://yazoeshmplhmxefnovjy.supabase.co';
  const SUPA_KEY = 'sb_publishable_DgOPyLmmdXZLrArt8SFaIg_Tcibqvw-';
  // Read before createClient, synchronously. Supabase clears the token out of
  // the address bar the moment it has consumed it, and after that a sign-in
  // that just happened is indistinguishable from a session restored out of
  // storage. The first person to make an account here opened the link, landed
  // on the lot page he had asked from, and was told nothing at all.
  const ARRIVED_BY_LINK = /[#&]access_token=|[#&]error_code=/.test(location.hash || '') ||
    /[?&]code=/.test(location.search || '');
  // A link that has been opened once, or is over an hour old, comes back
  // carrying an error instead of a token. There is no SIGNED_IN event for that,
  // so without reading it here the page simply loads and says nothing, which is
  // the same silence the confirmation above exists to end.
  const AUTH_URL_ERROR = (function(){
    const h = (location.hash || '').replace(/^#/, '') + '&' + (location.search || '').replace(/^\?/, '');
    const p = new URLSearchParams(h);
    const code = p.get('error_code') || p.get('error');
    if (!code) return null;
    return { code: code, text: p.get('error_description') || '' };
  })();
  const SB = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(SUPA_URL, SUPA_KEY) : null;
  let authUser = null;
  // Every column of a lot except the two that belong to the buyer. select('*')
  // used to be fine and is not: the address rode along with it to anyone
  // holding the anon key, which is everyone, because it is in this file. The
  // database now refuses those two columns and this list is the other side of
  // that, so a query asks for what it is allowed rather than finding out.
  // ship_to and tracking come from the lot_private() function instead, which
  // checks who is asking.
  // 'reserve' is deliberately absent. It was readable by anyone holding the
  // publishable key, which makes a hidden reserve a published one: read the
  // number, bid exactly that, win on the floor. Same shape as the ship_to leak
  // in September. The page only ever needed "is there one" and "is it met",
  // and reserveState() asks the database for exactly those two booleans.
  const LOT_COLS_PUBLIC = 'auction_days,blurb,buy_now,buyer_id,care_level,care_note,closed_at,completeness,condition,confidence,created_at,delivered_at,ends_at,estimate_high,estimate_low,extended,id,image_urls,letterbox,line,maker,notes,sale_type,seller_id,service_point,shipped_at,shipping_eur,shipping_nl_eur,shipping_row_eur,size_class,stamp_shown,starting_bid,status,toy,variants,weight_kg,year,withdrawn_at';

  // Booleans only, any number of lots at once. Returns an empty map rather than
  // throwing when the function is not there yet, so this ships before the
  // migration runs instead of depending on it.
  async function reserveState(ids){
    const out = {};
    if (!SB || !ids || !ids.length) return out;
    try {
      const { data, error } = await SB.rpc('lots_reserve_state', { p_ids: ids });
      if (error || !data) return out;
      data.forEach(function(r){ out[r.lot_id] = { has: r.has_reserve === true, met: r.reserve_met === true }; });
    } catch (e) { /* pre-migration, or offline: the page renders without the note */ }
    return out;
  }

  const LAUNCH_TS = Date.parse('2026-09-26T12:00:00+02:00'); // launched 26 September 2026, brought forward from 1 October so the first
  // live weekend had somebody watching it
  const preLaunch = () => Date.now() < LAUNCH_TS;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- Starfields (subtle, for Star Wars vitrines + the film) -----
  function starfield(canvas, density, warm){
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.width = Math.max(2, box.width) * dpr;
    const h = canvas.height = Math.max(2, box.height) * dpr;
    const ctx = canvas.getContext("2d");
    const n = Math.round((w * h) / (dpr*dpr) / density);
    for (let i=0;i<n;i++){
      const x = Math.random()*w, y = Math.random()*h;
      const r = Math.random()*1.3*dpr + .2*dpr;
      const a = Math.random()*0.5 + 0.15;
      ctx.beginPath(); ctx.arc(x,y,r,0,7);
      ctx.fillStyle = warm ? `rgba(240,240,240,${a})` : `rgba(150,150,150,${a})`;
      ctx.fill();
    }
  }
  function paintStars(){
    document.querySelectorAll('.vitrine[data-stars] ').forEach(v => {
      if (v.querySelector('canvas.stars')) return;
      const c = document.createElement('canvas'); c.className='stars';
      v.insertBefore(c, v.firstChild); starfield(c, 900, false);
    });
    document.querySelectorAll('.film canvas.stars').forEach(film => {
      if (film.dataset.done) return;
      const box = film.getBoundingClientRect();
      if (box.width < 4) return;               // skip hidden views; repainted on show()
      starfield(film, 700, true); film.dataset.done = "1";
    });
  }

  // ----- View router -----
  const views = { home: document.getElementById('view-home'), empire: document.getElementById('view-empire'), tmnt: document.getElementById('view-tmnt'), ljn: document.getElementById('view-ljn'), galoob: document.getElementById('view-galoob'), thinkway: document.getElementById('view-thinkway'), kaiju: document.getElementById('view-kaiju'), imperial: document.getElementById('view-imperial'), palitoy: document.getElementById('view-palitoy'), dormei: document.getElementById('view-dormei'), sofubi: document.getElementById('view-sofubi'), retrobright: document.getElementById('view-retrobright'), moulds: document.getElementById('view-moulds'), about: document.getElementById('view-about'), sell: document.getElementById('view-sell'), seller: document.getElementById('view-seller'), terms: document.getElementById('view-terms'), help: document.getElementById('view-help'), privacy: document.getElementById('view-privacy'), lot: document.getElementById('view-lot'), sold: document.getElementById('view-sold'), account: document.getElementById('view-account'), plans: document.getElementById('view-plans'), buy: document.getElementById('view-buy'), checkout: document.getElementById('view-checkout') };
  // ---- Paths ----
  // Every view had the same URL, hammerandmold.com/, because nothing ever wrote
  // to the address bar. Three things were broken by that and only one of them is
  // analytics: no lot could be linked to a friend, Google saw a single page, and
  // any measurement tool would have reported one pageview per visit with nothing
  // to compare. One path per view fixes all three at once.
  const PATHS = {
    home: '/', about: '/about', sell: '/sell', plans: '/packages', buy: '/we-buy',
    sold: '/results', account: '/account', terms: '/terms', privacy: '/privacy',
    help: '/help',
    empire: '/molders/kenner', tmnt: '/molders/playmates', ljn: '/molders/ljn',
    galoob: '/molders/galoob', thinkway: '/molders/thinkway',
    kaiju: '/molders/kaiju', imperial: '/molders/imperial',
    palitoy: '/molders/palitoy',
    dormei: '/molders/dor-mei',
    sofubi: '/molders/sofubi',
    retrobright: '/retrobrighting',
    moulds: '/moulds',
    lot: '/lot', seller: '/seller',
    checkout: '/checkout',
  };
  const VIEW_BY_PATH = Object.keys(PATHS).reduce((m, k) => { m[PATHS[k]] = k; return m; }, {});

  // The Dutch site is this same application under /nl/, so the router has to
  // know about the prefix or none of it adds up: /nl/terms matched nothing in
  // the table, routeFromPath returned false, and the caller treated it as an
  // unknown path and showed the home view. Every Dutch page except the home
  // page replaced itself with the home page the moment JavaScript booted.
  //
  // Read off the lang attribute rather than the URL, because that attribute is
  // what the build stamped on this file and so it cannot drift from it.
  // Every language the site is built in. The build checks this against
  // i18n/locales.json and refuses to run if the two have drifted, because a
  // router that does not know about a language sends its readers to the home
  // page and nothing else goes wrong loudly enough to notice.
  const LOCALE_CODES = ['nl', 'de', 'fr', 'es', 'it', 'ar'];
  const LANG_PREFIX = LOCALE_CODES.indexOf(document.documentElement.lang) >= 0
    ? '/' + document.documentElement.lang : '';

  // ---- What each path tells a crawler and a share preview ----
  // The head was one title, one description and one canonical for the entire
  // site, hardcoded and never touched. Correct for a one-page site, wrong for a
  // site pretending to be many: Google indexed a single page with everything on
  // it, so a search for "Thinkway Toy Story" could never reach the Thinkway page
  // because there was no Thinkway page. And every share preview looked identical
  // whatever you shared, because og:url and og:title never moved off the home
  // page. This is the part that made the SEO work do nothing.
  const META = {
    home:      ['Hammer & Mold \u00b7 Know the toy. Then own it.', 'Auction house for original vintage toys. Kenner Star Wars, The Real Ghostbusters and Japanese kaiju, each one identified, graded and told.'],
    about:     ['About \u00b7 Hammer & Mold', 'A private collection that grew into an auction house. What we hunt for, and why we prefer the toys that were actually played with.'],
    sell:      ['Sell your vintage toys \u00b7 Hammer & Mold', 'Photograph a toy and our AI identifies it, dates the line, grades the condition and researches what it really sells for. Identification is free and unlimited.'],
    plans:     ['Selling packages \u00b7 Hammer & Mold', 'Three packages for sellers, priced so the one that matches what you sell is always the cheapest. Starter is free. Work out which one fits your volume.'],
    buy:       ['We buy vintage toy collections \u00b7 Hammer & Mold', 'Skip the auction and take the money today. Send photographs of a collection and we make one offer for the lot, with the reasoning attached.'],
    sold:      ['Past results \u00b7 Hammer & Mold', 'What vintage toys actually sold for at Hammer & Mold. Every closed lot with its final price.'],
    help:      ['Help \u00b7 Hammer & Mold', 'Shipping, import duty, bidding, payment and returns, answered plainly.'],
    terms:     ['Terms \u00b7 Hammer & Mold', 'Terms of sale for buyers and sellers: commission, packages, shipping, risk in transit and returns.'],
    privacy:   ['Privacy \u00b7 Hammer & Mold', 'What we collect, why, and what we do not do. No advertising trackers and no profiling.'],
    account:   ['Your account \u00b7 Hammer & Mold', 'Your lots, bids, wins and seller package.'],
    empire:    ['Kenner \u00b7 The Molders \u00b7 Hammer & Mold', 'Named after a street in Cincinnati. Kenner made Star Wars 1977 to 1985 and The Real Ghostbusters, and shaped the shelves of nearly every toy shop in the West.'],
    tmnt:      ['Playmates \u00b7 The Molders \u00b7 Hammer & Mold', 'Playmates and the Teenage Mutant Ninja Turtles, 1988 to 1997: the line that turned a black-and-white comic into the biggest toy aisle of the decade.'],
    ljn:       ['LJN \u00b7 The Molders \u00b7 Hammer & Mold', 'LJN and E.T. the Extra-Terrestrial, 1982. The story of a licence nobody wanted and the toys it produced.'],
    galoob:    ['Galoob \u00b7 The Molders \u00b7 Hammer & Mold', 'Galoob and The A-Team, 1983 to 1984, plus Micro Machines: small scale, large ambition.'],
    thinkway:  ['Thinkway Toys \u00b7 The Molders \u00b7 Hammer & Mold', 'Mattel passed. Hasbro passed. Thinkway said yes, and got the master toy licence for Toy Story with months to make it happen.'],
    kaiju:     ['Marusan, Bullmark and Popy \u00b7 The Molders \u00b7 Hammer & Mold', 'Tokyo soft-vinyl kaiju, 1966 to 1984: the Godzilla and Ultraman monsters of the tokusatsu boom.'],
    imperial:  ['Imperial Toy Corp \u00b7 The Molders \u00b7 Hammer & Mold', 'Imperial and the licensed and unlicensed monsters of the 1970s and 80s, and how to tell one from the other.'],
    checkout:  ['Checkout \u00b7 Hammer & Mold', 'Delivery address and postage before payment.'],
    palitoy:   ['Palitoy \u00b7 The Molders \u00b7 Hammer & Mold', 'The British company that inherited Star Wars through a corporate structure, and whose most coveted playset is made of cardboard because plastic was too expensive.'],
    dormei:    ['Dor Mei \u00b7 The Molders \u00b7 Hammer & Mold', 'The Hong Kong maker of unlicensed Godzillas. No company record, the wrong dorsal plates, and a 1986 date moulded into the sole that corrects the only encyclopaedia covering them.'],
    sofubi:    ['Sofubi \u00b7 The Molders \u00b7 Hammer & Mold', 'What sofubi actually is: hollow Japanese soft vinyl, slush-cast by hand and sprayed by hand. And Hiroshi Goto, who has been colouring it in a Tokyo shed for seventy years.'],
    retrobright: ['Retrobrighting \u00b7 Why vintage plastic turns yellow \u00b7 Hammer & Mold', 'What actually yellows a white toy: butadiene oxidation, the brominated flame retardants that accelerate it, and the sebum off your hands. With the 3% and 12% hydrogen peroxide formulas, the UV protection step afterwards, and the rules we work to.'],
    moulds:    ['Moulds \u00b7 How a toy is made \u00b7 Hammer & Mold', 'Injection, rotocast, blow moulded, vacuum formed and die-cast, and how to tell from the toy in your hand which one made it. The seam, the gate dot, the ejector circles and the stamp.'],
    lot:       ['', ''],   // written from the lot itself
    seller:    ['', ''],
  };

  const setTag = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
  function setMeta(view, path, title, desc){
    const m = META[view] || META.home;
    const t = title || m[0] || META.home[0];
    const d = desc || m[1] || META.home[1];
    const url = 'https://hammerandmold.com' + (path || '/');
    document.title = t;
    setTag('meta[name="description"]', 'content', d);
    setTag('link[rel="canonical"]', 'href', url);
    setTag('meta[property="og:title"]', 'content', t);
    setTag('meta[property="og:description"]', 'content', d);
    setTag('meta[property="og:url"]', 'content', url);
    setTag('meta[name="twitter:title"]', 'content', t);
    setTag('meta[name="twitter:description"]', 'content', d);
    // A Product schema left behind on the terms page is a false statement to a
    // crawler, so it goes when the lot does.
    if (view !== 'lot'){ const st = document.getElementById('lotLd'); if (st) st.remove(); }
  }

  // ---- Pageview ----
  // One hook, so a dashboard can be added without touching the router again.
  // Cloudflare Web Analytics reads the address bar by itself, so it needs nothing
  // here; this is for our own first-party record, where the conversion questions
  // live.
  // ---- Our own events ----
  // Cloudflare counts pageviews. This answers what it cannot: of the people who
  // looked at a lot, how many bid, how many reached checkout, how many paid.
  //
  // What is deliberately not sent: no IP, no user agent, no fingerprint, no
  // cookie. The session id lives in sessionStorage, so it dies with the tab and
  // cannot follow anyone between visits. It exists only to join "viewed a lot" to
  // "placed a bid" inside one visit, which is the whole of what a funnel needs,
  // and it is the reason the site still needs no consent banner.
  //
  // Fire and forget, never awaited, and every failure is swallowed. A counter that
  // can break a bid is worse than no counter.
  const SESSION = (() => {
    try {
      let v = sessionStorage.getItem('hm_s');
      if (!v){
        v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now().toString(36)).slice(0, 24);
        sessionStorage.setItem('hm_s', v);
      }
      return v;
    } catch (e) { return null; }   // private mode, or storage refused
  })();

  // The referrer reduced to a hostname before it leaves the browser. A full
  // referring URL can carry someone's search query, and we have no reason to hold
  // that. Our own paths are dropped: internal navigation is not a source.
  const REFERRER = (() => {
    try {
      const r = document.referrer;
      if (!r) return '';
      const h = new URL(r).hostname.replace(/^www\./, '');
      return h === location.hostname.replace(/^www\./, '') ? '' : h;
    } catch (e) { return ''; }
  })();

  // Where a paid click came from, read before anything else touches the address
  // bar. setPath calls history.pushState with the pathname only, so ?utm_source
  // is gone by the time the first pageview is recorded, and a campaign we paid
  // for would arrive looking like direct traffic. Marktplaats and most ad
  // platforms route the click through a redirect that strips the referrer too,
  // so the tag is often the only source there is. Read once, here, at parse
  // time, and carried on the first event next to the referrer.
  const CAMPAIGN = (() => {
    try {
      const q = new URLSearchParams(location.search);
      const out = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
        const v = q.get(k);
        if (v) out[k.slice(4)] = String(v).slice(0, 64);
      });
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  })();

  let firstEvent = true;
  function track(name, meta, subject){
    if (!SB || !SESSION) return;
    try {
      const m = Object.assign({}, meta || {});
      // Sent once per visit, so the source is recorded without repeating it on
      // every event.
      if (firstEvent && (REFERRER || CAMPAIGN)){
        if (REFERRER) m.ref = REFERRER;
        if (CAMPAIGN) Object.assign(m, CAMPAIGN);
        firstEvent = false;
      }
      const row = {
        name: name,
        session: SESSION,
        path: (m.path || location.pathname || '/').slice(0, 300),
        subject: subject ? String(subject).slice(0, 64) : null,
        meta: Object.keys(m).length ? m : null,
        user_id: (authUser && authUser.id) || null,
      };
      delete row.meta?.path;   // already its own column
      SB.from('events').insert(row).then(() => {}, () => {});
    } catch (e) {}
  }

  function pageview(path){ track('pageview', { path: path }); }

  // Written to the address bar without reloading, and recorded as a pageview.
  // `extra` carries the id for a lot or a seller so the path identifies the thing
  // and not just the kind of thing.
  // GitHub Pages serves a directory path only at its trailing-slash form: a
  // request for /about is answered with a 301 to /about/. So /about was never a
  // page, it was a redirect, and until now it was the form written into the
  // canonical, the sitemap and the address bar. Search Console reported the
  // result exactly: eleven URLs discovered and never crawled, five filed as
  // "page with redirect", and the slash forms indexed alongside them as
  // duplicates. The canonical has to name the URL that answers 200.
  const canonPath = (p) => (p === '/' || p.endsWith('/')) ? p : p + '/';

  function setPath(view, extra){
    const base = PATHS[view] || '/';
    // A lot now has a real directory behind it, pre-rendered at deploy, so it
    // answers 200 at its trailing-slash form like everything else. The address
    // bar has to write that form or the router would quietly replace the
    // canonical the crawler was served with one that redirects.
    const path = LANG_PREFIX + canonPath(extra ? base + '/' + encodeURIComponent(extra) : base);
    if (location.pathname !== path) history.pushState({ view: view, extra: extra || null }, '', path);
    setMeta(view, path);
    pageview(path);
  }

  // Every page's main header arrives the way a terminal prints it.
  //
  // Once per view rather than once per session: each page gets its greeting the
  // first time you reach it, and never again while you navigate back and forth,
  // because a greeting repeated on every return is a stutter.
  //
  // Anyone who has asked for less motion gets the finished sentence at once,
  // which is what `reduce` already governs for scrolling.
  const titlesTyped = new Set();
  function typeTitle(root, key){
    if (titlesTyped.has(key)) return;
    titlesTyped.add(key);
    const h = root.querySelector('.empire-title, .hero h1');
    if (!h || reduce) return;

    // The home title carries a <br> inside the sentence. Reading textContent
    // would flatten it to "Know the toy.Then own it", so the break survives as a
    // sentinel through a real parse, which also decodes the entities, and the
    // block is set pre-wrap to honour it. Each line is collapsed on its own so
    // the source file's indentation never reaches the screen.
    const tmp = document.createElement('div');
    tmp.innerHTML = h.innerHTML.replace(/<br\s*\/?>/gi, '\uE000');
    const text = tmp.textContent.split('\uE000')
      .map(part => part.replace(/\s+/g, ' ').trim()).join('\n').trim();
    if (!text) return;

    h.setAttribute('aria-label', text.replace(/\n/g, ' '));
    h.classList.add('typer');
    h.textContent = '';

    const ghost = document.createElement('span');
    ghost.className = 'tg';
    ghost.textContent = text;

    const out = document.createElement('span');
    out.className = 'to';
    out.setAttribute('aria-hidden', 'true');
    const written = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'tc';
    out.append(written, caret);
    h.append(ghost, out);

    let i = 0;
    (function step(){
      if (i >= text.length) { caret.classList.add('blink'); return; }
      const ch = text[i++];
      written.textContent = text.slice(0, i);
      // A full stop is a beat, a line break a longer one, a space half. Even
      // keystrokes read as a machine filling a field; the pauses are what make
      // it read as typing.
      setTimeout(step, ch === '.' ? 300 : ch === '\n' ? 220 : ch === ' ' ? 74 : 40);
    })();
  }

  function show(view, opts){
    const v = views[view] ? view : 'home';
    Object.keys(views).forEach(k => views[k].hidden = k !== v);
    const root = views[v];
    root.querySelectorAll('.vitrine canvas.stars').forEach(c => c.remove());
    root.querySelectorAll('.film canvas.stars').forEach(c => c.dataset.done = '');
    window.scrollTo({ top:0, behavior: reduce ? 'auto':'smooth' });
    requestAnimationFrame(paintStars);
    typeTitle(root, v);
    if (v === 'sell' && typeof refreshSellTokens === 'function') refreshSellTokens();
    if (v === 'sell' && typeof renderPlans === 'function') renderPlans();
    if (v === 'plans' && typeof renderPlans === 'function') renderPlans();
    // Skipped when the browser drove the change, or Back would push a new entry
    // on top of the one it just came from and the button would stop working.
    if (!opts || !opts.fromHistory) setPath(v, opts && opts.extra);
  }

  // Back and forward. Without this the browser buttons leave the address bar on
  // one view and the page on another.
  window.addEventListener('popstate', ev => {
    const st = ev.state;
    if (st && st.view){ routeTo(st.view, st.extra, true); return; }
    routeFromPath(true);
  });

  function routeTo(view, extra, fromHistory){
    if (view === 'lot' && extra && typeof openLot === 'function'){ openLot(extra, { fromHistory: fromHistory }); return; }
    if (view === 'seller' && extra && typeof renderSeller === 'function'){ renderSeller(extra); show('seller', { extra: extra, fromHistory: fromHistory }); return; }
    if (view === 'sold' && typeof renderSold === 'function'){ renderSold(); show('sold', { fromHistory: fromHistory }); return; }
    if (view === 'account' && typeof renderAccount === 'function'){ renderAccount({ fromHistory: fromHistory }); return; }
    // A checkout only exists while a purchase is in progress. Arriving on the URL
    // cold, by refresh or a pasted link, means the amount and the lot are gone, and
    // an empty address form asking for money is worse than no page. The lot it came
    // from is a real place, so go there instead of pretending.
    if (view === 'checkout'){
      if (typeof CK_LIVE !== 'undefined' && CK_LIVE){ show('checkout', { extra: extra, fromHistory: fromHistory }); return; }
      if (extra && typeof openLot === 'function'){ openLot(extra); return; }
      show('home'); return;
    }
    show(view, { fromHistory: fromHistory });
  }

  // The path the visitor actually arrived on, which is how a shared link and a
  // page refresh both land somewhere other than the home page.
  function routeFromPath(fromHistory){
    // Strip /nl whatever file this is, not only when the file is a Dutch one.
    // /seller, /checkout and /account have no file behind them, so GitHub
    // Pages answers with 404.html, which is a copy of the English page: its
    // LANG_PREFIX is empty, and without this it would read /de/account as an
    // unknown path and show a Dutch visitor the home page instead of their
    // account. The page stays English, because the fallback file is, but at
    // least it is the page they asked for.
    let raw = location.pathname.replace(/\/+$/, '') || '/';
    const pre = LOCALE_CODES.filter(c => raw === '/' + c || raw.indexOf('/' + c + '/') === 0)[0];
    if (pre) raw = raw.slice(pre.length + 1) || '/';
    if (VIEW_BY_PATH[raw]){ routeTo(VIEW_BY_PATH[raw], null, fromHistory); return true; }
    const m = raw.match(/^(\/lot|\/seller|\/checkout)\/(.+)$/);
    if (m){ routeTo(VIEW_BY_PATH[m[1]], decodeURIComponent(m[2]), fromHistory); return true; }
    return false;
  }
  document.addEventListener('click', e => {
    const wb = e.target.closest('[data-watch]');
    if (wb){ e.preventDefault(); e.stopPropagation(); toggleWatch(wb); return; }
    // Back to the top of a long documentary page. Smooth unless the reader has
    // asked their machine not to animate things, which is a setting people turn
    // on because motion makes them ill rather than because they dislike it.
    if (e.target.closest('[data-totop]')){
      e.preventDefault();
      const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
      return;
    }
    const emp = e.target.closest('[data-empire]');
    if (emp){
      e.preventDefault();
      if (emp.dataset.empire === 'kenner') show('empire');
      else if (emp.dataset.empire === 'tmnt') show('tmnt');
      else if (emp.dataset.empire === 'ljn') show('ljn');
      else if (emp.dataset.empire === 'galoob') show('galoob');
      else if (emp.dataset.empire === 'thinkway') show('thinkway');
      else if (emp.dataset.empire === 'kaiju') show('kaiju');
      else if (emp.dataset.empire === 'imperial') show('imperial');
      else if (emp.dataset.empire === 'palitoy') show('palitoy');
      else if (emp.dataset.empire === 'dormei') show('dormei');
      else if (emp.dataset.empire === 'sofubi') show('sofubi');
      else openModal('Coming soon', 'This molder is next.', 'This maker gets its own documentary page soon. We are adding them one at a time.');
      return;
    }
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    const dest = nav.dataset.nav;
    // Everything goes through routeTo so there is exactly one place that writes
    // the address bar and records a pageview.
    if (dest === 'seller'){ e.preventDefault(); routeTo('seller', nav.dataset.seller || 'cornerstone'); return; }
    if (dest === 'lot'){ e.preventDefault(); routeTo('lot', nav.dataset.lot); return; }
    if (dest === 'sold'){ e.preventDefault(); routeTo('sold'); return; }
    if (dest === 'account'){ e.preventDefault(); routeTo('account'); return; }
    // Everything else that is simply a view. This used to be a hand-written list
    // of names, and plans and buy were never added to it: the Packages link in the
    // menu and every "compare the packages" on the site did nothing at all. Asking
    // the view table means a new page is reachable the moment it exists.
    if (views[dest] && dest !== 'checkout'){
      // let in-page anchors on home still work
      if (dest === 'home' && nav.getAttribute('href') && !views.home.hidden) return;
      e.preventDefault(); show(dest);
    }
  });

  // ---- Shipping and import estimates (help page only, never a checkout rate) ----
  // Domestic is a real PostNL 2026 price. Export EU / rest-of-world come from
  // Ramon's research. The UK column is interpolated between them, anchored on the
  // 14.45 UK from-price, and the import columns are estimates because a foreign
  // seller uses a carrier we do not control. One table, so rates change in one place.

  // Where a seller posts from. It decides their real postage and, for a buyer,
  // whether a purchase is an EU movement or a customs import, so it is not optional.
  const COUNTRIES = [
    ['NL','Netherlands'],['BE','Belgium'],['DE','Germany'],['FR','France'],['ES','Spain'],['IT','Italy'],
    ['PT','Portugal'],['AT','Austria'],['IE','Ireland'],['LU','Luxembourg'],['DK','Denmark'],['SE','Sweden'],
    ['FI','Finland'],['PL','Poland'],['CZ','Czechia'],['SK','Slovakia'],['SI','Slovenia'],['HU','Hungary'],
    ['RO','Romania'],['BG','Bulgaria'],['HR','Croatia'],['GR','Greece'],['EE','Estonia'],['LV','Latvia'],
    ['LT','Lithuania'],['MT','Malta'],['CY','Cyprus'],
    ['GB','United Kingdom'],['CH','Switzerland'],['NO','Norway'],
    ['US','United States'],['CA','Canada'],['JP','Japan'],['AU','Australia'],['NZ','New Zealand'],['OTHER','Somewhere else']
  ];
  const EU27 = ['NL','BE','DE','FR','ES','IT','PT','AT','IE','LU','DK','SE','FI','PL','CZ','SK','SI','HU','RO','BG','HR','GR','EE','LV','LT','MT','CY'];
  const countryName = c => (COUNTRIES.filter(x => x[0] === c)[0] || ['', ''])[1];

  const IMPORT = { vat: 0.21, lowValueDuty: 3, lowValueCeiling: 150, euHandlingFrom2026: 2 };
  const ZONES = [
    { key: 'nl',  name: 'Netherlands',            customs: false },
    { key: 'eu',  name: 'EU',                     customs: false },
    { key: 'uk',  name: 'UK / Europe non-EU',     customs: true  },
    { key: 'row', name: 'Rest of world',          customs: true  }
  ];

  // ----- Shipping & import help page -----
  (function(){
    const body = document.getElementById('shipTableBody');
    if (!body) return;
    const eur = n => '\u20ac ' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    body.innerHTML = SHIP_BANDS.map(b =>
      '<tr><td><b>' + b.label + '</b></td><td>' + eur(b.nl) + '</td><td>' + eur(b.eu) + '</td><td>' + eur(b.uk) +
      '</td><td>' + eur(b.row) + '</td><td>' + eur(b.eu) + '</td><td>' + eur(b.row) + '</td></tr>').join('');

    const dir = document.getElementById('cDir'), zone = document.getElementById('cZone'),
          wt = document.getElementById('cWeight'), val = document.getElementById('cValue'),
          hand = document.getElementById('cHandle'), handWrap = document.getElementById('cHandleWrap'),
          out = document.getElementById('calcOut');
    if (!dir) return;
    zone.innerHTML = ZONES.map(z => '<option value="' + z.key + '">' + z.name + '</option>').join('');
    wt.innerHTML = SHIP_BANDS.map((b, i) => '<option value="' + i + '">' + b.label + '</option>').join('');
    zone.value = 'eu';

    function calc(){
      const z = ZONES.filter(x => x.key === zone.value)[0];
      const band = SHIP_BANDS[+wt.value] || SHIP_BANDS[0];
      const ship = band[z.key];
      const item = Math.max(0, Number(val.value) || 0);
      const buying = dir.value === 'buy';
      handWrap.hidden = !(buying && z.customs);
      const rows = [];
      rows.push(['Item', item]);
      rows.push([buying ? 'Shipping to you' : 'Shipping you charge', ship]);
      let total = item + ship;
      if (buying && z.customs){
        const vat = (item + ship) * IMPORT.vat;
        const duty = (item + ship) <= IMPORT.lowValueCeiling ? IMPORT.lowValueDuty : 0;
        const handling = Math.max(0, Number(hand.value) || 0) + IMPORT.euHandlingFrom2026;
        // The three import costs kept on separate lines rather than rolled into
        // one figure. A single "charges" number is the thing a buyer cannot check
        // and cannot argue with, and it is also the thing that varies most.
        rows.push(['Estimated import VAT', vat]);
        rows.push(['Estimated customs duty', duty]);
        rows.push(['Estimated handling fee', handling]);
        total = item + ship + vat + duty + handling;
      }
      const note = buying
        ? (z.customs
            ? 'Import VAT, customs duty and handling fees vary by country, carrier and the type of goods, so treat this as a guide rather than a final figure.'
            : 'No import VAT or customs duty applies within the EU.')
        : 'This is the shipping price to enter on the lot. Your buyer pays the item price and shipping together at checkout. Buyers outside the EU may be charged import costs by their own country, which they pay.';
      out.innerHTML =
        '<div class="calc-rows">' + rows.map(r =>
          '<div class="calc-row"><span>' + r[0] + '</span><span class="num">' + eur(r[1]) + '</span></div>').join('') +
        '<div class="calc-row total"><span>' + (buying ? 'Estimated landed cost' : 'Buyer pays') + '</span><span class="num">' + eur(total) + '</span></div></div>' +
        '<p class="calc-note">' + note + '</p>';
    }
    [dir, zone, wt, val, hand].forEach(el => { el.addEventListener('input', calc); el.addEventListener('change', calc); });
    calc();
  })();

  // ----- Film -> commercial -----
  document.querySelectorAll('.film').forEach(f => f.addEventListener('click', () => window.open(COMMERCIAL, '_blank', 'noopener')));

  // ----- Video grid: click a thumbnail to play the YouTube clip inline -----
  document.querySelectorAll('.vid').forEach(v => {
    const btn = v.querySelector('.vid-thumb');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const id = v.dataset.yt;
      const frame = document.createElement('div');
      frame.className = 'vid-frame';
      const ifr = document.createElement('iframe');
      ifr.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
      ifr.title = 'YouTube video player';
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      ifr.allowFullscreen = true;
      frame.appendChild(ifr);
      btn.replaceWith(frame);
    });
  });

  // ----- Empire lines: filter by publisher + sort (era / A–Z) -----
  (function(){
    const grid = document.getElementById('lineGrid');
    const filter = document.getElementById('pubFilter');
    const sortEl = document.getElementById('lineSort');
    if (!grid || !filter || !sortEl) return;
    const cards = Array.from(grid.querySelectorAll('.empire'));
    let pub = 'all', sort = 'era';
    function apply(){
      cards.forEach(c => {
        const pubs = (c.dataset.pub || '').split(',');
        c.style.display = (pub === 'all' || pubs.includes(pub)) ? '' : 'none';
      });
      cards.filter(c => c.style.display !== 'none')
        .sort((a,b) => sort === 'az'
          ? a.dataset.name.localeCompare(b.dataset.name)
          : (+a.dataset.start) - (+b.dataset.start))
        .forEach(c => grid.appendChild(c));
    }
    filter.addEventListener('click', e => {
      const b = e.target.closest('.fchip'); if (!b) return;
      pub = b.dataset.pub;
      [...filter.children].forEach(x => x.classList.toggle('on', x === b));
      apply();
    });
    sortEl.addEventListener('click', e => {
      const b = e.target.closest('.sbtn'); if (!b) return;
      sort = b.dataset.sort;
      sortEl.querySelectorAll('.sbtn').forEach(x => x.classList.toggle('on', x === b));
      apply();
    });
    apply();
  })();

  // ----- Photo carousels on the Molder pages -----
  // Was wired to #kennerCarousel and #carouselDots by id, so a second Molder
  // page with photos would have silently stolen Kenner's dots. Every .carousel
  // now runs its own, and each one finds its dots inside itself.
  document.querySelectorAll('.carousel').forEach(root => {
    const track = root.querySelector('.carousel-track');
    const slides = root.querySelectorAll('.slide');
    const dotsWrap = root.querySelector('.carousel-dots');
    if (!track || !slides.length || !dotsWrap) return;
    let i = 0;
    slides.forEach((_, n) => {
      const d = document.createElement('button');
      d.className = 'cdot' + (n === 0 ? ' on' : '');
      d.setAttribute('aria-label', phrase('Photo {n}', { n: n + 1 }));
      d.addEventListener('click', () => go(n));
      dotsWrap.appendChild(d);
    });
    const dots = dotsWrap.querySelectorAll('.cdot');
    function go(n){
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-i * 100) + '%)';
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    }
    root.querySelectorAll('.carousel-arrow').forEach(a =>
      a.addEventListener('click', () => go(i + (+a.dataset.dir))));
  });

  // ----- Modal: bids / buy now / sell / info -----
  const modal = document.getElementById('modal');
  const bidForm = document.getElementById('bidForm');
  function openModal(ey, title, body, action){
    document.getElementById('modalEy').textContent = ey;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = body;
    if (bidForm) bidForm.hidden = true;
    const never = document.getElementById('modalNever');
    if (never) never.hidden = true;
    // Anything a previous caller injected goes with it. askAddress builds a form
    // and inserts it into this modal, and without this a second visit left two in
    // the document with the same ids, so getElementById would answer with the
    // stale one and the new form would do nothing.
    modal.querySelectorAll('.ck-form, .pv-wrap').forEach(el => el.remove());
    // The Close at the bottom is for plain notices. A form supplies its own
    // Cancel next to its confirm, and turns this back on when it leaves.
    const close = document.getElementById('modalClose');
    // A notice that tells you where something went should be able to take you
    // there. Rebuilt each time rather than hidden, so a modal without an action
    // cannot inherit the last one's button.
    const oldAct = document.getElementById('modalAction');
    if (oldAct) oldAct.remove();
    if (action && action.label && close && close.parentNode) {
      const btn = document.createElement('button');
      btn.id = 'modalAction';
      btn.type = 'button';
      btn.className = 'btn accent';
      btn.textContent = action.label;
      btn.addEventListener('click', () => { modal.hidden = true; action.go(); });
      close.parentNode.insertBefore(btn, close);
    }
    if (close) close.hidden = false;
    modal.hidden = false;
  }

  // A tip earns three showings. After that it has either landed or it never
  // will, and a modal that keeps reappearing in front of a task is just a
  // toll gate. Returns false when it stayed shut, so a caller can carry on.
  const TIP_LIMIT = 3;
  function tipSeen(key){
    try { return Number(localStorage.getItem('hm_tip_' + key) || 0); } catch (e) { return TIP_LIMIT; }
  }
  function tipModal(key, ey, title, body){
    if (tipSeen(key) >= TIP_LIMIT) return false;
    try { localStorage.setItem('hm_tip_' + key, String(tipSeen(key) + 1)); } catch (e) {}
    openModal(ey, title, body);
    const never = document.getElementById('modalNever');
    if (never){
      never.hidden = false;
      never.onclick = () => {
        try { localStorage.setItem('hm_tip_' + key, String(TIP_LIMIT)); } catch (e) {}
        closeModal();
      };
    }
    return true;
  }
  const eur = n => '€ ' + Number(n).toLocaleString('nl-NL');

  function openBid(name, bid, bids, lotId, sellerId){
    track('bid_open', null, lotId);
    const minNext = bid + Math.max(10, Math.round(bid * 0.05));
    const live = !!(SB && lotId);
    openModal('Place a bid', name, phrase('Current bid {bid} · {n} bids. Enter at least {min}.', { bid: eur(bid), n: bids, min: eur(minNext) }));
    bidForm.hidden = false;
    const input = document.getElementById('bidInput');
    input.value = minNext; input.min = minNext;
    document.getElementById('bidHint').textContent = live ? 'Binding bid · a hidden reserve may apply.' : 'Binding bid · a hidden reserve may apply · layout preview only.';
    document.getElementById('bidConfirm').onclick = async () => {
      const v = parseInt(input.value, 10);
      if (!v || v < minNext) { document.getElementById('bidHint').textContent = phrase('Enter at least {min}.', { min: eur(minNext) }); input.focus(); return; }
      let extended = false;
      if (live) {
        if (!authUser) { openAuth(); return; }
        const btn = document.getElementById('bidConfirm'); btn.disabled = true;
        const { error } = await SB.from('bids').insert({ lot_id: lotId, bidder_id: authUser.id, amount: v });
        btn.disabled = false;
        if (error) {
          // This used to read every row-level error as "you cannot bid on your
          // own lot", which was a guess, and for five weeks it was the wrong
          // one: the bids table had no insert policy at all, so every bid by
          // everybody failed and the page reported it as a house rule. A guess
          // dressed as an explanation is worse than an error code, because
          // nobody goes looking for a bug in a sentence that sounds deliberate.
          //
          // Ownership is knowable here, so it is checked rather than inferred.
          // Anything else says what actually came back.
          const own = sellerId && authUser && sellerId === authUser.id;
          document.getElementById('bidHint').textContent = own
            ? 'This is your own lot, so you cannot bid on it.'
            : (error.code === '42501'
                ? 'Your bid was refused by the database and that is a fault on our side, not yours. Nothing has been charged. Please email support@hammerandmold.com and we will fix it today.'
                : (error.message || 'Your bid did not go through. Please try again.'));
          if (typeof track === 'function') track('bid_failed', { code: error.code || '', msg: (error.message || '').slice(0, 120) }, lotId);
          return;
        }
        track('bid_placed', { amount: v }, lotId);
        injectDraftLots();
        try { const nr = await fetch(NOTIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lotId: lotId }) }); const nd = await nr.json(); if (nd && nd.ends_at) extended = true; } catch (e) {}
      }
      bidForm.hidden = true;
      // Highest is not the same as winning. A lot with a reserve that nobody
      // reaches simply does not sell, and until now the page congratulated the
      // leader and said nothing, so the one person who could still fix it was
      // the one person who did not know there was anything to fix.
      //
      // The amount stays unsaid. "Not yet" is the whole point of a hidden
      // reserve; the number would hand them the floor and end the auction.
      // Was a comparison against the reserve held in the browser. The figure is
      // private now, so the question goes back to the database: one call, on an
      // action the person just took deliberately, and it answers met or not
      // without ever naming the number.
      let underReserve = false;
      if (live && lotId) {
        try {
          const rr = await reserveState([lotId]);
          const st = rr[lotId];
          underReserve = !!(st && st.has && !st.met);
        } catch (e) { /* stay quiet rather than claim something untrue */ }
      }
      if (underReserve) {
        const next = v + Math.max(10, Math.round(v * 0.05));
        openModal('Bid placed', 'Highest, but not enough to win',
          phrase('{amount} on {lot} is the leading bid and it is recorded. It has not reached the seller\'s minimum, though, so as things stand this lot does not sell and nobody gets it.', { amount: eur(v), lot: name }) +
          (extended ? ' ' + phrase('The auction was extended by 2 minutes.') : '') +
          ' ' + phrase('You can go again now: {amount} or more.', { amount: eur(next) }),
          { label: phrase('Bid {amount} or more', { amount: eur(next) }), go: function(){ openBid(name, v, (bids || 0) + 1, lotId, sellerId); } });
        return;
      }
      document.getElementById('modalEy').textContent = 'Bid placed';
      document.getElementById('modalTitle').textContent = 'You are the highest bidder.';
      document.getElementById('modalBody').textContent =
        phrase('{amount} on {lot}.', { amount: eur(v), lot: name }) +
        (live
          ? ' ' + phrase('Your bid is recorded.') + (extended ? ' ' + phrase('The auction was extended by 2 minutes.') : '')
          : ' ' + phrase('Layout preview, so no real bid was placed.'));
    };
    setTimeout(() => input.focus(), 40);
  }
  const sellLink = document.getElementById('sellLink');
  if (sellLink) sellLink.addEventListener('click', () => {
    tipModal('sell', 'Sell with us', 'Upload photos. Our AI does the rest.',
      'Photograph the toy from the front and the back, plus any flaws, and one close-up of the moulded stamp: the year, country and factory marks. That last one is required, because it is the only text unique to your toy and it is what lets us date it and find what it actually sells for. Everything else is written for you.');
  });

  // ----- Auction countdowns -----
  (function(){
    const cds = [...document.querySelectorAll('[data-cd]')].map(el => ({ el, end: Date.now() + (parseFloat(el.dataset.ends) || 24) * 3600000 }));
    if (!cds.length) return;
    const pad = n => String(n).padStart(2, '0');
    function fmt(ms){
      if (ms <= 0) return 'Ended';
      const d = Math.floor(ms/86400000), h = Math.floor(ms%86400000/3600000), m = Math.floor(ms%3600000/60000), s = Math.floor(ms%60000/1000);
      return d > 0 ? d + 'd ' + pad(h) + 'h ' + pad(m) + 'm' : pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
    }
    function tick(){ const now = Date.now(); cds.forEach(c => c.el.textContent = fmt(c.end - now)); }
    tick(); setInterval(tick, 1000);
  })();
  function closeModal(){ modal.hidden = true; }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalX').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ----- The packages, as a dialogue -----
  // Its own element rather than a call to openModal, which writes textContent into
  // three fixed ids and would strip the cards straight back out again.
  const plansModal = document.getElementById('plansModal');
  function closePlans(){ if (plansModal) plansModal.hidden = true; }
  async function openPlansModal(){
    if (!plansModal) return;
    // The hammer, not a line of grey text. Waiting is waiting wherever it happens,
    // and this is the same mark the curation and the payout setup already use.
    const box = document.getElementById('plansModalCards');
    if (box && !box.children.length) box.innerHTML = '<div class="pay-wait">' + HAMMER + '<span class="t">Loading the packages…</span></div>';
    plansModal.hidden = false;
    track('plans_modal_open', {});
    // renderPlans fills every container it knows about, this one included, and its
    // all-in table simply is not here, which it already handles.
    await renderPlans();
  }
  if (plansModal){
    document.getElementById('plansX').addEventListener('click', closePlans);
    plansModal.addEventListener('click', e => { if (e.target === plansModal) closePlans(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlans(); });
    // The way out to the full page, with the chooser and the all-in table on it.
    document.getElementById('plansFull').addEventListener('click', () => { closePlans(); show('plans'); });
    // Choosing a package inside the dialogue leaves for Stripe or rewrites the
    // account behind it; either way the dialogue has done its job.
    plansModal.addEventListener('click', e => { if (e.target.closest('[data-plan]')) setTimeout(closePlans, 0); });
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-plans-pop]')) return;
    e.preventDefault();
    openPlansModal();
  });

  // ----- Theme -----
  // How much has been done to the piece. A ladder from nothing to heavily worked.
  //
  // This is not a selling point, it is value-bearing information. A repainted or
  // repaired figure is a different object from an original one, and undisclosed
  // restoration is exactly where a collector's trust breaks. So it gets its own
  // named field instead of a sentence somebody might put in the notes.
  //
  // Condition and this are different questions and both are needed. Condition is
  // how it looks now. This is why it looks that way. A Mint piece that was
  // repainted and a Mint piece that survived are not the same lot.
  const CARE_LEVELS = [
    { id: 'as-found',  label: 'As found',  hint: 'Nothing done. Dirt, wear and all.' },
    { id: 'cleaned',   label: 'Cleaned',   hint: 'Washed or dusted. No parts touched.' },
    { id: 'repaired',  label: 'Repaired',  hint: 'Something fixed or reattached. Original parts.' },
    { id: 'restored',  label: 'Restored',  hint: 'Repainted, reshaped, or parts replaced.' },
  ];
  const careLabel = id => (CARE_LEVELS.find(c => c.id === id) || {}).label || '';

  // ----- Sell: AI curation uploader -----
  (function(){
    const WORKER_URL = "https://plasticempires-curate.ramongervais.workers.dev";
    const input = document.getElementById('fileInput');
    const dz = document.getElementById('dropzone');
    const thumbs = document.getElementById('thumbs');
    const curateBtn = document.getElementById('curateBtn');
    const card = document.getElementById('resultCard');
    if (!input || !dz || !curateBtn || !card) return;

    let files = []; // { name, dataUrl (display), cardUrl (thumb), was, now }
    const esc = s => String(s).replace(/[<>&]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' }[c]));
    const eur = n => '€ ' + Number(n || 0).toLocaleString('nl-NL');

    // Photos are resized in the browser before they ever leave the device. A phone
    // photo is 2-5 MB; stored at that size it burns storage and, far worse, egress
    // every time a shop page loads. Two sizes: a display copy for the lot page and
    // a small copy for the shop cards.
    const DISPLAY_MAX = 1600, DISPLAY_Q = 0.82;
    const CARD_MAX = 400, CARD_Q = 0.78;
    const dataUrlBytes = d => { const i = d.indexOf(','); return i < 0 ? 0 : Math.round((d.length - i - 1) * 0.75); };
    const kb = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';

    function shrinkImage(file, maxDim, quality){
      return new Promise(resolve => {
        const fr = new FileReader();
        fr.onerror = () => resolve('');
        fr.onload = () => {
          const img = new Image();
          img.onerror = () => resolve(fr.result);   // not decodable, send the original on
          img.onload = () => {
            try {
              const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
              const w = Math.max(1, Math.round(img.width * scale));
              const h = Math.max(1, Math.round(img.height * scale));
              const c = document.createElement('canvas');
              c.width = w; c.height = h;
              const ctx = c.getContext('2d');
              ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);   // flatten any alpha
              ctx.drawImage(img, 0, 0, w, h);
              resolve(c.toDataURL('image/jpeg', quality));
            } catch (e) { resolve(fr.result); }
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
    }

    // Back to an empty sell page, ready for the next lot. Called after a lot is
    // published and after a draft is stored: in both cases the item is safely
    // away, and the job of this page is now the next one. Bumping curationSeq
    // matters more than it looks: a price search can still be in flight, and
    // without this it would land on the blank form behind the modal.
    function resetSell(){
      curationSeq++;
      if (compTimer){ clearInterval(compTimer); compTimer = null; }
      files = [];
      current = null;
      draftId = null;
      // The next toy is a different toy: its electronics are a different question.
      const sn = document.getElementById("sellerNotes"); if (sn) sn.value = "";
      draftUrls = null;
      editing = false;
      input.value = '';
      render();
      setCard('<div class="rc-empty">Your toy details will appear here.</div>', true);
      curateBtn.disabled = true;
      curateBtn.textContent = 'Identify my toy';
    }

    function render(){
      thumbs.innerHTML = '';
      files.forEach((f, i) => {
        const el = document.createElement('div');
        el.className = 'th' + (i === 0 ? ' cover' : '');
        // a draft's photos are already uploaded, so they render from their URL
        const src = f.existing ? f.url : f.dataUrl;
        el.innerHTML = '<img src="' + src + '" alt="">' +
          '<button class="th-x" type="button" data-i="' + i + '" aria-label="Remove photo">×</button>' +
          '<div class="th-move">' +
            '<button type="button" data-mv="' + i + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move photo earlier">&#8592;</button>' +
            '<button type="button" data-mv="' + i + '" data-dir="1"' + (i === files.length - 1 ? ' disabled' : '') + ' aria-label="Move photo later">&#8594;</button>' +
          '</div>' +
          (i === 0 ? '<span class="th-cover">Cover</span>' : '');
        thumbs.appendChild(el);
      });
      if (files.length){
        const fresh = files.filter(f => !f.existing);
        const was = fresh.reduce((a, f) => a + (f.was || 0), 0);
        const now = fresh.reduce((a, f) => a + (f.now || 0), 0);
        const note = document.createElement('div');
        note.className = 'dz-size';
        note.textContent =
          phrase(files.length === 1 ? '{n} photo' : '{n} photos', { n: files.length })
          + ' · ' + phrase('first one is the cover buyers see')
          + (fresh.length
            ? ' · ' + phrase('{size} to upload', { size: kb(now) })
              + (was > now * 1.15 ? ' ' + phrase('(resized from {size})', { size: kb(was) }) : '')
            : '');
        thumbs.appendChild(note);
      }
      curateBtn.disabled = files.filter(f => !f.existing).length === 0;
    }
    thumbs.addEventListener('click', e => {
      const mv = e.target.closest('button[data-mv]');
      if (mv){
        const i = +mv.dataset.mv, j = i + (+mv.dataset.dir);
        if (j < 0 || j >= files.length) return;
        const t = files[i]; files[i] = files[j]; files[j] = t;
        render();
        return;
      }
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      files.splice(+b.dataset.i, 1); render();
    });
    async function addFiles(list){
      const picked = [...list].filter(f => f.type.startsWith('image/')).slice(0, 6 - files.length);
      if (!picked.length) return;
      dz.classList.add('busy');
      for (const f of picked){
        const [big, small] = await Promise.all([
          shrinkImage(f, DISPLAY_MAX, DISPLAY_Q),
          shrinkImage(f, CARD_MAX, CARD_Q)
        ]);
        if (!big) continue;
        files.push({ name: f.name, dataUrl: big, cardUrl: small || big, was: f.size, now: dataUrlBytes(big) + dataUrlBytes(small || '') });
        render();
      }
      dz.classList.remove('busy');
    }
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });

    function setCard(html, empty){
      card.className = 'result-card' + (empty ? ' empty' : '');
      card.innerHTML = html;
      // Once there is something to edit, the two-column split has outlived its
      // purpose: the left side is an upload box that has already been used, and
      // the right side is a form with twenty fields squeezed into half a screen.
      // The grid collapses and the editor takes the full measure.
      const grid = card.closest('.sell-grid');
      if (grid) grid.classList.toggle('reviewing', !empty);
    }
    function row(k, v){
      if (!v) return '';
      // Long values stack under the label rather than being right-aligned.
      const col = String(v).length > 58 ? ' col' : '';
      return '<div class="row' + col + '"><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span></div>';
    }

    // The brand mark, mid-swing. Reused at two sizes: the big waiting card and
    // the small one inside the price-evidence panel.

    // Named stages rather than one frozen line, plus a running second count so
    // a long wait never looks like a hang. The markup is written once and only
    // the text is updated afterwards, because re-rendering it would restart
    // the animation on every tick.
    function stageTicker(stages){
      const t0 = Date.now();
      setCard('<div class="load-wrap">' + HAMMER +
        '<div class="load-stage"><span id="loadStage">' + esc(stages[0]) + '</span> ' +
        '<span class="load-sec" id="loadSec">(0s)</span></div></div>', true);
      let i = 0;
      const tick = setInterval(() => {
        const secs = Math.round((Date.now() - t0) / 1000);
        const st = document.getElementById('loadStage'), sc = document.getElementById('loadSec');
        if (!sc) return;                            // card was replaced, nothing to update
        if (secs >= (i + 1) * 8 && i < stages.length - 1) { i++; if (st) st.textContent = stages[i]; }
        sc.textContent = '(' + secs + 's)';
      }, 1000);
      return () => clearInterval(tick);
    }
    const LOOK_STAGES = ['Reading the photos', 'Reading the moulded stamp', 'Dating the year and the line', 'Grading the condition', 'Writing the listing'];
    const COMP_STAGES = ['Searching for recent sales', 'Reading the listings it found', 'Checking which ones are comparable', 'Converting to euros', 'Pricing the lot'];

    curateBtn.addEventListener('click', async () => {
      if (!files.length) return;
      curateBtn.disabled = true; curateBtn.textContent = 'Identifying…';
      const stopTicker = stageTicker(LOOK_STAGES);
      track('curate_start', { photos: files.length, notes: !!((document.getElementById('sellerNotes') || {}).value || '').trim() });
      try {
        // Pass 1 only. The search pass is asked for separately so the seller
        // gets a finished listing to read while the market is being checked.
        const res = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: files.map(f => f.dataUrl),
            skipComps: true,
            // Sent on the first pass, so it prices WITH what the seller knows
            // rather than being corrected afterwards.
            sellerNotes: (document.getElementById('sellerNotes') || {}).value || '',
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
        if (data.curation) data.curation.versions = data.versions || null;
        stopTicker();
        track('curate_done', { eligible: data.curation ? data.curation.eligible !== false : false,
                               identified: data.curation ? !!data.curation.identified : false });
        showCuration(data.curation, true);
      } catch (err) {
        stopTicker();
        setCard('<div class="rc-empty">Could not identify it. ' + esc(err.message || err) + '<br><br>Toy identification runs on the live site, not inside the claude.ai preview.</div>', true);
      } finally {
        stopTicker();
        curateBtn.disabled = false; curateBtn.textContent = 'Identify my toy';
      }
    });

    let current = null;
    let draftId = null;        // set when working on a saved draft
    let draftUrls = null;      // photos already uploaded for that draft

    const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

    // Upload every picked photo at both sizes. Returns the display URLs.
    // Returns the display URLs in thumbnail order. Photos already in storage (a
    // reopened draft) keep their URL; new ones get a random name so adding to a
    // draft can never overwrite a file that is already there.
    async function uploadPhotos(uid, lotId){
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.existing){ urls.push(f.url); continue; }
        const key = newId().replace(/-/g, '').slice(0, 10);
        const blob = await (await fetch(f.dataUrl)).blob();
        const path = uid + '/' + lotId + '/' + key + '.jpg';
        const up = await SB.storage.from('lots').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (up.error) throw up.error;
        urls.push(SB.storage.from('lots').getPublicUrl(path).data.publicUrl);
        // the shop-card copy, found by convention as <name>_card.jpg
        if (f.cardUrl){
          try {
            const cb = await (await fetch(f.cardUrl)).blob();
            await SB.storage.from('lots').upload(uid + '/' + lotId + '/' + key + '_card.jpg', cb, { contentType: 'image/jpeg', upsert: true });
          } catch (e) {}
        }
      }
      return urls;
    }

    function lotRow(lotId, uid, urls){
      const pre = preLaunch();
      const fixedSale = current.saleType === 'fixed';
      // No end date at listing time. The clock starts on the first bid, set by a
      // trigger in the database so it cannot be raced or chosen by the bidder.
      // Before this, a lot's seven days ran from the moment it was created, so a
      // lot nobody happened to see that week was simply gone.
      const ends = null;
      return {
        id: lotId, seller_id: uid, toy: current.toy || 'Untitled lot', maker: current.maker || null, line: current.line || null, year: current.year || null,
        condition: current.condition || null, completeness: current.completeness || null, notes: current.notes || null,
        blurb: current.blurb || null,
        stamp_shown: current.stampVisible !== false,
        variants: current.variants || [], image_urls: urls, starting_bid: current.startingBid || 0,
        reserve: fixedSale ? null : (current.reserve || null), buy_now: fixedSale ? (current.buyNow || current.startingBid || 0) : (current.buyNow || null),
        estimate_low: current.estimateLow || null, estimate_high: current.estimateHigh || null, confidence: current.confidence || null,
        auction_days: current.auctionDays || 7, status: pre ? 'preview' : 'live', ends_at: ends, sale_type: fixedSale ? 'fixed' : 'auction',
        shipping_eur: Number(current.shipping || 0),
        shipping_nl_eur: current.shippingNl == null ? null : Number(current.shippingNl),
        shipping_row_eur: current.shippingRow == null ? null : Number(current.shippingRow),
        weight_kg: current.weightKg == null ? null : Number(current.weightKg),
        size_class: current.sizeClass || null,
        letterbox: current.letterbox === true,
        // Value-bearing, so it travels with the lot. insertTolerant drops these and
        // retries if the migration has not been run yet, which means publishing keeps
        // working and the console says what was dropped.
        care_level: current.careLevel || null,
        care_note: current.careNote || null,
      };
    }

    // Reopen a saved draft in the curation card. Photos stay where they are.
    window.HM_openDraft = function(draft){
      draftId = draft.id;
      draftUrls = null;   // rebuilt from the thumbnail order on save
      // show the draft's photos as thumbnails so they can be reordered or removed
      files = (draft.image_urls || []).map(u => ({ existing: true, url: u }));
      render();
      current = Object.assign({}, draft.payload || {});
      if (current.auctionDays == null) current.auctionDays = 7;
      show('sell');
      viewMode();
    };

    // Bumped on every fresh curation. A search that started for an earlier
    // curation must not land on a later one, which is exactly what would
    // happen when a seller taps a variant while the first search is in flight.
    let curationSeq = 0;
    let editing = false;   // set while the seller has the edit form open

    function showCuration(c, thenPrice){
      if (!c){ setCard('<div class="rc-empty">No details returned.</div>', true); return; }
      // Postage comes from the identification, not from the seller with a scale.
      // Six lots reached the site with no weight at all, which meant the carrier
      // was asked to price an assumed one kilo: on a 33cm vinyl kaiju that is a
      // parcel quoted at a third of what it costs to send, and the shortfall
      // lands on the seller after the buyer has already paid.
      if (c.packedWeightKg != null && c.weightKg == null) c.weightKg = Number(c.packedWeightKg) || null;
      if (c.parcelSize && !c.sizeClass) c.sizeClass = String(c.parcelSize).toUpperCase();
      if (c.eligible === false){
        setCard('<div class="rc-head"><div><div class="rc-title">Can\'t be listed</div><div class="rc-sub">Rejected automatically</div></div></div><div class="rc-notes" style="margin-top:16px">' + esc(c.rejectionReason || 'This item is not a collectible toy and cannot be listed on Hammer &amp; Mold.') + '</div><div class="rc-notes" style="color:var(--ink-3);margin-top:10px">No listing was used. Only genuine vintage toys and collectibles are allowed.</div>', true);
        current = null;
        return;
      }
      // Snapshot what the AI said BEFORE the seller can touch a field. Once the
      // lot sells, the winning bid turns this into a labelled example, and an
      // edit the seller makes is itself feedback that we were off.
      c.ai = {
        start: c.startingBid, low: c.estimateLow, high: c.estimateHigh,
        confidence: c.confidence, pricedFrom: c.pricedFrom, comps: c.comps || [],
        queries: c.compsQueries || [], searches: c.searches, versions: c.versions,
      };
      current = c; if (current.auctionDays == null) current.auctionDays = 7;
      const seq = ++curationSeq;
      if (thenPrice && c.eligible !== false && c.identified !== false){
        current.compsPending = true;
        viewMode();
        fetchComps(seq);
      } else {
        viewMode();
      }
    }

    // The search pass, on its own, with no photographs re-sent. Its result is
    // merged into the card in place. Anything the seller has already changed
    // wins: their own starting bid is never overwritten by a later search.
    // Seconds counter for the small waiting row. Rebound after every render,
    // because viewMode replaces the element it writes into.
    let compT0 = 0, compTimer = null;
    function bindCompWait(){
      if (compTimer) { clearInterval(compTimer); compTimer = null; }
      const upd = () => {
        const el = document.getElementById('compWait');
        if (!el || !current || !current.compsPending){ if (compTimer) clearInterval(compTimer); compTimer = null; return; }
        el.textContent = Math.round((Date.now() - compT0) / 1000) + 's';
      };
      upd();
      compTimer = setInterval(upd, 1000);
    }

    async function fetchComps(seq, force){
      compT0 = Date.now();
      const idn = {
        toy: current.toy, maker: current.maker, line: current.line, year: current.year,
        condition: current.condition, completeness: current.completeness, notes: current.notes,
        variants: current.variants, startingBid: current.startingBid,
        estimateLow: current.estimateLow, estimateHigh: current.estimateHigh,
      };
      let data = null, failed = null;
      try {
        const res = await fetch(WORKER_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curation: idn, force: force === true }),
        });
        data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
      } catch (err) {
        failed = String((err && err.message) || err);
      }
      if (seq !== curationSeq || !current) return;   // a newer curation replaced this one

      current.compsPending = false;
      current.compsSkipped = null;
      if (failed || !data || !data.comps && !data.curation){
        current.compsError = failed || 'no result';
      } else if (data.skipped === 'below_floor'){
        // A market search costs about as much as the lot is worth down here, and
        // for cheap pieces it reliably finds nothing comparable anyway. The
        // seller can still ask for it: they know if theirs is the exception.
        current.compsSkipped = data.floor || 40;
      } else {
        current.compsCached = data.cached === true;
        const p = data.curation || {};
        current.comps = p.comps || [];
        current.compsQueries = p.compsQueries || [];
        current.compsSummary = p.compsSummary || '';
        current.pricedFrom = p.pricedFrom || current.pricedFrom;
        current.searches = data.searches ?? null;
        if (data.versions) current.versions = data.versions;
        if (p.notes) current.notes = p.notes;
        // Only take the search's price if the seller has not set their own.
        if (!current.edited && p.pricedFrom && p.pricedFrom !== 'curator estimate'){
          if (p.startingBid) current.startingBid = p.startingBid;
          if (p.estimateLow) current.estimateLow = p.estimateLow;
          if (p.estimateHigh) current.estimateHigh = p.estimateHigh;
          if (p.confidence) current.confidence = p.confidence;
        }
        // Refresh the calibration snapshot: the comps price is the AI's final
        // word, and that is what the log is meant to record.
        current.ai = Object.assign({}, current.ai, {
          start: current.startingBid, low: current.estimateLow, high: current.estimateHigh,
          confidence: current.confidence, pricedFrom: current.pricedFrom,
          comps: current.comps, queries: current.compsQueries,
          searches: current.searches, versions: current.versions,
        });
      }
      if (!editing) viewMode();   // never redraw over a form the seller is filling in
    }

    // Deploys are manual and the schema is migrated by hand, so a new column can
    // exist in this file before it exists in the database. That must degrade, not
    // break: PostgREST replies PGRST204 and names the column it does not know, so
    // drop that key and try again rather than losing the whole listing. It gives
    // up after a few rounds so a real error still surfaces.
    async function insertTolerant(table, row){
      const dropped = [];
      for (let i = 0; i < 5; i++){
        const res = await SB.from(table).insert(row);
        if (!res.error) {
          if (dropped.length) console.warn('Saved without ' + dropped.join(', ') + ': column missing, run the migration.');
          return res;
        }
        const m = /Could not find the '([^']+)' column/.exec(res.error.message || '');
        if (!m || !(m[1] in row)) return res;
        dropped.push(m[1]);
        delete row[m[1]];
      }
      // The seller gets a sentence; the detail goes where a developer looks.
      console.error('Save failed: too many unknown columns. Run the pending migration in admin/schema.sql.');
      return { error: { message: 'We could not save that just now. Nothing was lost, so please try again in a moment.' } };
    }

    // Append-only calibration record. Never allowed to fail the publish: the
    // lot is already saved by the time this runs, and a lost telemetry row is
    // worth less than a seller seeing an error for a listing that went fine.
    async function logCuration(lotId, uid){
      const a = (current && current.ai) || null;
      if (!SB || !a) return;
      try {
        await insertTolerant('curation_log', {
          lot_id: lotId, seller_id: uid,
          toy: current.toy || null, maker: current.maker || null, line: current.line || null, year: current.year || null,
          ai_start: a.start ?? null, ai_low: a.low ?? null, ai_high: a.high ?? null,
          ai_confidence: a.confidence || null, priced_from: a.pricedFrom || null,
          searches: a.searches ?? null, comps: a.comps || [], queries: a.queries || [],
          final_start: current.startingBid ?? null, seller_edited: current.edited === true,
          stamp_shown: current.stampVisible !== false,
          versions: a.versions || {},
        });
      } catch (e) {}
    }
    async function recurate(correction){
      if (!files.length) return;
      // A corrected variant changes what the toy IS, so it changes what it is
      // worth: the comps are searched again rather than carried over.
      const stopTicker = stageTicker(LOOK_STAGES);
      try {
        const res = await fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: files.map(f => f.dataUrl), correction, skipComps: true }) });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
        if (data.curation) data.curation.versions = data.versions || null;
        stopTicker();
        const days = current && current.auctionDays;
        showCuration(data.curation, true);
        if (days && current) { current.auctionDays = days; viewMode(); }
      } catch (err) {
        setCard('<div class="rc-empty">Could not rewrite: ' + esc(err.message || err) + '</div>', true);
      } finally {
        stopTicker();
      }
    }

    // ----- Price evidence -----
    // The comparables the estimate was built from, with a link behind every
    // number. Seller-facing only: this is how the seller checks our price, not
    // a public argument for what a buyer should bid. It rides along in the
    // draft payload and is never written to the lots table.
    const KIND_WORD = { sold: 'Sold', asking: 'Asking', guide: 'Guide' };
    function compsHtml(c){
      if (c.compsPending){
        return '<div class="comps"><div class="comps-h"><span>Price evidence</span><span id="compWait">checking</span></div>' +
          '<div class="comps-wait">' + HAMMER +
          '<div class="t">Searching for what this actually fetched recently. The listing above is ready, so you can read it through while we look.</div></div></div>';
      }
      if (c.compsSkipped){
        return '<div class="comps"><div class="comps-h"><span>Price evidence</span><span>not checked</span></div>' +
          '<div class="comps-none">' + phrase('Below around {amount} a market search costs roughly what the lot is worth, and for inexpensive pieces it usually finds nothing genuinely comparable. The estimate above is the curator\'s reading of the photos. If you think this one is worth more than it looks, check it anyway.', { amount: eur(c.compsSkipped) }) +
          '<button type="button" class="stamp-btn" id="compsForce" style="margin-top:12px">Check the market anyway</button></div></div>';
      }
      const comps = (c.comps || []).filter(k => k && k.url && k.priceEur);
      if (!comps.length){
        const why = c.compsError
          ? 'The market check could not run this time, so the estimate is the curator\'s own reading of the photos.'
          : 'No recent sales were found for this exact toy, so the estimate is our own reading of the photos.';
        return '<div class="comps"><div class="comps-h"><span>Price evidence</span><span>none found</span></div>' +
          '<div class="comps-none">' + why + ' ' + phrase('Treat it as a starting point, and set the price yourself if you know this toy better than we do.') +
          (c.compsSummary ? ' ' + esc(c.compsSummary) : '') + '</div></div>';
      }
      const rows = comps.map(k => {
        const native = (k.currency && k.currency !== 'EUR' && k.price) ? ' · ' + esc(k.price + ' ' + k.currency) : '';
        return '<div class="comp"><div class="comp-l">' +
          '<div class="comp-t"><a href="' + esc(k.url) + '" target="_blank" rel="noopener nofollow">' + esc(k.title || 'Listing') + '</a></div>' +
          '<div class="comp-m">' + esc([k.source, k.match, k.condition, k.date].filter(Boolean).join(' · ')) + '</div></div>' +
          '<div class="comp-r"><div class="comp-p">' + eur(k.priceEur) + '</div>' +
          '<div class="comp-k ' + esc(k.kind || '') + '">' + esc(KIND_WORD[k.kind] || k.kind || '') + native + '</div></div></div>';
      }).join('');
      const q = (c.compsQueries || []).length
        ? '<div class="comp-m" style="margin-top:12px">Searched: ' + esc(c.compsQueries.join('  ·  ')) + '</div>' : '';
      return '<div class="comps"><div class="comps-h"><span>Price evidence</span><span>' +
        comps.length + ' comp' + (comps.length === 1 ? '' : 's') + ' · ' + esc(c.pricedFrom || '') + '</span></div>' +
        (c.compsSummary ? '<div class="comps-sum">' + esc(c.compsSummary) + '</div>' : '') +
        rows + q + '</div>';
    }

    const STAR_PCT = { 'Mint': 100, 'Near mint': 90, 'Excellent': 80, 'Good': 60, 'Fair': 40, 'Poor': 20 };
    function stars(cond){
      const pct = STAR_PCT[cond] || 0;
      return '<span class="qstars" title="' + esc(cond || '') + '"><span class="base">★★★★★</span><span class="fill" style="width:' + pct + '%">★★★★★</span></span>';
    }
    function viewMode(){
      const c = current;
      const est = (c.estimateLow && c.estimateHigh) ? phrase('Est. {low} – {high}', { low: eur(c.estimateLow), high: eur(c.estimateHigh) }) : '';
      const condRow = '<div class="row"><span class="k">Condition</span><span class="v"><span class="cond-word">' + esc(c.condition || '-') + '</span> ' + stars(c.condition) + '</span></div>';
      const variantsHtml = (c.variants && c.variants.length)
        ? '<div class="variants"><div class="v-head">Variant · tap to correct</div>' + c.variants.map(v =>
            '<div class="variant"><div class="v-axis">' + esc(v.axis) + '</div><div class="v-opts">' +
            (v.options || []).map(o => '<button type="button" class="v-opt' + (o === v.value ? ' on' : '') + '" data-axis="' + esc(v.axis) + '" data-opt="' + esc(o) + '">' + esc(o) + '</button>').join('') +
            '</div></div>').join('') + '</div>'
        : '';
      const fixed = c.saleType === 'fixed';
      const price = fixed ? (c.buyNow || c.startingBid) : c.startingBid;
      const html =
        '<div class="rc-head"><div><div class="rc-title">' + esc(c.toy || 'Unidentified') + '</div>' +
        '<div class="rc-sub">' + esc([c.maker, c.line, c.year].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="rc-acts">' +
          '<button class="rc-editbtn" id="previewLot" type="button">Preview</button>' +
          '<button class="rc-editbtn" id="editLot" type="button">Edit</button>' +
        '</div></div>' +
        (c.blurb ? '<div class="rc-lede">' + esc(c.blurb) + '</div>' : '') +
        (c.stampVisible === false
          ? (c.noStamp
              ? '<div class="stamp-warn">Recorded as having no legible stamp. The lot will say so, and dating rests on the sculpt alone. <button type="button" class="stamp-btn" id="stampUndo">I can photograph it after all</button></div>'
              : '<div class="stamp-warn"><b>A close-up of the moulded stamp is missing.</b> The year, country and factory marks are the only text unique to your toy, so they are what let us date it and search for what it really sells for. Without them the price is a guess. Look at the soles, the lower back or between the shoulders; worn or scratched is fine. <button type="button" class="stamp-btn" id="stampNone">This toy has no legible stamp</button></div>')
          : '') +
        '<div class="sale-toggle"><button type="button" class="' + (!fixed ? 'on' : '') + '" data-sale="auction">Auction</button><button type="button" class="' + (fixed ? 'on' : '') + '" data-sale="fixed">Direct sale</button></div>' +
        '<div class="rc-spec">' + condRow + row('Completeness', c.completeness) +
          // Shown even when unset, and then it says so. A blank line here would let
          // a seller publish without ever having been asked the question.
          row('Restoration', c.careLevel
                ? careLabel(c.careLevel) + (c.careNote ? ' · ' + c.careNote : '')
                : 'Not stated. Edit to say what you did to it.') +
          (fixed ? '' : row('Auction length', (c.auctionDays || 7) + ' days from the first bid') + row('Reserve (min. accepted)', c.reserve ? eur(c.reserve) : 'None')) +
          (fixed ? row('Fixed price', eur(price)) : row('Buy Now price', c.buyNow ? eur(c.buyNow) : 'None')) +
          // Its own row. It used to be concatenated into the price value above,
          // where row() escaped it into visible markup and it only appeared on an
          // auction that also had a Buy Now price.
          // What actually happens, rather than what the listing says. The buyer
          // is quoted for their own country and their own chosen carrier, so
          // there is no single number to show a seller here and pretending there
          // is was the whole problem.
          row('Shipping', 'Quoted to the buyer at checkout, and paid by them') + '</div>' +
        variantsHtml +
        '<div class="rc-bid"><div><div class="rc-conf" style="text-align:start">' + (fixed ? 'Fixed price' : 'Suggested starting price') + '</div><div class="amt">' + eur(price) + '</div></div>' +
        '<div class="rc-conf">' + (est ? esc(est) + '<br>' : '') + phrase('Confidence: {level}', { level: esc(c.confidence || '-') }) +
          (c.pricedFrom ? '<br>' + (c.pricedFrom === 'curator estimate' ? phrase('Curator estimate') : phrase('Estimate from {source}', { source: esc(c.pricedFrom) })) : '') +
          (c.compsCached ? '<br>Comps from cache' : '') +
          (c.edited ? '<br>Edited' : '') + '</div></div>' +
        compsHtml(c) +
        (c.notes ? '<div class="rc-notes">' + esc(c.notes) + '</div>' : '') +
        '<div class="buy-row" style="margin-top:24px"><button class="btn accent" id="submitLot" type="button">Submit this ' + (fixed ? 'item' : 'lot') + '</button>' +
          (SB ? '<button class="btn ghost" id="draftLot" type="button">' + (draftId ? 'Update draft' : 'Save as draft') + '</button>' : '') + '</div>' +
        (draftId ? '<div class="rc-notes" style="color:var(--ink-3);margin-top:12px">Working on a saved draft. No listing has been used yet; publishing uses one.</div>' : '');
      setCard(html, false);
      editing = false;
      if (c.compsPending) bindCompWait();
      document.getElementById('editLot').addEventListener('click', editMode);

      // See it the way a buyer will, before it is published. A seller has been
      // staring at a form; the shop is a photograph, a title and a price, and
      // those are different things. Built from the curation in hand rather than
      // from the database, because the point is to check it BEFORE it exists.
      const pv = document.getElementById('previewLot');
      if (pv) pv.addEventListener('click', () => {
        const cover = (files[0] && (files[0].cardUrl || files[0].dataUrl)) || (draftUrls && draftUrls[0]) || '';
        const fixedSale = current.saleType === 'fixed';
        const shown = fixedSale ? (current.buyNow || current.startingBid) : current.startingBid;
        const meta = [current.line, current.maker, current.year].filter(Boolean).join(' \u00b7 ');
        openModal('Preview', 'How it looks in the shop',
          'This is the card a buyer sees in the grid. Nothing is published yet.');
        const body = document.getElementById('modalBody');
        if (!body) return;
        const card = document.createElement('div');
        card.className = 'pv-wrap';
        card.innerHTML =
          '<article class="artifact-card" style="pointer-events:none">' +
            '<div class="vitrine">' +
              (cover ? '<img class="cardimg" src="' + esc(cover) + '" alt="">' : '<span class="ph">No photo yet</span>') +
              '<span class="tick tl"></span><span class="tick tr"></span>' +
              '<span class="tick bl"></span><span class="tick br"></span>' +
            '</div>' +
            '<div class="label"><div class="ln"><span class="nm">' + esc(current.toy || 'Unidentified') + '</span></div>' +
              '<div class="meta">' + esc(meta) + '</div>' +
              '<div class="auc-card"><div><span class="amt">' + eur(shown || 0) + '</span>' +
                '<span class="sub">' + (fixedSale ? 'Direct sale' : 'Starting bid') + '</span></div>' +
                '<div class="cd">' + (fixedSale ? 'Direct sale' : '7 days from first bid') + '</div></div>' +
            '</div>' +
          '</article>';
        body.parentNode.insertBefore(card, body.nextSibling);
      });
      // The stamp is a requirement, not a nag, so the way past it is a recorded
      // choice rather than a dismissed banner.
      const sNone = document.getElementById('stampNone');
      if (sNone) sNone.addEventListener('click', () => { current.noStamp = true; viewMode(); });
      const sUndo = document.getElementById('stampUndo');
      if (sUndo) sUndo.addEventListener('click', () => { current.noStamp = false; viewMode(); });
      const cForce = document.getElementById('compsForce');
      if (cForce) cForce.addEventListener('click', () => {
        current.compsSkipped = null; current.compsPending = true;
        viewMode();
        fetchComps(curationSeq, true);
      });
      card.querySelectorAll('.sale-toggle button').forEach(b => b.addEventListener('click', () => { const st = b.dataset.sale; if (st === (current.saleType || 'auction')) return; if (st === 'fixed' && !current.buyNow) current.buyNow = current.startingBid; current.saleType = st; viewMode(); }));
      card.querySelectorAll('.v-opt').forEach(b => b.addEventListener('click', () => { if (b.classList.contains('on')) return; recurate(b.dataset.axis + ' = ' + b.dataset.opt); }));
      const dBtn = document.getElementById('draftLot');
      if (dBtn) dBtn.addEventListener('click', async () => {
        if (!authUser){ openAuth(); return; }
        dBtn.disabled = true; dBtn.textContent = 'Saving…';
        try {
          const uid = authUser.id;
          if (!draftId) draftId = newId();
          // always rebuild from thumbnail order, so a reorder or removal is saved
          draftUrls = files.length ? await uploadPhotos(uid, draftId) : [];
          const row = { id: draftId, seller_id: uid, payload: current, image_urls: draftUrls, updated_at: new Date().toISOString() };
          const { error } = await SB.from('lot_drafts').upsert(row, { onConflict: 'id' });
          if (error) throw error;
          const draftToy = current.toy || 'Your lot';
          resetSell();
          openModal('Draft saved', phrase('{lot} is saved as a draft.', { lot: draftToy }),
            'No listing was used. It is under Drafts in your account, ready to publish when you are. This page is cleared so you can start the next one.',
            { label: 'Open your drafts', go: () => routeTo('account') });
        } catch (err) {
          const msg = String((err && err.message) || err);
          openModal('Could not save the draft', 'Something went wrong.',
            /lot_drafts/.test(msg) ? 'Drafts are not available just yet. Your photos and details are still on screen, so you can publish now instead.' : msg);
        } finally { dBtn.disabled = false; dBtn.textContent = draftId ? 'Update draft' : 'Save as draft'; }
      });
      document.getElementById('submitLot').addEventListener('click', async () => {
        if (SB && !authUser) { openAuth(); return; }
        if (SB && authUser){
          const pr = await SB.from('profiles').select('country').eq('id', authUser.id).maybeSingle();
          if (!pr.error && (!pr.data || !pr.data.country)){
            openModal('One thing first', 'We need to know where you post from.',
              'Your country decides what postage costs you, and tells a buyer whether their order is an EU movement or a customs import. Set it under "Shipping from" in your account, then publish.');
            return;
          }
        }
        if (current && current.stampVisible === false && !current.noStamp){
          openModal('The maker\'s mark is missing', 'One photo still needed.',
            'A close-up of the moulded year, country and factory marks is required. It is the only text unique to your toy, so it is what lets us date it and price it against real sales. Add the photo and curate again, or, if this piece genuinely carries no legible marks, say so on the card and publish.');
          return;
        }
        const stop = priceProblem(current);
        if (stop){ openModal('Check the prices', 'That combination would cost you money.', stop); return; }
        if (SB && authUser) {
          const btn = document.getElementById('submitLot'); btn.disabled = true; btn.textContent = 'Publishing…';
          try {
            const uid = authUser.id;
            // publishing a draft keeps its id, so its photos stay where they are
            const lotId = draftId || newId();
            const urls = files.length ? await uploadPhotos(uid, lotId) : (draftUrls || []);
            const pre = preLaunch();
            const { error } = await insertTolerant('lots', lotRow(lotId, uid, urls));
            if (error) throw error;
            await logCuration(lotId, uid);
            // the draft has become a real lot, so retire it
            if (draftId){
              try { await SB.from('lot_drafts').delete().eq('id', draftId); } catch (e) {}
              draftId = null; draftUrls = null;
            }
            injectDraftLots();
            const wasToy = current.toy || 'Your toy';
            resetSell();   // clear the form so the next lot can go straight in
            track('lot_listed', { preview: !!pre }, lotId);
            // "Saved to the database with 6 photo(s)" was two faults in one line.
            // Nobody listing a toy cares that we keep a database, and the (s) is
            // the machine showing through where a sentence should be.
            openModal(pre ? 'Lot in preview' : 'Lot listed',
              phrase(pre ? '{lot} is ready for launch.' : '{lot} is live in the shop.', { lot: wasToy }),
              (urls.length ? phrase(urls.length === 1 ? 'Saved with {n} photo.' : 'Saved with {n} photos.', { n: urls.length }) : phrase('Saved.')) + ' ' +
              phrase(pre ? 'It shows in Preview now and opens for bidding when you take it live.'
                         : 'It now appears in the Shop.') + ' ' +
              phrase('The page is cleared, so you can start the next one.'));
          } catch (err) {
            const msg = String((err && err.message) || err);
            if (/NO_TOKENS/.test(msg)) openModal('Out of listings', 'No listings left this month.', 'You need one listing to publish a lot. Open your account to buy more, or switch to Trader for 50 listings a month.');
            else openModal('Could not list', 'Something went wrong.', msg);
          } finally { btn.disabled = false; btn.textContent = 'Submit this lot'; if (typeof refreshSellTokens === 'function') refreshSellTokens(); }
          return;
        }
        saveDraftLot(current);
        openModal('Lot submitted', phrase('{lot} is now in your shop.', { lot: current.toy || phrase('Your toy') }), 'Added to the Shop as a draft lot, stored in this browser for the preview.');
      });
    }

    const CONDITIONS = ['Mint', 'Near mint', 'Excellent', 'Good', 'Fair', 'Poor'];

    const CONFS = ['high', 'medium', 'low'];
    const DAYS = ['3', '5', '7', '10', '14'];
    // an optional hint renders a focusable info dot with a CSS tooltip
    const tip = h => h ? '<span class="ef-i" tabindex="0" role="note" aria-label="' + esc(h) + '" data-tip="' + esc(h) + '">i</span>' : '';
    const ef = (label, id, val, type, hint) => '<label class="ef"><span>' + label + tip(hint) + '</span><input class="ei" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '"></label>';
    const efSel = (label, id, val, opts, hint) => '<label class="ef"><span>' + label + tip(hint) + '</span><select class="ei" id="' + id + '">' + opts.map(o => '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></label>';
    const efArea = (label, id, val, hint) => '<label class="ef"><span>' + label + tip(hint) + '</span><textarea class="ei" id="' + id + '" rows="3">' + esc(val == null ? '' : val) + '</textarea></label>';
    // The AI's own assessment, not a seller decision: shown as a value, not a field.
    const efRO = (label, val, hint) => '<div class="ef ef-ro"><span>' + label + tip(hint) + '</span>' +
      '<div class="ro-val">' + (val == null || val === '' ? '\u2014' : esc(String(val))) + '</div></div>';

    // Blocking: a Buy Now under the opening bid means nobody would ever bid,
    // they would simply take it, and the lot sells below where it opened.
    function priceProblem(c){
      const fixed = c.saleType === 'fixed';
      const bid = Number(c.startingBid || 0), buy = c.buyNow == null ? null : Number(c.buyNow);
      if (!fixed && buy != null && buy > 0 && buy < bid)
        return 'Buy Now (' + eur(buy) + ') is below the starting price (' + eur(bid) + '). A buyer would skip the auction and take it for the lower price. Raise Buy Now above the starting price, or clear it.';
      if (!fixed && c.reserve != null && Number(c.reserve) > 0 && buy != null && buy > 0 && Number(c.reserve) > buy)
        return 'The reserve (' + eur(c.reserve) + ') is above Buy Now (' + eur(buy) + '), so a Buy Now sale would fall below your own minimum. Lower the reserve or raise Buy Now.';
      // The two shipping checks that were here are gone with the field. A seller
      // can no longer enter a negative or absurd postage amount because they can
      // no longer enter one at all.
      if (bid < 0 || (buy != null && buy < 0)) return 'Prices cannot be negative.';
      return null;
    }
    // What this seller actually pays on a sale. Falls back to Starter's rate when
    // the package table has not loaded or nobody is signed in, which is the safe
    // direction: it under-promises rather than over-promises what they keep.
    function myRate(){
      try {
        const key = (typeof currentPlanKey === 'function' && currentPlanKey()) || 'starter';
        const p = (PLAN_CACHE || []).find(x => x.key === key);
        if (p && typeof p.commission === 'number') return p.commission;
      } catch (e) {}
      return 0.15;
    }

    // There is no priceWarning any more, and that is the point.
    //
    // Two lived here. The free-postage one went with the field it was about. The
    // last one told a seller their starting price was above our estimate, and
    // Ramon killed it on the Dor Mei Godzilla: our own AI had read a working
    // electronic figure as a painted one and capped it at EUR 40, he corrected it
    // to EUR 69, and the site popped a dialogue implying he had got it wrong.
    //
    // An estimate we generated is not a fact to measure the seller against. They
    // are holding the toy. When our number and theirs disagree, the one that has
    // actually seen the thing work should not be the one being warned.

    function showPriceError(msg){
      const box = document.getElementById('priceErr');
      if (box){ box.textContent = msg; box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else openModal('Check the prices', 'That combination would cost you money.', msg);
    }

    function editMode(){
      editing = true;
      const c = current;
      const html =
        '<div class="ef-top"><div class="rc-sub">Edit curation</div>' +
          efRO('AI confidence', c.confidence, 'How sure the AI is about the identification. For your eyes only, never shown to buyers. Low confidence is a prompt to check the stamp yourself before publishing.') + '</div>' +
        ef('Toy', 'e_toy', c.toy, 'text', 'The name buyers search for. Keep it plain: the character or model, not a sales pitch.') +
        '<div class="ef-row">' + ef('Maker', 'e_maker', c.maker, 'text', 'The company that moulded it, taken from the stamp on the toy. This is what groups the lot under a Molder.') + ef('Year', 'e_year', c.year, 'text', 'Year or range moulded, from the copyright stamp. Not the year the film came out.') + '</div>' +
        ef('Line', 'e_line', c.line, 'text', 'The toy line it belongs to, such as Star Wars or Teenage Mutant Ninja Turtles.') +
        efSel('Condition', 'e_condition', c.condition, CONDITIONS, 'How it presents, from Mint down to Poor. This sets the star rating buyers see, so grade honestly: over-grading is the fastest way to a dispute.') +
        efArea('Completeness', 'e_completeness', c.completeness, 'What is and is not in the box. Name every missing accessory. Buyers forgive a missing blaster they were told about, not one they discover.') +
        // Its own field, in the same picker shape as parcel size so each option can
        // carry the line that explains it. Condition says how it looks; this says
        // why, and a collector needs both before bidding.
        '<div class="ef"><label class="ef-l" for="e_care">What you did to it</label>' +
          '<div class="sizepick carepick" id="e_care">' +
          CARE_LEVELS.map(cl => '<button type="button" class="sizebtn' + (c.careLevel === cl.id ? ' on' : '') + '" data-care="' + cl.id + '">' +
            '<b>' + cl.label + '</b><span>' + esc(cl.hint) + '</span></button>').join('') +
          '</div>' +
          '<div class="ef-h">Shown on the lot as its own line, because it changes what the piece is worth. A repainted figure and an original one are not the same object, and a buyer who finds out afterwards is a buyer who does not come back. "As found" is not a lesser answer: plenty of collectors want exactly that.</div>' +
        '</div>' +
        efArea('What was done', 'e_carenote', c.careNote, 'Only if you did something. What you fixed or replaced, and with what: a reattached arm, a repainted helmet, a replacement cape from another figure. Say which parts are not original. Left empty when nothing was done.') +
        '<div class="ef-row">' + ef('Starting price €', 'e_bid', c.startingBid, 'number', 'The opening price. Bidding starts here, so set it low enough to attract a first bid: a low start with competition usually beats a high start with none.') + ef('Reserve € (optional)', 'e_reserve', c.reserve, 'number', 'The lowest price you will actually accept, kept hidden. If bidding ends below it the lot does not sell. Buyers only ever see whether it has been met, never the number. Leave blank to sell at any price.') + '</div>' +
        '<div class="ef-row">' + efRO('Est. low €', c.estimateLow, 'The bottom of the value range the AI estimates. Guidance for setting your price, not shown to buyers.') + efRO('Est. high €', c.estimateHigh, 'The top of the value range the AI estimates. Guidance for setting your price, not shown to buyers.') + '</div>' +
        '<div class="ef-row">' + ef('Buy Now \u20ac (optional)', 'e_buynow', c.buyNow, 'number', 'An instant-purchase price that ends the auction on the spot. Set it above what you expect bidding to reach, or someone will simply take it. Leave blank for auction only.') + efSel('Auction length (days)', 'e_days', String(c.auctionDays || 7), DAYS, 'How long bidding runs, counted from the FIRST bid rather than from the day you list. Your lot waits in the shop until someone bids, so it does not disappear in a week nobody happened to look. Seven days is the default and catches two weekends. A bid in the final minutes extends the clock by two minutes, so it cannot be sniped.') + '</div>' +
        // Weight, and no postage price.
        //
        // Asking a seller to name a shipping amount was asking them to guess a
        // number that is almost never charged: the buyer picks a delivery option
        // at checkout and we re-price that live from the carrier for their own
        // country. The field's only real job was to be a fallback, and a fallback
        // belongs in a table we maintain, not in a guess from someone who has no
        // way of knowing what a parcel to Finland costs.
        '<div class="ef-row">' + ef('Weight kg', 'e_weight', c.weightKg, 'number', 'Packed weight in kilograms, including the box and padding. This is what the carrier prices on, so it is worth getting close.') + '</div>' +
        '<div class="ef"><label class="ef-l">Fits through a letterbox</label>' +
          '<label class="lb-check"><input type="checkbox" id="e_letterbox"' + (c.letterbox ? ' checked' : '') + '>' +
          '<span>Yes, it lies flat in an envelope under about 3.2 cm</span></label>' +
          '<div class="ef-h">Only tick this after actually laying it in an envelope. Postage is quoted from a carrier that checks weight and never thickness, so it will offer the cheapest letterbox rate for something that cannot go through a door. Ticked, a buyer can pick it and pay less. Unticked, they cannot.</div></div>' +
        '<div class="ef"><label class="ef-l" for="e_size">Parcel size</label>' +
          '<div class="sizepick" id="e_size">' +
          SIZE_CLASSES.map(sc => '<button type="button" class="sizebtn' + (c.sizeClass === sc.id ? ' on' : '') + '" data-size="' + sc.id + '">' +
            '<b>' + sc.label + '</b><span>' + esc(sc.hint) + '</span><i>' + sc.box + ' cm</i></button>').join('') +
          '</div>' +
          '<div class="ef-h">Postage is charged on whichever is greater, the weight or the space it takes up. A big hollow toy weighs almost nothing and still fills a box, so without this a large lot costs you more to post than you charged.</div></div>' +
        '<div class="ship-hint" id="shipHint"></div>' +
        efArea('Opening paragraph', 'e_blurb', c.blurb, 'The first thing a buyer reads. Two or three sentences on what this is and why this release. Keep the stamp and the measurements out of it, they live in Notes.') +
        efArea('Notes', 'e_notes', c.notes, 'The evidence, shown under Curator\'s notes: the moulded stamp, how it was dated, variants, repairs, repaints, replaced parts, provenance. This is where trust is won.') +
        '<div class="price-err" id="priceErr" hidden></div>' +
        '<div class="buy-row" style="margin-top:20px"><button class="btn accent" id="saveLot" type="button">Save changes</button><button class="btn ghost" id="cancelLot" type="button">Cancel</button></div>';
      setCard(html, false);
      (function(){
        const w = document.getElementById('e_weight'), hint = document.getElementById('shipHint');
        const sizeBox = document.getElementById('e_size');
        if (!w || !hint) return;
        function draw(){
          const kg = parseFloat(w.value) || 0;
          const sel = sizeBox && sizeBox.querySelector('.sizebtn.on');
          const sid = sel ? sel.dataset.size : null;
          const sc = sizeClass(sid);
          if (!kg && !sc){ hint.innerHTML = 'Enter a packed weight and pick a parcel size, and we will tell you what postage costs.'; return; }
          const q = shipQuote(kg, sid);
          // Say plainly which of the two is driving the price, because a seller
          // who is charged on volume and never told will think we got it wrong.
          const why = (sc && sc.vol > kg)
            ? 'A ' + sc.label.toLowerCase() + ' parcel bills as <b>' + sc.vol + ' kg</b> of space even at ' + (kg || 0) + ' kg on the scales'
            : 'At ' + kg + ' kg on the scales';
          // Shown so a seller can price the lot knowing what a parcel costs, not
          // so they can set it. There is nothing to apply any more: the buyer is
          // quoted live for their own country and pays that.
          hint.innerHTML = why + ', which is <b>' + q.band.toLowerCase() + '</b>: about ' +
            phrase('{nl} within the Netherlands, {eu} to the EU, {row} beyond it.', { nl: eur(q.nl), eu: eur(q.eu), row: eur(q.row) }) + ' ' +
            '<span style="color:var(--ink-3)">Your buyer is quoted their own country&rsquo;s rate at checkout and pays it.</span>';
        }
        if (sizeBox) sizeBox.addEventListener('click', e => {
          const b = e.target.closest('.sizebtn'); if (!b) return;
          sizeBox.querySelectorAll('.sizebtn').forEach(x => x.classList.toggle('on', x === b));
          draw();
        });
        // Same one-of-four behaviour, but it changes no price so it does not redraw
        // the shipping hint.
        const careBox = document.getElementById('e_care');
        if (careBox) careBox.addEventListener('click', e => {
          const b = e.target.closest('.sizebtn'); if (!b) return;
          careBox.querySelectorAll('.sizebtn').forEach(x => x.classList.toggle('on', x === b));
        });
        w.addEventListener('input', draw);
        draw();
      })();
      document.getElementById('saveLot').addEventListener('click', () => {
        const g = id => document.getElementById(id).value.trim();
        const num = id => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? undefined : v; };
        const next = { ...current,
          toy: g('e_toy'), maker: g('e_maker'), line: g('e_line'), year: g('e_year'),
          condition: g('e_condition'), completeness: g('e_completeness'),
          startingBid: num('e_bid'),
          reserve: num('e_reserve'), buyNow: num('e_buynow'), weightKg: num('e_weight'),
          sizeClass: (function(){ const b = document.querySelector('#e_size .sizebtn.on'); return b ? b.dataset.size : (current.sizeClass || null); })(),
          letterbox: (function(){ const el = document.getElementById('e_letterbox'); return el ? el.checked === true : (current.letterbox === true); })(),
          blurb: g('e_blurb'), notes: g('e_notes'),
          careLevel: (function(){ const b = document.querySelector('#e_care .sizebtn.on'); return b ? b.dataset.care : (current.careLevel || null); })(),
          careNote: g('e_carenote') || null,
          // estimateLow, estimateHigh and confidence are the AI's assessment and
          // are not editable, so they carry over from current untouched
          auctionDays: parseInt(g('e_days'), 10) || 7, edited: true,
        };
        const bad = priceProblem(next);
        if (bad){ showPriceError(bad); return; }
        current = next;
        viewMode();
      });
      document.getElementById('cancelLot').addEventListener('click', viewMode);
    }
  })();

  // ----- Seller profiles -----
  const SELLERS = {
    cornerstone: {
      name: 'Cornerstone Collectibles', handle: '@cornerstone', location: 'Hoofddorp, Netherlands',
      since: '2019', type: 'Dealer', verified: true, rating: 4.8, reviews: 214, sold: 1320, active: 4, followers: 486,
      bio: 'A vintage-toy dealer specialising in original Kenner Star Wars and The Real Ghostbusters. Twelve years on the show circuit before going online. Every piece is hand-inspected, photographed and shipped tracked.',
      lots: [
        { name: 'Millennium Falcon', meta: 'Star Wars · Kenner · 1979', bid: 340, bids: 7, ends: 53 },
        { name: 'X-Wing Fighter', meta: 'Star Wars · Kenner · 1978', bid: 145, bids: 4, ends: 20 },
        { name: 'Ecto-1', meta: 'Ghostbusters · Kenner · 1986', bid: 165, bids: 3, ends: 6 },
        { name: 'Slimer', meta: 'Ghostbusters · Kenner · 1986', bid: 40, bids: 2, ends: 96 },
      ],
    },
    tokyovinyl: {
      name: 'Tokyo Vinyl', handle: '@tokyovinyl', location: 'Amsterdam, Netherlands',
      since: '2021', type: 'Collector', verified: true, rating: 4.9, reviews: 63, sold: 210, active: 2, followers: 172,
      bio: 'A private collector of Japanese sofubi: Bullmark, Marusan and Popy kaiju from the tokusatsu boom. Sells only doubles from the personal collection. Slow, careful, obsessive about paint.',
      lots: [
        { name: 'Godzilla · sofubi', meta: 'Kaiju · Bullmark · 1970s', bid: 380, bids: 11, ends: 78 },
        { name: 'Ultraman · sofubi', meta: 'Kaiju · Marusan · 1966', bid: 260, bids: 5, ends: 40 },
      ],
    },
  };
  const nfmt = n => Number(n).toLocaleString('nl-NL');
  const eur2 = n => '€ ' + Number(n || 0).toLocaleString('nl-NL');
  function qstarsPct(pct){ return '<span class="qstars"><span class="base">★★★★★</span><span class="fill" style="width:' + pct + '%">★★★★★</span></span>'; }
  function fmtEnds(h){ const d = Math.floor(h / 24), r = Math.round(h % 24); return d > 0 ? d + 'd ' + r + 'h left' : r + 'h left'; }
  function statBlock(n, lab){ return '<div class="stat"><div class="s-num">' + n + '</div><div class="s-lab">' + lab + '</div></div>'; }

  function renderSeller(id){
    if (SB && /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(id)){ renderSellerDB(id); return; }
    const s = SELLERS[id] || SELLERS.cornerstone;
    document.getElementById('sellerCrumb').textContent = s.name;
    const mono = monogramOf(s.name);
    document.getElementById('sellerHead').innerHTML =
      '<section class="seller-hero">' +
        '<div class="seller-mono">' + mono + '</div>' +
        '<div class="seller-id">' +
          '<div class="ey">Seller · ' + s.type + ' · ' + s.location + '</div>' +
          '<h1 class="seller-name">' + s.name + '</h1>' +
          '<div class="seller-meta">' + s.handle + ' · ' + phrase('Member since {date}', { date: s.since }) + (s.verified ? ' · <span class="verified">✓ Verified</span>' : '') + '</div>' +
          '<div class="seller-rating">' + qstarsPct(s.rating / 5 * 100) + ' <b>' + s.rating.toFixed(1) + '</b> · ' + s.reviews + ' reviews</div>' +
          // Same controls as the real seller page. The demo sellers carry no social
          // handles, so there is nothing on the other side of a separator.
          '<div class="seller-soc">' + sellerActionsHtml() + '</div>' +
        '</div>' +
      '</section>' +
      '<div class="seller-stats">' + statBlock(nfmt(s.sold), 'Lots sold') + statBlock(s.active, 'Active lots') + statBlock(s.rating.toFixed(1), 'Avg rating') + statBlock(nfmt(s.followers), 'Followers') + '</div>' +
      '<p class="seller-bio">' + s.bio + '</p>';
    document.getElementById('followBtn').addEventListener('click', () => openModal('Following', phrase('You follow {seller}.', { seller: s.name }), 'On the live site you get notified when this seller lists a new lot. Layout preview.'));
    document.getElementById('msgBtn').addEventListener('click', () => openModal('Message', 'Contact ' + s.name + '.', 'On the live site this opens a message thread with the seller. Layout preview.'));

    document.getElementById('sellerLotsIntro').textContent = phrase('{seller} has {n} lots live right now.', { seller: s.name, n: s.lots.length });
    const grid = document.getElementById('sellerLots');
    grid.innerHTML = s.lots.map(l =>
      '<article class="artifact-card">' +
        '<div class="vitrine"' + (l.nav ? ' data-nav="' + l.nav + '"' : '') + '>' +
          '<span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>' +
          '<div class="vlabel"><div class="k">' + l.meta.split(' · ').slice(-2).join(' · ') + '</div><div class="n" style="font-size:19px">' + l.name + '</div></div>' +
        '</div>' +
        '<div class="label">' +
          '<div class="ln"><span class="nm">' + l.name + '</span></div>' +
          '<div class="meta">' + l.meta + '</div>' +
          '<div class="auc-card"><div><span class="amt">' + eur2(l.bid) + '</span><span class="sub">' + l.bids + ' bids</span></div><div class="cd">' + fmtEnds(l.ends) + '</div></div>' +
          '<button class="card-bid" type="button" data-name="' + l.name + '" data-bid="' + l.bid + '" data-bids="' + l.bids + '">Place a bid</button>' +
        '</div>' +
      '</article>'
    ).join('');
    grid.querySelectorAll('.card-bid').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); openBid(b.dataset.name, parseInt(b.dataset.bid, 10), parseInt(b.dataset.bids, 10)); }));
  }

  async function renderSellerDB(id){
    const e = s => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
    // e() is for text between tags and leaves the double quote alone, which is fine
    // there and unsafe inside an attribute. Everything a seller can now type ends up
    // in one: the logo in src, the shop name in alt. A name of Bob's "Toys" would
    // close the attribute early, and logo_url only has to START with our storage
    // prefix to satisfy its constraint, so '…/lots/x" onerror="…' passes the
    // database and lands in the markup. Stored XSS on a page other people read.
    const ea = s => e(s).replace(/"/g, '&quot;');
    const head = document.getElementById('sellerHead');
    document.getElementById('sellerCrumb').textContent = 'Seller';
    head.innerHTML = '<p style="font-family:var(--body);color:var(--ink-3);padding:32px 0">Loading seller…</p>';
    document.getElementById('sellerLots').innerHTML = '';
    // seller_public: the public columns only. profiles itself is own-row for a
    // signed-in user, so reading it here would return nothing for a visitor.
    const { data: prof } = await SB.from('seller_public').select('id,display_name,handle,type,location,bio,created_at,logo_url,instagram,x_handle,facebook').eq('id', id).single();
    const p = prof || {};
    const name = p.display_name || 'Seller';
    document.getElementById('sellerCrumb').textContent = name;
    const sel = 'id,toy,maker,line,year,status,starting_bid,buy_now,ends_at,image_urls,closed_at,created_at,sale_type';
    const { data: lotRows } = await SB.from('lots').select(sel).eq('seller_id', id).neq('status', 'draft').order('created_at', { ascending: false });
    const lots = lotRows || [];
    const now = Date.now();
    const isEnded = l => l.status === 'sold' || l.status === 'ended' || (l.ends_at && new Date(l.ends_at) <= now);
    const soldCount = lots.filter(l => l.status === 'sold').length;
    const liveLots = lots.filter(l => !isEnded(l));
    const ids = lots.map(l => l.id);
    const agg = {};
    if (ids.length){ const { data: bd } = await SB.from('bids').select('lot_id,amount').in('lot_id', ids); (bd || []).forEach(x => { const m = agg[x.lot_id] || { max: 0, count: 0 }; m.max = Math.max(m.max, Number(x.amount)); m.count++; agg[x.lot_id] = m; }); }
    let reviews = [];
    { const { data: rv } = await SB.from('reviews').select('rating,body,created_at,lots!inner(seller_id)').eq('lots.seller_id', id).order('created_at', { ascending: false }).limit(20); reviews = rv || []; }
    const revCount = reviews.length;
    const avg = revCount ? reviews.reduce((s, r) => s + Number(r.rating), 0) / revCount : 0;
    const mono = monogramOf(name);
    const since = p.created_at ? new Date(p.created_at).getFullYear() : '';
    head.innerHTML =
      '<section class="seller-hero">' +
        // The seller's own mark when they have set one, the monogram when they have
        // not. Same 88px box either way, so the page does not shift.
        (p.logo_url
          ? '<div class="seller-logo" id="sellerLogo"><img src="' + ea(p.logo_url) + '" alt="' + ea(name) + '" loading="lazy"></div>'
          : '<div class="seller-mono">' + e(mono) + '</div>') +
        '<div class="seller-id">' +
          '<div class="ey">Seller' + (p.type ? ' · ' + e(p.type) : '') + (p.location ? ' · ' + e(p.location) : '') + '</div>' +
          '<h1 class="seller-name">' + e(name) + '</h1>' +
          // A handle only when there is one. The old fallback built one from the
          // email prefix, which produced '@ramongervais+1' on the second account.
          (p.handle ? '<div class="seller-meta">@' + e(p.handle) + (since ? ' · ' + phrase('Member since {date}', { date: since }) : '') + '</div>'
                    : (since ? '<div class="seller-meta">Member since ' + since + '</div>' : '')) +
          (revCount ? '<div class="seller-rating">' + qstarsPct(avg / 5 * 100) + ' <b>' + avg.toFixed(1) + '</b> · ' + revCount + ' review' + (revCount > 1 ? 's' : '') + '</div>' : '') +
          // One row: what you can do to this seller, then where else to find them.
          // The separator carries that distinction without a word for it, and it is
          // only drawn when there is something on the far side of it.
          (() => {
            const soc = socItemsHtml(p);
            return '<div class="seller-soc">' + sellerActionsHtml() +
              (soc ? '<span class="soc-sep" aria-hidden="true"></span>' + soc : '') + '</div>';
          })() +
        '</div>' +
      '</section>' +
      '<div class="seller-stats">' + statBlock(soldCount, 'Lots sold') + statBlock(liveLots.length, 'Active lots') + statBlock(lots.length, 'Total lots') + statBlock(revCount ? avg.toFixed(1) : '-', 'Avg rating') + '</div>' +
      (p.bio ? '<p class="seller-bio">' + e(p.bio) + '</p>' : '') +
      (reviews.length ? '<div class="seller-reviews"><div class="ey" style="margin:28px 0 10px">Reviews</div>' + reviews.map(r => '<div class="rev-item"><div class="rev-item-h">' + qstarsPct(Number(r.rating) / 5 * 100) + '<span class="rev-date">' + new Date(r.created_at).toLocaleDateString(LOC()) + '</span></div>' + (r.body ? '<div class="rev-body">' + e(r.body) + '</div>' : '') + '</div>').join('') + '</div>' : '');
    // If the logo file is gone, fall back to the monogram rather than leaving a
    // broken image in the hero. Done here instead of an inline onerror: the same
    // markup nested three levels of quotes and could not be read.
    {
      const box = document.getElementById('sellerLogo');
      const img = box && box.querySelector('img');
      if (img) img.addEventListener('error', () => { box.className = 'seller-mono'; box.textContent = mono; });
    }
    document.getElementById('followBtn').addEventListener('click', () => openModal('Following', phrase('You follow {seller}.', { seller: name }), 'You will be notified when this seller lists a new lot.'));
    document.getElementById('msgBtn').addEventListener('click', () => openMessage(id, name));
    document.getElementById('sellerLotsIntro').textContent = liveLots.length
      ? phrase(liveLots.length === 1 ? '{seller} has {n} lot live right now.' : '{seller} has {n} lots live right now.', { seller: name, n: liveLots.length })
      : phrase('{seller} has no live lots right now.', { seller: name });
    const mapped = lots.map(l => { const a = agg[l.id] || { max: 0, count: 0 }; const state = l.status === 'sold' ? 'sold' : (l.status === 'preview' ? 'preview' : (isEnded(l) ? 'ended' : 'live')); const bidV = l.sale_type === 'fixed' ? Number(l.buy_now || l.starting_bid || 0) : (a.count ? a.max : ((state !== 'live' && l.buy_now) ? Number(l.buy_now) : l.starting_bid)); return { id: l.id, name: l.toy, maker: l.maker, line: l.line, year: l.year, bid: bidV, bids: a.count, img: (l.image_urls && l.image_urls[0]) || '', ends_at: l.ends_at, state, saleType: l.sale_type }; });
    const grid = document.getElementById('sellerLots');
    grid.innerHTML = mapped.length ? mapped.map(lotCardHtml).join('') : '<div class="acct-empty">No lots yet.</div>';
    grid.querySelectorAll('.card-bid.draft-bid').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); openBid(b.dataset.name, parseInt(b.dataset.bid, 10) || 0, parseInt(b.dataset.bids, 10) || 0, b.dataset.lot || null); }));
    show('seller', { extra: id });
  }

  // ----- Draft lots (browser-local persistence) -----
  function loadDraftLots(){ try { return JSON.parse(localStorage.getItem('pe_lots_v1') || '[]'); } catch (e) { return []; } }
  function saveDraftLot(c){
    const lots = loadDraftLots();
    lots.unshift({ name: c.toy || 'Untitled lot', maker: c.maker || '', line: c.line || '', year: c.year || '', condition: c.condition || '', bid: c.startingBid || 0, days: c.auctionDays || 7, ts: Date.now() });
    try { localStorage.setItem('pe_lots_v1', JSON.stringify(lots.slice(0, 20))); } catch (e) {}
    injectDraftLots();
  }
  let injectGen = 0;
  let shopSort = 'newest';
  const SHOP_PAGE = 24;          // lots per page in the shop grid
  let shopPage = 1;              // how many pages are currently loaded
  let shopQuery = '';            // the live search term, matched server-side
  let shopMaker = '';            // maker chip, matched server-side with ilike
  let shopSearchTimer = null;

  // ----- Watchlist -----
  // Soft-cornered white star (rounded joins = friendlier); filled when watching.
  function watchStarSvg(on){
    return '<svg class="wstar" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
      '<polygon points="12,2.7 14.75,8.65 21.3,9.35 16.4,13.85 17.85,20.4 12,17 6.15,20.4 7.6,13.85 2.7,9.35 9.25,8.65" ' +
      'fill="' + (on ? '#ffffff' : 'none') + '" stroke="#ffffff" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  let watchedIds = new Set();
  async function loadWatchlist(){
    if (!SB || !authUser){ watchedIds = new Set(); return; }
    try { const { data } = await SB.from('watchlist').select('lot_id').eq('user_id', authUser.id); watchedIds = new Set((data || []).map(r => r.lot_id)); } catch (e) { watchedIds = new Set(); }
  }
  async function toggleWatch(el){
    const id = el.dataset.watch; if (!id) return;
    if (SB && !authUser){ openAuth(); return; }
    const on = !watchedIds.has(id);
    if (on) watchedIds.add(id); else watchedIds.delete(id);
    document.querySelectorAll('[data-watch="' + id + '"]').forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.innerHTML = watchStarSvg(on); });
    try {
      if (!SB) return;
      if (on) await SB.from('watchlist').insert({ user_id: authUser.id, lot_id: id });
      else await SB.from('watchlist').delete().eq('user_id', authUser.id).eq('lot_id', id);
    } catch (e) {}
  }

  // Shared shop/sold card. l.state = 'live' | 'ended' | 'sold' (undefined = live).
  // Shop cards load the small copy uploaded alongside each photo. Lots created
  // before browser-side resizing have no _card.jpg, so the <img> falls back to the
  // full image on error and nothing breaks.
  const cardSrc = u => String(u || '').replace(/\.(jpe?g|png|webp)(\?.*)?$/i, '_card.jpg$2');

  function lotCardHtml(l){
    const e = s => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
    const money = n => '€ ' + Number(n || 0).toLocaleString('nl-NL');
    const isPreview = l.state === 'preview';
    const isSold = l.state === 'sold';
    const ended = l.state === 'ended' || (!isPreview && !isSold && l.ends_at && new Date(l.ends_at) <= Date.now());
    const isClosed = isSold || ended;
    const badgeWord = isSold ? 'Sold' : 'Ended';
    const isFixed = l.saleType === 'fixed';
    const endsTxt = isPreview ? 'In preview' : (isClosed ? badgeWord : (isFixed ? 'Direct sale' : (l.ends_at ? (() => { const ms = new Date(l.ends_at) - Date.now(); const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000); return d > 0 ? d + 'd ' + h + 'h left' : h + 'h left'; })() : ((l.days || 7) + ' days from first bid'))));
    return '<article class="artifact-card draft-lot">' +
      '<div class="vitrine' + (isClosed ? ' closed' : '') + '"' + (l.id ? ' data-nav="lot" data-lot="' + e(l.id) + '" style="cursor:pointer"' : '') + '>' +
        (l.img ? '<img class="cardimg" src="' + e(cardSrc(l.img)) + '" data-full="' + e(l.img) + '" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.full">' : '') +
        (isClosed ? '<span class="card-badge">' + badgeWord + '</span>' : (isPreview ? '<span class="card-badge sand">Preview</span>' : (l.extended ? '<span class="card-badge sand">Extended +2 min</span>' : ''))) +
        (!isClosed && l.id ? '<button class="watch-btn' + (watchedIds.has(l.id) ? ' on' : '') + '" type="button" data-watch="' + e(l.id) + '" aria-label="Watch this lot" aria-pressed="' + (watchedIds.has(l.id) ? 'true' : 'false') + '">' + watchStarSvg(watchedIds.has(l.id)) + '</button>' : '') +
        '<span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>' +
        (l.img ? '' : '<div class="vlabel"><div class="k">' + e([l.maker, l.year].filter(Boolean).join(' · ')) + '</div><div class="n" style="font-size:19px">' + e(l.name) + '</div></div>') + '</div>' +
      // The title is a real link now. It was an anchor with the destination in a
      // data attribute and the routing in JavaScript, which is a piece of text to
      // a crawler, so all twenty-four lots were reachable only through the
      // sitemap. The router still calls preventDefault, so clicking is unchanged
      // and middle-click now works.
      '<div class="label"><div class="ln">' + (l.id ? '<a class="nm" href="/lot/' + encodeURIComponent(l.id) + '/" data-nav="lot" data-lot="' + e(l.id) + '">' + e(l.name) + '</a>' : '<span class="nm">' + e(l.name) + '</span>') + '</div>' +
        // makerLabel, not the raw maker. The curation writes free text and the
        // bracketed half is provenance for the lot page, not for a card: today
        // that already puts "HASBRO (TITAN SPORTS INC.)" on a card next to a line
        // that says the same thing, and a longer note would push the year off.
        '<div class="meta">' + e([l.line, makerLabel(l.maker), l.year].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="auc-card"><div><span class="amt">' + money(l.bid) + '</span><span class="sub">' + (isClosed ? (l.bids ? l.bids + ' bids' : 'Final price') : (isPreview ? 'Starting bid' : (isFixed ? 'Fixed price' : (l.bids || 0) + ' bids'))) + '</span></div><div class="cd' + (!isClosed && (l.extended || isPreview) ? ' extended' : '') + '">' + endsTxt + '</div></div>' +
        // Under the price, not beside it, so the number a buyer actually pays
        // reads as one thought. Closed lots leave it out: nothing is shipping.
        // No delivery figure on a card, on Ramon's call. Sixteen of them down a
        // grid is sixteen small numbers competing with the one that matters, and
        // a shopper scanning a wall of toys is choosing what to look at, not what
        // to pay. It belongs on the lot page, where someone has already decided
        // to consider this piece and the postage is part of the real total.
        (isClosed ? '<div class="card-ended" data-nav="lot" data-lot="' + e(l.id || '') + '">' + badgeWord + ' · view result</div>' : (isPreview ? '<div class="card-ended" data-nav="lot" data-lot="' + e(l.id || '') + '">In preview</div>' : (isFixed ? '<div class="card-ended" data-nav="lot" data-lot="' + e(l.id || '') + '">Buy now &middot; ' + money(l.bid) + '</div>' : '<button class="card-bid draft-bid" type="button" data-name="' + e(l.name) + '" data-bid="' + (l.bid || 0) + '" data-bids="' + (l.bids || 0) + '" data-lot="' + e(l.id || '') + '">Place a bid</button>'))) +
      '</div></article>';
  }

  // Buyer protection. Every line is something we can actually do ourselves,
  // because a promise we cannot keep is worse than no promise.
  //
  // Transit damage is NOT framed as an insurance claim, and that is deliberate.
  // Sendcloud were asked in writing on 24 Aug 2026 whether vintage collectible
  // toys fall under their "antiques and artwork" exclusion, and their answer was
  // that they cannot say: read the policy for the chosen service, and ask the
  // carrier. A promise that rests on someone else deciding, per claim, whether a
  // 1991 Hasbro wrestler counts as an antique is not a promise.
  //
  // So the wording rests on nothing external. Under CRD Art. 20 the risk stays
  // with us until the buyer has the goods, which cannot be disclaimed to a
  // consumer anyway. We say that, we pay it, and whether a carrier reimburses us
  // afterwards is our problem and never the buyer's. The word "insured" appears
  // nowhere on the site for the same reason.
  const PROTECTION = [
    ['Checked before it is listed', 'Every lot is identified, dated and condition-graded, with the maker\u2019s stamp photographed. Nothing goes up unexamined.'],
    ['It arrives, or your money back', 'Posted tracked. If it never reaches you, you are refunded in full.'],
    ['It matches the listing, or your money back', 'If what arrives is materially different from the description, send it back and you are refunded, and we pay the return postage. If you simply change your mind, the return is on you: send it back within 14 days at your own cost and you are refunded for the item.'],
    ['Damage in transit is our problem, not yours', 'Until a parcel reaches you the risk is ours, and that is not something we could disclaim even if we wanted to. Tell us within 48 hours with photos, keep the packaging, and we put it right.'],
    ['You pay us, not a stranger', 'Card payment through Stripe. Your card details never reach the seller or us.']
  ];

  // Shipping policy, stated in one place so the lot page, the Terms and the Sell
  // page cannot drift apart. EU consumer law wants the total price including
  // delivery shown before the order is placed, so this must always be visible
  // and must never be invoiced afterwards.
  const SHIPPING = {
    zones: 'Netherlands and the EU',
    detail: 'Tracked',
    MAX: 60,                          // sanity cap; postage is not a hidden fee
    eur: function(n){ return '€ ' + Number(n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    // A lot with no amount set ships free, so nothing changes for existing lots.
    // Zero does not mean the same thing in both places, and the difference
    // matters. On a fixed price the price is known, so postage can genuinely be
    // inside it. On an auction there is no price yet: at the moment a lot is
    // listed nobody knows whether it will fetch 18 or 80, so "included in the
    // price" claims something that does not exist. What zero actually means
    // there is that the seller pays the postage whatever the hammer comes to,
    // which is a legitimate choice and a completely different sentence.
    label: function(n, saleType){
      if (Number(n || 0) > 0) return this.eur(n);
      return saleType === 'fixed' ? 'Included in the price' : 'Free, paid by the seller';
    },
    // There was a line() here that read all three shipping_*_eur columns and
    // named a price per zone. Nothing called it any more and every figure it
    // could return came from an estimated table, so it was a wrong answer
    // waiting for a caller. The carriers are quoted live instead.
  };

  // The delivery figure that sits under a price, the way eBay puts "+ $29.64
  // delivery" under "$40.00". One number, not three: the Netherlands rate,
  // because that is this market. The other destinations stay in the spec table
  // lower down the lot page, which is where eBay puts them too.
  //
  // Falls back to the EU amount when no Netherlands amount is set, because a
  // missing figure is an unset price, not free delivery.
  // The headline figure is the seller's OWN country, because that is where most
  // of a lot's bidders are and it is the price most buyers will actually pay.
  // Quoting the cross-border rate up front would overstate it for the majority.
  //
  // Every seller today posts from the Netherlands, so this is the nl column.
  // When the first non-Dutch seller signs up, that column is the DOMESTIC rate
  // and the label wants their country: seller_public does not expose country
  // yet, so that is one line of SQL and one line here, not a redesign.
  const SELLER_HOME = 'the Netherlands';

  // A fillCardDelivery lived here and quoted every card in the grid from the
  // carriers in one request. It worked, and the grid read better without it, so
  // the delivery figure now appears only on a lot page. The /shipping-quotes
  // endpoint it called stays on the pay worker: it answers correctly and costs
  // nothing unqueried, and it is what a card would need if that changes back.

  const FEATURED_MAX = 8;   // the shop grid is 4-up, so at most two rows of promoted lots

  async function injectDraftLots(){
    const grid = document.querySelector('#collection .collection');
    if (!grid) return;
    const gen = ++injectGen;
    const e = s => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
    const money = n => '€ ' + Number(n || 0).toLocaleString('nl-NL');
    let lots = [], activeTotal = 0, activeShown = 0;
    if (SB) {
      // No shipping column here on purpose. A card names no delivery figure at
      // all now, and if it ever does again it will come from the carriers rather
      // than from a stored estimate that was wrong on every lot.
      const COLS = 'id,toy,maker,line,year,starting_bid,buy_now,image_urls,ends_at,status,closed_at,created_at,extended,sale_type';
      const since = new Date(Date.now() - 86400000).toISOString();
      // ilike patterns go inside an or() string, so strip what would break it
      const q = shopQuery.replace(/[,()*%\\]/g, ' ').trim();
      const searchOr = q ? 'toy.ilike.*' + q + '*,maker.ilike.*' + q + '*,line.ilike.*' + q + '*' : '';
      // Ordered in Postgres, not in the browser, so page two is consistent with
      // page one. Price sorts on the opening bid: the current bid is an
      // aggregate over the bids table and cannot be an ORDER BY here.
      const applySort = qb => shopSort === 'ending' ? qb.order('ends_at', { ascending: true, nullsFirst: false })
        : shopSort === 'price-asc' ? qb.order('starting_bid', { ascending: true })
        : shopSort === 'price-desc' ? qb.order('starting_bid', { ascending: false })
        : qb.order('created_at', { ascending: false });

      // The maker written by the curation is free text ("Hasbro (Titan Sports)",
      // "Imperial Toy Corp (under license from Toho...)"), so the chip carries the
      // part before the first bracket or comma and matches on that with ilike.
      const mk = shopMaker.replace(/[,()*%\\]/g, ' ').trim();

      let activeQ = SB.from('lots').select(COLS, { count: 'exact' }).in('status', ['live', 'preview']);
      if (searchOr) activeQ = activeQ.or(searchOr);
      if (mk) activeQ = activeQ.ilike('maker', '%' + mk + '%');
      activeQ = applySort(activeQ).range(0, shopPage * SHOP_PAGE - 1);

      let closedQ = SB.from('lots').select(COLS).in('status', ['ended', 'sold']).gte('closed_at', since);
      if (searchOr) closedQ = closedQ.or(searchOr);
      if (mk) closedQ = closedQ.ilike('maker', '%' + mk + '%');
      closedQ = closedQ.order('closed_at', { ascending: false }).limit(SHOP_PAGE);

      // featured_active is a view over the admin's paid placements: lot_id + rank only,
      // already filtered to the open window. It does not exist until admin/schema.sql
      // has been run, so a missing view simply means nothing is promoted.
      const [actRes, closedRes, featRes] = await Promise.all([
        activeQ, closedQ, SB.from('featured_active').select('lot_id,rank')
      ]);
      activeTotal = Number(actRes.count || 0);
      const activeRows = actRes.data || [];
      activeShown = activeRows.length;
      const rows = activeRows.concat(closedRes.data || []);
      const featRank = {};
      if (!featRes.error) (featRes.data || []).forEach(f => { featRank[f.lot_id] = Number(f.rank || 0); });
      const now = Date.now();
      const ids = rows.map(r => r.id);
      const agg = {};
      if (ids.length) {
        const { data: bd } = await SB.from('bids').select('lot_id,amount').in('lot_id', ids);
        (bd || []).forEach(x => { const m = agg[x.lot_id] || { max: 0, count: 0 }; m.max = Math.max(m.max, Number(x.amount)); m.count++; agg[x.lot_id] = m; });
      }
      lots = rows.map(r => {
        const a = agg[r.id] || { max: 0, count: 0 };
        const timeEnded = r.ends_at && new Date(r.ends_at) <= now;
        const state = r.status === 'sold' ? 'sold' : (r.status === 'preview' ? 'preview' : ((r.status === 'ended' || timeEnded) ? 'ended' : 'live'));
        const closedMs = r.closed_at ? new Date(r.closed_at).getTime() : ((state !== 'live' && r.ends_at) ? new Date(r.ends_at).getTime() : new Date(r.created_at).getTime());
        const bidVal = (r.sale_type === 'fixed') ? Number(r.buy_now || r.starting_bid || 0) : (a.count ? a.max : ((state !== 'live' && r.buy_now) ? Number(r.buy_now) : r.starting_bid));
        return { id: r.id, name: r.toy, maker: r.maker, line: r.line, year: r.year, bid: bidVal, bids: a.count, img: (r.image_urls && r.image_urls[0]) || '', ends_at: r.ends_at, state, closedMs, extended: r.extended, saleType: r.sale_type, featured: Object.prototype.hasOwnProperty.call(featRank, r.id), featRank: featRank[r.id] || 0 };
      });
    } else {
      lots = loadDraftLots();
    }
    if (gen !== injectGen) return;

    // A featured lot buys a promoted slot at the top of the shop. Only an open
    // lot earns one, and it is lifted out of the main grid so it never doubles.
    // During a search the strip is hidden and promoted lots compete in the
    // results like everything else, which is what someone searching expects.
    if (shopPage === 1) renderMakerBar();
    const searching = !!shopQuery.trim();
    const promoted = searching ? [] : lots.filter(l => l.featured && (l.state === 'live' || l.state === 'preview'))
      .sort((a, b) => (a.featRank || 0) - (b.featRank || 0))
      .slice(0, FEATURED_MAX);
    const promotedSet = new Set(promoted);
    const rest = lots.filter(l => !promotedSet.has(l));

    const fstrip = document.getElementById('featuredStrip');
    const fgrid = document.getElementById('featuredGrid');
    if (fgrid) fgrid.innerHTML = promoted.map(lotCardHtml).join('');
    if (fstrip) fstrip.hidden = !promoted.length;

    // The placeholders go the moment there is something real to put in their
    // place, and not before: removing them earlier would collapse the grid and
    // cause the very shift they exist to prevent.
    grid.querySelectorAll('.sk').forEach(el => el.remove());
    grid.querySelectorAll('.artifact-card.draft-lot').forEach(el => el.remove());
    if (rest.length) grid.insertAdjacentHTML('afterbegin', rest.map(lotCardHtml).join(''));

    document.querySelectorAll('#collection .card-bid.draft-bid').forEach(b => { if (b.dataset.w) return; b.dataset.w = '1'; b.addEventListener('click', ev => { ev.stopPropagation(); openBid(b.dataset.name, parseInt(b.dataset.bid, 10) || 0, parseInt(b.dataset.bids, 10) || 0, b.dataset.lot || null); }); });


    // Count what is really there, and offer the rest rather than silently
    // dropping it the way the old fixed limit of 48 did.
    const count = document.getElementById('shopCount');
    if (count){
      const onScreen = document.querySelectorAll('#collection .artifact-card').length;
      count.textContent = !onScreen ? (searching ? 'No lots match' : '')
        : (activeShown < activeTotal ? onScreen + ' of ' + activeTotal + ' lots'
           : onScreen + ' lot' + (onScreen === 1 ? '' : 's'))
          + (searching ? ' matching your search' : '');
    }
    const empty = document.getElementById('shopEmpty');
    if (empty) empty.hidden = !(searching && !document.querySelectorAll('#collection .artifact-card').length);

    let more = document.getElementById('shopMore');
    if (activeShown < activeTotal){
      if (!more){
        more = document.createElement('div');
        more.id = 'shopMore';
        more.className = 'shop-more';
        more.innerHTML = '<button class="btn ghost" type="button">Load more</button>';
        grid.parentNode.insertBefore(more, grid.nextSibling);
        more.querySelector('button').addEventListener('click', () => {
          const b = more.querySelector('button');
          b.disabled = true; b.textContent = 'Loading…';
          shopPage++;
          injectDraftLots();
        });
      }
      const b = more.querySelector('button');
      b.disabled = false;
      b.textContent = phrase('Load more · {n} of {total} left', { n: Math.min(SHOP_PAGE, activeTotal - activeShown), total: activeTotal - activeShown });
      more.hidden = false;
    } else if (more) { more.hidden = true; }
  }

  // ----- Shop search (matched in Postgres, so it finds lots that are not loaded) -----
  function applyShopSearch(){
    const input = document.getElementById('shopSearch'); if (!input) return;
    const next = input.value.trim();
    if (next === shopQuery) return;
    shopQuery = next;
    shopPage = 1;                 // a new search starts from the first page
    injectDraftLots();
  }
  function queueShopSearch(){
    clearTimeout(shopSearchTimer);
    shopSearchTimer = setTimeout(applyShopSearch, 300);   // it hits the network now
  }

  // ----- Maker chips under For sale -----
  // Built from the makers that actually have lots for sale, so a chip can never
  // lead to an empty shop. The curation writes maker as free text ("Hasbro
  // (Titan Sports)"), so the chip label is the part before the first bracket or
  // comma and the filter matches on that.
  // A declaration rather than a const, so it is hoisted. lotCardHtml calls it
  // several hundred lines above this point and only gets away with it because
  // nothing renders a card during evaluation. A const would put that on a
  // temporal dead zone; a function makes the order not matter.
  function makerLabel(m){ return String(m || '').split(/[(,]/)[0].trim(); }
  // Local, because esc() lives inside the sell closure. Quotes matter here: the
  // label goes into a data attribute and it comes from the database.
  const mkEsc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function renderMakerBar(){
    const bar = document.getElementById('makerBar');
    const box = document.getElementById('makerFilter');
    if (!bar || !box || !SB) return;
    const { data, error } = await SB.from('lots').select('maker').in('status', ['live', 'preview']);
    if (error) return;
    const seen = new Map();                       // lowercase key -> display label
    (data || []).forEach(r => {
      const l = makerLabel(r.maker);
      if (l && !seen.has(l.toLowerCase())) seen.set(l.toLowerCase(), l);
    });
    const makers = [...seen.values()].sort((a, b) => a.localeCompare(b));
    // One maker is not a filter, it is a label. Two or more earns the bar.
    if (makers.length < 2){ bar.hidden = true; return; }
    bar.hidden = false;
    box.innerHTML = '<button class="fchip' + (shopMaker ? '' : ' on') + '" data-mk="">All</button>' +
      makers.map(m => '<button class="fchip' + (shopMaker === m ? ' on' : '') + '" data-mk="' + mkEsc(m) + '">' + mkEsc(m) + '</button>').join('');
    fillShopMenu(makers);
  }

  // The Shop menu lists whoever currently has stock, from the same data as the
  // filter bar above the grid. A menu built by hand would go stale the first
  // time a maker sold out, and offer a category that answers with nothing.
  function fillShopMenu(makers){
    const box = document.getElementById('shopDropMakers');
    const lbl = document.getElementById('shopDropLbl');
    if (!box) return;
    if (!makers || makers.length < 2){ box.innerHTML = ''; if (lbl) lbl.textContent = ''; return; }
    if (lbl) lbl.textContent = 'By molder';
    box.innerHTML = makers.map(m =>
      '<a href="/#collection" data-shopmk="' + mkEsc(m) + '" role="menuitem">' + mkEsc(m) + '</a>').join('');
  }

  // ----- The two nav menus -----
  (function(){
    const drops = [...document.querySelectorAll('.navdrop')];
    if (!drops.length) return;
    const close = (d) => { d.removeAttribute('data-open'); d.querySelector('.navtop').setAttribute('aria-expanded', 'false'); };
    const open = (d) => { drops.forEach(x => x !== d && close(x)); d.setAttribute('data-open', ''); d.querySelector('.navtop').setAttribute('aria-expanded', 'true'); };
    // Hover is the desktop affordance and a trap on a touch screen, where the
    // first tap would both open and follow. Pointer query, not screen width.
    const hoverable = window.matchMedia && window.matchMedia('(hover:hover)').matches;
    drops.forEach(d => {
      const btn = d.querySelector('.navtop');
      btn.addEventListener('click', (e) => { e.stopPropagation(); d.hasAttribute('data-open') ? close(d) : open(d); });
      if (hoverable){
        d.addEventListener('mouseenter', () => open(d));
        d.addEventListener('mouseleave', () => close(d));
      }
      d.addEventListener('focusout', (e) => { if (!d.contains(e.relatedTarget)) close(d); });
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.navdrop')) drops.forEach(close); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') drops.forEach(close); });
  })();

  // A category in the menu is the filter chip in the shop, so there is one
  // definition of what a category is and the two can never disagree.
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-shopmk]');
    if (!a) return;
    e.preventDefault();
    document.querySelectorAll('.navdrop').forEach(d => { d.removeAttribute('data-open'); const b = d.querySelector('.navtop'); if (b) b.setAttribute('aria-expanded', 'false'); });
    shopMaker = a.dataset.shopmk || '';
    shopPage = 1;
    document.querySelectorAll('#makerFilter .fchip').forEach(x => x.classList.toggle('on', (x.dataset.mk || '') === shopMaker));
    const go = () => {
      if (typeof injectDraftLots === 'function') injectDraftLots();
      const t = document.getElementById('collection') || document.getElementById('makerBar');
      if (t) t.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };
    if (views && views.home && views.home.hidden){ show('home'); setTimeout(go, 60); } else go();
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('#makerFilter .fchip');
    if (!b) return;
    const mk = b.dataset.mk || '';
    if (mk === shopMaker) return;
    shopMaker = mk;
    shopPage = 1;                               // a new filter starts from page one
    document.querySelectorAll('#makerFilter .fchip').forEach(x => x.classList.toggle('on', (x.dataset.mk || '') === shopMaker));
    injectDraftLots();
  });

  // ----- Sold archive page (all past results) -----
  let soldPage = 1;
  async function renderSold(reset){
    const grid = document.getElementById('soldGrid');
    const countEl = document.getElementById('soldCount');
    const moreEl = document.getElementById('soldMore');
    if (!grid) return;
    if (reset !== false) soldPage = 1;
    if (soldPage === 1) grid.innerHTML = '<p style="font-family:var(--body);color:var(--ink-3);padding:24px 0">Loading past results…</p>';
    if (!SB){ grid.innerHTML = '<p style="font-family:var(--body);padding:24px 0">Past results are available on the live site.</p>'; return; }

    // Filtered and ordered in Postgres. The old version fetched every non-draft
    // lot and filtered to sold/ended in the browser, so live and preview lots
    // ate the row budget and the archive shrank as the shop grew.
    const res = await SB.from('lots')
      .select('id,toy,maker,line,year,starting_bid,buy_now,image_urls,ends_at,status,closed_at,created_at', { count: 'exact' })
      .in('status', ['sold', 'ended'])
      .order('closed_at', { ascending: false, nullsFirst: false })
      .range(0, soldPage * SHOP_PAGE - 1);
    if (res.error){ grid.innerHTML = '<p style="font-family:var(--body);padding:24px 0">Could not load past results.</p>'; return; }
    const rows = res.data || [], total = Number(res.count || 0);

    const ids = rows.map(r => r.id);
    const agg = {};
    if (ids.length){ const { data: bd } = await SB.from('bids').select('lot_id,amount').in('lot_id', ids); (bd || []).forEach(x => { const m = agg[x.lot_id] || { max: 0, count: 0 }; m.max = Math.max(m.max, Number(x.amount)); m.count++; agg[x.lot_id] = m; }); }
    const mapped = rows.map(r => {
      const a = agg[r.id] || { max: 0, count: 0 };
      const state = r.status === 'sold' ? 'sold' : 'ended';
      return { id: r.id, name: r.toy, maker: r.maker, line: r.line, year: r.year, bid: a.count ? a.max : (r.buy_now ? Number(r.buy_now) : r.starting_bid), bids: a.count, img: (r.image_urls && r.image_urls[0]) || '', ends_at: r.ends_at, state, closedMs: r.closed_at ? new Date(r.closed_at).getTime() : (r.ends_at ? new Date(r.ends_at).getTime() : new Date(r.created_at).getTime()) };
    });
    grid.innerHTML = mapped.length ? mapped.map(lotCardHtml).join('') : '<p style="font-family:var(--body);color:var(--ink-3);padding:24px 0">No past results yet.</p>';
    if (countEl) countEl.textContent = total ? (mapped.length < total ? mapped.length + ' of ' + total + ' results' : total + ' result' + (total === 1 ? '' : 's')) : '';
    if (moreEl){
      const btn = moreEl.querySelector('button');
      if (mapped.length < total){
        moreEl.hidden = false;
        btn.disabled = false;
        btn.textContent = phrase('Load more · {n} of {total} left', { n: Math.min(SHOP_PAGE, total - mapped.length), total: total - mapped.length });
        if (!btn.dataset.w){
          btn.dataset.w = '1';
          btn.addEventListener('click', () => { btn.disabled = true; btn.textContent = 'Loading…'; soldPage++; renderSold(false); });
        }
      } else moreEl.hidden = true;
    }
  }

  // ----- The seller's own shopfront -----
  //
  // Two things at once, because the second turned out to be missing altogether.
  // The logo and social handles are new. But display_name, handle, type, location
  // and bio have been rendered on the public seller page since the beginning with
  // nothing anywhere that could write them: a seller could not set their own name,
  // and both live accounts still show a null handle, which is why the page falls
  // back to '@' + the email prefix and one of them reads '@ramongervais+1'.
  //
  // Handles, never URLs. The database only accepts a bare handle, so the site
  // builds the address. A free URL field on a public profile is a phishing surface:
  // a seller types https://evil.example/login and it renders as a link on
  // hammerandmold.com. The @ is drawn as a prefix rather than typed, so it cannot
  // be stored and cannot trip the constraint.
  // The marks Ramon supplied as SVG, read straight from the files rather than
  // retyped. Three things changed on the way in.
  //
  // The clipPath wrappers are gone. Both Facebook and Instagram shipped inside a
  // <g clip-path> pointing at a full-size rect, so it clipped nothing, and it
  // carried a FIXED id. These icons render twice on a page, on a seller and in
  // the footer, and two elements with the same id in one document is a real bug
  // waiting for the day one of them is referenced.
  //
  // fill="white" is gone too: the CSS paints them with currentColor, which is what
  // makes one file work on the light theme and the dark one.
  //
  // viewBox is carried per icon because these are 48 and the old ones were 24.
  // Instagram is three separate paths and needs no fill-rule: the standard
  // winding already leaves the ring open. Verified by rendering, not assumed.
  const SOC = [
    { key: 'instagram', label: 'Instagram', base: 'https://www.instagram.com/', max: 30,
      vb: '0 0 48 48',
      paths: [
        'M24 4.32187C30.4125 4.32187 31.1719 4.35 33.6938 4.4625C36.0375 4.56562 37.3031 4.95938 38.1469 5.2875C39.2625 5.71875 40.0688 6.24375 40.9031 7.07812C41.7469 7.92188 42.2625 8.71875 42.6938 9.83438C43.0219 10.6781 43.4156 11.9531 43.5188 14.2875C43.6313 16.8187 43.6594 17.5781 43.6594 23.9813C43.6594 30.3938 43.6313 31.1531 43.5188 33.675C43.4156 36.0188 43.0219 37.2844 42.6938 38.1281C42.2625 39.2438 41.7375 40.05 40.9031 40.8844C40.0594 41.7281 39.2625 42.2438 38.1469 42.675C37.3031 43.0031 36.0281 43.3969 33.6938 43.5C31.1625 43.6125 30.4031 43.6406 24 43.6406C17.5875 43.6406 16.8281 43.6125 14.3063 43.5C11.9625 43.3969 10.6969 43.0031 9.85313 42.675C8.7375 42.2438 7.93125 41.7188 7.09688 40.8844C6.25313 40.0406 5.7375 39.2438 5.30625 38.1281C4.97813 37.2844 4.58438 36.0094 4.48125 33.675C4.36875 31.1438 4.34063 30.3844 4.34063 23.9813C4.34063 17.5688 4.36875 16.8094 4.48125 14.2875C4.58438 11.9437 4.97813 10.6781 5.30625 9.83438C5.7375 8.71875 6.2625 7.9125 7.09688 7.07812C7.94063 6.23438 8.7375 5.71875 9.85313 5.2875C10.6969 4.95938 11.9719 4.56562 14.3063 4.4625C16.8281 4.35 17.5875 4.32187 24 4.32187ZM24 0C17.4844 0 16.6688 0.028125 14.1094 0.140625C11.5594 0.253125 9.80625 0.665625 8.2875 1.25625C6.70312 1.875 5.3625 2.69062 4.03125 4.03125C2.69063 5.3625 1.875 6.70313 1.25625 8.27813C0.665625 9.80625 0.253125 11.55 0.140625 14.1C0.028125 16.6687 0 17.4844 0 24C0 30.5156 0.028125 31.3312 0.140625 33.8906C0.253125 36.4406 0.665625 38.1938 1.25625 39.7125C1.875 41.2969 2.69063 42.6375 4.03125 43.9688C5.3625 45.3 6.70313 46.125 8.27813 46.7344C9.80625 47.325 11.55 47.7375 14.1 47.85C16.6594 47.9625 17.475 47.9906 23.9906 47.9906C30.5063 47.9906 31.3219 47.9625 33.8813 47.85C36.4313 47.7375 38.1844 47.325 39.7031 46.7344C41.2781 46.125 42.6188 45.3 43.95 43.9688C45.2812 42.6375 46.1063 41.2969 46.7156 39.7219C47.3063 38.1938 47.7188 36.45 47.8313 33.9C47.9438 31.3406 47.9719 30.525 47.9719 24.0094C47.9719 17.4938 47.9438 16.6781 47.8313 14.1188C47.7188 11.5688 47.3063 9.81563 46.7156 8.29688C46.125 6.70312 45.3094 5.3625 43.9688 4.03125C42.6375 2.7 41.2969 1.875 39.7219 1.26562C38.1938 0.675 36.45 0.2625 33.9 0.15C31.3313 0.028125 30.5156 0 24 0Z',
        'M24 11.6719C17.1938 11.6719 11.6719 17.1938 11.6719 24C11.6719 30.8062 17.1938 36.3281 24 36.3281C30.8062 36.3281 36.3281 30.8062 36.3281 24C36.3281 17.1938 30.8062 11.6719 24 11.6719ZM24 31.9969C19.5844 31.9969 16.0031 28.4156 16.0031 24C16.0031 19.5844 19.5844 16.0031 24 16.0031C28.4156 16.0031 31.9969 19.5844 31.9969 24C31.9969 28.4156 28.4156 31.9969 24 31.9969Z',
        'M39.6937 11.1843C39.6937 12.778 38.4 14.0624 36.8156 14.0624C35.2219 14.0624 33.9375 12.7687 33.9375 11.1843C33.9375 9.59053 35.2313 8.30615 36.8156 8.30615C38.4 8.30615 39.6937 9.5999 39.6937 11.1843Z'
      ] },
    { key: 'x_handle', label: 'X', base: 'https://x.com/', max: 15,
      vb: '0 0 48 48',
      paths: [
        'M36.6526 3.8078H43.3995L28.6594 20.6548L46 43.5797H32.4225L21.7881 29.6759L9.61989 43.5797H2.86886L18.6349 25.56L2 3.8078H15.9222L25.5348 16.5165L36.6526 3.8078ZM34.2846 39.5414H38.0232L13.8908 7.63406H9.87892L34.2846 39.5414Z'
      ] },
    { key: 'facebook', label: 'Facebook', base: 'https://www.facebook.com/', max: 50,
      vb: '0 0 48 48',
      paths: [
        'M24 0C10.7453 0 0 10.7453 0 24C0 35.255 7.74912 44.6995 18.2026 47.2934V31.3344H13.2538V24H18.2026V20.8397C18.2026 12.671 21.8995 8.8848 29.9194 8.8848C31.44 8.8848 34.0637 9.18336 35.137 9.48096V16.129C34.5706 16.0694 33.5866 16.0397 32.3645 16.0397C28.4294 16.0397 26.9088 17.5306 26.9088 21.4061V24H34.7482L33.4013 31.3344H26.9088V47.8243C38.7926 46.3891 48.001 36.2707 48.001 24C48 10.7453 37.2547 0 24 0Z'
      ] },
  ];

  // The public seller page renders these. Built here so the shop and the editor
  // cannot disagree about what a handle turns into.
  // Just the links, no wrapper. They now share a row with the Follow and Message
  // buttons, so the row is assembled by the caller.
  function socItemsHtml(p){
    return SOC.filter(s => p[s.key]).map(s =>
      '<a href="' + s.base + encodeURIComponent(p[s.key]) + '" target="_blank" rel="noopener nofollow"' +
      ' aria-label="' + s.label + '" title="@' + String(p[s.key]).replace(/[<>&"]/g, '') + ' on ' + s.label + '">' +
      // fill-rule only where the glyph needs it. Applying evenodd to all of them
      // would change the X mark, whose inner counter already resolves under the
      // default nonzero, and that is not a thing to alter blind.
      '<svg viewBox="' + s.vb + '" aria-hidden="true">' +
      s.paths.map(function(d){ return '<path d="' + d + '"/>'; }).join('') +
      '</svg></a>').join('');
  }

  // Follow and Message as the same small square control as the social icons, on one
  // row with them.
  //
  // Follow stays filled and Message stays outlined. Two controls side by side must
  // not read as equal weight, and dropping the labels is exactly when that matters:
  // with the words gone, the fill is the only thing left saying which one is the
  // main action.
  //
  // An icon with no label needs its name somewhere, so both carry aria-label and
  // title. That is also what gives a mouse user the tooltip the label used to be.
  function sellerActionsHtml(){
    return '' +
      '<button type="button" id="followBtn" class="soc-act on" aria-label="Follow this seller" title="Follow this seller">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 4h2.8v5.6H19v2.8h-5.6V18h-2.8v-5.6H5V9.6h5.6z"/></svg>' +
      '</button>' +
      // An envelope rather than a speech bubble: it is the glyph everyone reads as
      // "send this person something", and it is the word Ramon used for the action.
      // The flap is cut out with evenodd so the shape still reads at 17px.
      '<button type="button" id="msgBtn" class="soc-act" aria-label="Send this seller a message" title="Send this seller a message">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M2 5h20v14H2z' +
        'M4.6 7 12 12.6 19.4 7z"/></svg>' +
      '</button>';
  }

  // Escape for text between tags, at a scope everything can reach.
  //
  // There was already one of these, but it lives inside the sell page's closure,
  // so every caller outside it was referencing a name that does not exist. The
  // delivery modal was the casualty: quote() calls esc() on its very first line,
  // threw a ReferenceError, and because the function is async that surfaced as an
  // unhandled rejection rather than a crash. The page carried on, the shipping
  // panel stayed empty, and the button said "Pick how it should travel first"
  // about options that had never arrived. Nine calls out there were broken.
  const esc = s => String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  // The marks on the share row, from Ramon's own set.
  //
  // Two kinds in one row, which is why there are two shapes of svg here. Share and
  // link are drawn as outlines and carry their weight in a stroke; WhatsApp and X
  // are platform marks and are solid. Both are set on currentColor rather than the
  // #141B34 and white they arrive as, so one row works on the light theme, the dark
  // theme, and inverted inside the black Copy link button on success.
  //
  // The outline pair keeps fill="none" as a class the CSS can name: .share svg sets
  // fill:currentColor for the solid marks, and a presentation attribute would lose
  // to it and flood the outlines into blobs.
  const SH_ICON = {
    share: '<svg class="ln" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M9.39567 4.5H8.354C5.40772 4.5 3.93458 4.5 3.01929 5.37868C2.104 6.25736 2.104 7.67157 2.104 10.5V14.5C2.104 17.3284 2.104 18.7426 3.01929 19.6213C3.93458 20.5 5.40772 20.5 8.354 20.5H12.5606C15.5069 20.5 16.98 20.5 17.8953 19.6213C18.4883 19.052 18.6971 18.2579 18.7706 17"/>' +
      '<path d="M16.1667 7V3.85355C16.1667 3.65829 16.3316 3.5 16.535 3.5C16.6326 3.5 16.7263 3.53725 16.7954 3.60355L21.5275 8.14645C21.7634 8.37282 21.8958 8.67986 21.8958 9C21.8958 9.32014 21.7634 9.62718 21.5275 9.85355L16.7954 14.3964C16.7263 14.4628 16.6326 14.5 16.535 14.5C16.3316 14.5 16.1667 14.3417 16.1667 14.1464V11H13.1157C8.875 11 7.3125 14.5 7.3125 14.5V12C7.3125 9.23858 9.64435 7 12.5208 7H16.1667Z"/></svg>',
    link:  '<svg class="ln" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M10 13.229C10.1416 13.4609 10.3097 13.6804 10.5042 13.8828C11.7117 15.1395 13.5522 15.336 14.9576 14.4722C15.218 14.3121 15.4634 14.1157 15.6872 13.8828L18.9266 10.5114C20.3578 9.02184 20.3578 6.60676 18.9266 5.11718C17.4953 3.6276 15.1748 3.62761 13.7435 5.11718L13.03 5.85978"/>' +
      '<path d="M10.9703 18.14L10.2565 18.8828C8.82526 20.3724 6.50471 20.3724 5.07345 18.8828C3.64218 17.3932 3.64218 14.9782 5.07345 13.4886L8.31287 10.1172C9.74413 8.62761 12.0647 8.6276 13.4959 10.1172C13.6904 10.3195 13.8584 10.539 14 10.7708"/></svg>',
    whatsapp: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 0C37.2547 0 48 10.7453 48 24C48 37.2547 37.2547 48 24 48C19.82 48 15.8904 46.9314 12.4678 45.0527L0 48L3.19629 35.9736C1.16368 32.4497 0 28.3606 0 24C6.76533e-07 10.7453 10.7453 6.76489e-07 24 0ZM24 4.29785C13.1194 4.29785 4.299 13.1185 4.29883 23.999C4.29883 28.1943 5.6104 32.083 7.8457 35.2783L5.7793 42.3193L13.1455 40.4434C16.2581 42.5026 19.9887 43.7012 24 43.7012V43.7002C34.8807 43.7002 43.7012 34.8797 43.7012 23.999C43.701 13.1185 34.8806 4.29785 24 4.29785ZM17.4043 12.1562C17.6982 12.1324 17.9685 12.3028 18.0938 12.5693L20.8311 18.376C20.9604 18.6506 20.9041 18.9777 20.6895 19.1924L18.6484 21.2324C18.2072 21.6737 18.0781 22.361 18.3818 22.9062C19.1265 24.2415 20.1281 25.5276 21.2881 26.7109C22.4714 27.8709 23.7574 28.8732 25.0928 29.6172C25.6381 29.9212 26.3246 29.7919 26.7666 29.3506L28.8076 27.3096C29.0222 27.0953 29.3486 27.0382 29.623 27.168L35.4297 29.9053C35.6964 30.0306 35.8677 30.3014 35.8438 30.5947C35.7811 31.3587 35.4741 32.8901 34.1016 34.2627C30.227 38.1372 23.2692 33.7536 22.9854 33.584C21.2741 32.6647 19.6483 31.4347 18.1064 29.8936C16.5651 28.3522 15.3344 26.725 14.415 25.0137C14.2445 24.7301 9.86133 17.7735 13.7363 13.8984C15.109 12.5258 16.6403 12.2189 17.4043 12.1562Z"/></svg>',
    x:     '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M36.6526 3.8078H43.3995L28.6594 20.6548L46 43.5797H32.4225L21.7881 29.6759L9.61989 43.5797H2.86886L18.6349 25.56L2 3.8078H15.9222L25.5348 16.5165L36.6526 3.8078ZM34.2846 39.5414H38.0232L13.8908 7.63406H9.87892L34.2846 39.5414Z"/></svg>',
    facebook: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 11.979 8.776 21.908 20.25 23.708V30.938h-6.094V24h6.094v-5.288c0-6.014 3.583-9.337 9.065-9.337 2.626 0 5.372.469 5.372.469v5.906h-3.026c-2.981 0-3.911 1.85-3.911 3.749V24h6.656l-1.064 6.938H27.75v16.77C39.224 45.908 48 35.979 48 24Z"/></svg>',
    instagram: '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M24 4.324c6.408 0 7.167.024 9.698.14 2.34.107 3.611.498 4.457.827 1.12.435 1.92.955 2.76 1.794.839.84 1.359 1.64 1.794 2.76.329.846.72 2.117.827 4.457.116 2.531.14 3.29.14 9.698s-.024 7.167-.14 9.698c-.107 2.34-.498 3.611-.827 4.457-.435 1.12-.955 1.92-1.794 2.76-.84.839-1.64 1.359-2.76 1.794-.846.329-2.117.72-4.457.827-2.531.116-3.29.14-9.698.14s-7.167-.024-9.698-.14c-2.34-.107-3.611-.498-4.457-.827-1.12-.435-1.92-.955-2.76-1.794-.839-.84-1.359-1.64-1.794-2.76-.329-.846-.72-2.117-.827-4.457-.116-2.531-.14-3.29-.14-9.698s.024-7.167.14-9.698c.107-2.34.498-3.611.827-4.457.435-1.12.955-1.92 1.794-2.76.84-.839 1.64-1.359 2.76-1.794.846-.329 2.117-.72 4.457-.827 2.531-.116 3.29-.14 9.698-.14M24 0c-6.518 0-7.335.028-9.895.145-2.555.117-4.3.523-5.826 1.116-1.578.613-2.916 1.434-4.25 2.767C2.695 5.363 1.874 6.701 1.261 8.279.668 9.805.262 11.55.145 14.105.028 16.665 0 17.482 0 24s.028 7.335.145 9.895c.117 2.555.523 4.3 1.116 5.826.613 1.578 1.434 2.916 2.768 4.25 1.334 1.334 2.672 2.155 4.25 2.768 1.526.593 3.271.999 5.826 1.116C16.665 47.972 17.482 48 24 48s7.335-.028 9.895-.145c2.555-.117 4.3-.523 5.826-1.116 1.578-.613 2.916-1.434 4.25-2.768 1.334-1.334 2.155-2.672 2.768-4.25.593-1.526.999-3.271 1.116-5.826C47.972 31.335 48 30.518 48 24s-.028-7.335-.145-9.895c-.117-2.555-.523-4.3-1.116-5.826-.613-1.578-1.434-2.916-2.768-4.25-1.334-1.333-2.672-2.154-4.25-2.767-1.526-.593-3.271-.999-5.826-1.116C31.335.028 30.518 0 24 0Z"/>' +
      '<path d="M24 11.676c-6.807 0-12.324 5.517-12.324 12.324S17.193 36.324 24 36.324 36.324 30.807 36.324 24 30.807 11.676 24 11.676M24 32c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8"/>' +
      '<path d="M39.688 11.189a2.88 2.88 0 1 1-5.76 0 2.88 2.88 0 0 1 5.76 0"/></svg>',
  };

  // The waiting mark: the brand hammer coming down. Used wherever something
  // takes long enough that a still page reads as a hang.
  const HAMMER = '<div class="hmr"><img src="/Empires/Brandedimages/hm-godzilla.svg" alt="" aria-hidden="true">' +
    '<svg class="bang" viewBox="0 0 34 26" aria-hidden="true"><path d="M4 20 L0 24"/><path d="M15 17 L15 24"/><path d="M26 20 L31 25"/></svg></div>';

  // A dead end, wearing the shop's own mark. There are three of them on a lot
  // page and they used to be three bare <p> tags in the browser's default font,
  // which is the one moment a visitor decides whether a site is looked after.
  // The mark is the still version: the hammer swinging means we are working on
  // something, and here we are not.
  const HAMMER_STILL = '<div class="hmr still"><img src="/Empires/Brandedimages/hm-godzilla.svg" alt="" aria-hidden="true"></div>';
  function deadEnd(ey, title, body){
    return '<div class="nf">' + HAMMER_STILL +
      '<div class="nf-ey">' + ey + '</div>' +
      '<h2 class="nf-t">' + title + '</h2>' +
      '<p class="nf-b">' + body + '</p>' +
      '<a class="btn accent" href="/" data-nav="home">Back to the shop</a>' +
    '</div>';
  }

  // The initials the seller page falls back to when there is no logo.
  //
  // Defined once because it is now drawn in two places, the public page and the
  // preview in the account, and they must not disagree. It also fixes what that
  // preview made visible: the old version took the first two space-separated words,
  // so "Hammer & Mold" produced "H&" because the ampersand counted as a word. Only
  // words that start with a letter or a digit count now.
  function monogramOf(name){
    const words = String(name || '').split(/\s+/).filter(w => /^[\p{L}\p{N}]/u.test(w));
    // Two words give their initials; one word gives its first two letters, because
    // a single character in an 88px square reads as a mistake rather than a mark.
    const ini = words.length > 1 ? words.slice(0, 2).map(w => w[0]).join('') : (words[0] || '').slice(0, 2);
    return (ini || String(name || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2) || '?').toUpperCase();
  }

  // A logo is a brand mark, so this one keeps its transparency and writes PNG.
  // offerShrink exists two screens down but flattens to JPEG, which would box every
  // logo in white and make it wrong on the dark theme.
  function logoShrink(file, maxDim){
    return new Promise(resolve => {
      const fr = new FileReader();
      fr.onerror = () => resolve('');
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => resolve('');
        img.onload = () => {
          try {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * scale));
            c.height = Math.max(1, Math.round(img.height * scale));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/png'));
          } catch (e) { resolve(''); }
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  // Branding is a paid feature. 'premium' is the old name for what is now trader,
  // which currentPlanKey() already maps, and it is accepted here too so an account
  // still carrying the old value does not silently lose its logo.
  const BRANDING_PLANS = ['trader', 'dealer', 'premium'];
  const canBrand = prefs => BRANDING_PLANS.indexOf(String((prefs && prefs.plan) || 'starter').toLowerCase()) !== -1;

  const CONNECT_START  = 'https://plasticempires-pay.ramongervais.workers.dev/connect/start';
  const CONNECT_STATUS = 'https://plasticempires-pay.ramongervais.workers.dev/connect/status';

  // Where a seller's money goes.
  //
  // Rendered from the stored flag so the page draws immediately, then corrected by
  // a call to Stripe. That order matters on the way back from onboarding: a seller
  // returns here seconds after finishing, before Stripe's webhook has landed, and a
  // page that only trusted the stored value would tell them they still cannot be
  // paid, which is exactly the moment they decide the thing is broken.
  function payoutHtml(prefs){
    const e = s => String(s == null ? '' : s).replace(/[<>&"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
    const has = !!prefs.stripe_account_id;
    const ok  = prefs.payouts_enabled === true;
    return '' +
      '<div class="brand-row pay-row" style="align-items:center">' +
        '<div style="flex:1;min-width:260px">' +
          '<div class="pay-state" id="payState">' +
            (ok   ? '<b>Your payout account is ready.</b> Eligible balances are paid monthly.'
                  : has ? '<b>Almost there.</b> Stripe still needs something before it can pay you.'
                        : '<b>Set up payouts.</b> Add a payout account before your first sale is ready to be paid.') +
          '</div>' +
          '<p class="brand-note" style="margin:8px 0 0">' +
            'Stripe verifies your identity and securely holds your bank details. Hammer &amp; Mold never sees them.' +
            '<br>Eligible balances are paid monthly after the buyer&rsquo;s return window has passed.' +
          '</p>' +
        '</div>' +
        '<div class="brand-logo-acts">' +
          '<button class="btn accent" type="button" id="payStart">' +
            (ok ? 'Update details' : has ? 'Finish setup' : 'Set up payouts') +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="brand-msg" id="payMsg" style="margin-top:4px"></div>';
  }

  function shopfrontHtml(prefs){
    const e = s => String(s == null ? '' : s).replace(/[<>&"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
    const v = k => e(prefs[k] || '');

    // Locked on the free package. The name, location and about text stay editable
    // because a seller has to be able to say who they are: what a package buys is
    // the logo and the social links, not the right to have a name.
    const paid = canBrand(prefs);
    const lockNote = paid ? '' :
      '<div class="brand-lock">' +
        '<div class="brand-lock-h">Logo and social links are part of a paid package</div>' +
        '<p class="brand-note" style="margin:6px 0 0">Trader and Dealer let you put your own mark on your shop page and link your Instagram, X and Facebook. On Starter your page uses a monogram of your shop name.</p>' +
        // A real button, not a grey caption. It read as disabled text, and the
        // data-nav it carried was never wired up, so tapping it did nothing at all.
        '<button class="btn ghost" type="button" data-plans-pop style="margin-top:12px">See the packages</button>' +
      '</div>';
    // The locked fields are shown rather than hidden, and disabled rather than
    // removed: a seller who can see what a package gives them has a reason to buy
    // one, and an empty section explains nothing.
    const lock = paid ? '' : ' disabled';
    const at = (k, label, max, hint) =>
      '<label class="ef' + (paid ? '' : ' is-locked') + '"><span>' + label + '</span>' +
        '<span class="brand-at"><span class="at">@</span>' +
          '<input id="bf_' + k + '" type="text" maxlength="' + max + '" value="' + v(k) + '" autocomplete="off" spellcheck="false" placeholder="' + e(hint) + '"' + lock + '>' +
        '</span></label>';
    // The monogram the public page falls back to, so the locked preview shows the
    // real thing rather than the words "no logo".
    const mono = monogramOf(prefs.display_name || 'Seller');
    return '' +
      lockNote +
      '<div class="brand-row">' +
        '<div class="brand-logo" id="bfLogoBox">' +
          (paid
            ? (prefs.logo_url
                ? '<img src="' + e(prefs.logo_url) + '" alt="Your logo">'
                : '<span class="ph">No<br>logo</span>')
            : '<span class="ph" style="font-size:26px;letter-spacing:0">' + e(mono) + '</span>') +
        '</div>' +
        (paid
          ? '<div class="brand-logo-acts">' +
              '<button class="btn ghost" type="button" id="bfPick">' + (prefs.logo_url ? 'Replace logo' : 'Upload a logo') + '</button>' +
              (prefs.logo_url ? '<button class="acct-signout" type="button" id="bfDrop">Remove</button>' : '') +
              '<input type="file" id="bfFile" accept="image/*" hidden>' +
            '</div>'
          : '') +
        '<p class="brand-note" style="flex:1;min-width:220px;margin:0">' +
          (paid
            ? 'A square logo works best. Use a PNG with a transparent background so it looks good in both light and dark mode.'
            : 'Your page shows these initials until you upload a logo on a paid package.') +
        '</p>' +
      '</div>' +
      '<div class="brand-grid">' +
        '<label class="ef"><span>Shop name</span><input class="ei" id="bf_display_name" type="text" maxlength="40" value="' + v('display_name') + '" placeholder="Hammer &amp; Mold"></label>' +
        '<label class="ef"><span>Handle</span><span class="brand-at"><span class="at">@</span>' +
          '<input id="bf_handle" type="text" maxlength="30" value="' + v('handle') + '" autocomplete="off" spellcheck="false" placeholder="yourshop">' +
        '</span></label>' +
        '<label class="ef"><span>Seller type</span><input class="ei" id="bf_type" type="text" maxlength="40" value="' + v('type') + '" placeholder="Dealer, collector, shop…"></label>' +
        '<label class="ef"><span>Location</span><input class="ei" id="bf_location" type="text" maxlength="60" value="' + v('location') + '" placeholder="Haarlem, Netherlands"></label>' +
        '<label class="ef wide"><span>About your shop</span><textarea class="ei" id="bf_bio" rows="4" maxlength="600" placeholder="What you collect, what you sell, and how you grade it.">' + v('bio') + '</textarea></label>' +
      '</div>' +
      '<div class="brand-grid" style="margin-top:18px">' +
        SOC.map(s => at(s.key, s.label, s.max, 'yourshop')).join('') +
        '<p class="brand-note wide" style="margin:0">' +
          (paid ? 'Enter your username only, without @ or the full URL. Social links appear on your public shop.'
                : 'Social links are unlocked on Trader and Dealer.') +
        '</p>' +
      '</div>' +
      '<div class="brand-save">' +
        '<button class="btn accent" type="button" id="bfSave">Save storefront</button>' +
        '<span class="seller-link" data-nav="seller" data-seller="' + e(prefs.id || '') + '">View shop</span>' +
        '<span class="brand-msg" id="bfMsg"></span>' +
      '</div>';
  }

  // ----- Account / dashboard (owner's own activity) -----
  // The membership block. Reads the package table rather than naming a price, so
  // the account page cannot show EUR 15 while the checkout charges EUR 7. If the
  // table has not loaded yet it says the plan without the numbers rather than
  // guessing them, and loadPlans() triggers a re-render.
  function membershipHtml(prefs){
    PLAN_NOW = prefs.plan || 'starter';
    const key = currentPlanKey() || 'starter';
    const plans = PLAN_CACHE;
    const mine = plans ? plans.find(p => p.key === key) : null;
    const pendingKey = prefs.plan_pending || null;
    const pending = (plans && pendingKey) ? plans.find(p => p.key === pendingKey) : null;
    const tokens = prefs.tokens != null ? prefs.tokens : 0;
    const paying = !!mine && mine.cents > 0;

    const allowance = mine
      ? phrase('{n} added each month', { n: mine.listings }) + (mine.cap > mine.listings ? ' &middot; ' + phrase('rolls over up to {cap}', { cap: mine.cap }) : '')
      : phrase('monthly allowance');

    // Where the buttons go. Anything paid routes through data-plan, which the
    // one click handler turns into a purchase or a move as appropriate.
    //
    // All of them say "Switch to". Up and down were spelled out before, which
    // made the cheaper package read as a demotion rather than a choice, and the
    // direction is obvious from the price anyway.
    const others = (plans || []).filter(p => p.key !== key);
    const btns = others.map(p =>
      '<button class="' + (p.cents > (mine ? mine.cents : 0) ? 'acct-pay' : 'acct-signout') + '" type="button" data-plan="' + mkEsc(p.key) + '">' +
      'Switch to ' + mkEsc(p.name) + '</button>').join('');

    // The date the change lands, from the profile rather than from a shrug. The
    // page used to say "at the end of this billing period", which is not a date
    // and cannot be planned around.
    const pendAt = prefs.plan_pending_at ? new Date(prefs.plan_pending_at) : null;
    const pendWhen = (pendAt && !isNaN(pendAt))
      ? pendAt.toLocaleDateString(LOC(), { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    return '<div class="mship"><div class="mship-l">' +
        '<div class="mship-plan">' + mkEsc(mine ? mine.name : (key.charAt(0).toUpperCase() + key.slice(1))) +
          (paying ? '<span class="mship-badge">Active</span>' : '') + '</div>' +
        '<div class="mship-tok">' + phrase(tokens === 1 ? '{n} listing left' : '{n} listings left', { n: tokens }) + ' &middot; ' + allowance +
          (mine ? ' &middot; ' + phrase('{pct}% selling fee', { pct: (mine.commission * 100).toFixed(0) }) : '') + '</div>' +
      '</div>' +
      '<div class="mship-r">' + btns +
        (paying ? '<button class="acct-signout" id="mManage" type="button">Billing</button>' : '') +
        '<button class="acct-signout" id="mBuy" type="button">Buy 25 listings &middot; € 18</button></div>' +
    '</div>' +
    // The copy told a seller to "choose your current package again to cancel",
    // and the row above renders one button per OTHER package, so the button it
    // named did not exist anywhere on the page. It is here now, next to the
    // sentence that asks for it, and it carries the same data-plan the handler
    // already understands.
    (pending
      ? '<div class="acct-empty"><b>Your plan changes to ' + mkEsc(pending.name) +
        (pendWhen ? ' on ' + mkEsc(pendWhen) : ' at the end of this billing period') + '.</b> Until then, you keep ' +
        mkEsc(mine ? mine.name : 'your package') +
        (mine ? ' and its ' + (mine.commission * 100).toFixed(0) + '% selling fee' : '') +
        '. Any unused listings stay yours.' +
        (mine ? '<div style="margin-top:12px"><button class="btn ghost" type="button" data-plan="' + mkEsc(mine.key) + '">Keep ' + mkEsc(mine.name) + '</button></div>' : '') +
        '</div>'
      : '') +
    '<div class="acct-empty">Identification is always free. A listing is used only when you publish an item for sale. Unused listings roll over. ' +
      '<a data-plans-pop style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">Compare packages</a> to see which costs least based on how much you sell.</div>';
  }

  async function renderAccount(opts){
    await loadPlans();   // the block below prices itself from the table; render once, with numbers
    const body = document.getElementById('accountBody');
    show('account', { fromHistory: opts && opts.fromHistory });
    const money = n => '€ ' + Number(n || 0).toLocaleString('nl-NL');
    const e = s => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
    if (!SB || !authUser){ body.innerHTML = '<p style="font-family:var(--body);padding:48px 0">Sign in to see your account.</p>'; return; }
    // A skeleton in the shape of the thing being loaded, rather than the word
    // "Loading". The account makes seven round trips before it can draw, and a
    // single grey sentence for that long reads as a page that failed.
    body.innerHTML =
      '<div class="sk acct-sk" aria-hidden="true">' +
        '<div class="sk-l tall" style="width:42%"></div>' +
        '<div class="sk-strip">' + '<div></div><div></div><div></div><div></div>' + '</div>' +
        '<div class="sk-l w45" style="margin-top:34px"></div>' +
        '<div class="sk-row"></div><div class="sk-row"></div>' +
        '<div class="sk-l w45" style="margin-top:34px"></div>' +
        '<div class="sk-row"></div><div class="sk-row"></div><div class="sk-row"></div>' +
      '</div>';
    const uid = authUser.id, now = Date.now();
    const isEnded = l => l.status === 'ended' || l.status === 'sold' || (l.ends_at && new Date(l.ends_at) <= now);
    try {
    const sel = 'id,toy,maker,line,year,status,starting_bid,buy_now,ends_at,image_urls,closed_at,created_at,seller_id,withdrawn_at,delivered_at,invoice_no';
    const [myLotsRes, myBidsRes, prefRes, watchRes, buysRes, myRevRes, draftsRes] = await Promise.all([
      SB.from('lots').select(sel).eq('seller_id', uid).order('created_at', { ascending: false }),
      // Was a filter on bidder_id, which is private now: anyone with the public
      // key could read that column and turn it into a name via seller_public.
      // my_bids() answers it for the caller only, and returns whether they are
      // leading, which used to be worked out in the browser from everyone's bids.
      SB.rpc('my_bids'),
      SB.from('profiles').select('*').eq('id', uid).single(),   // '*' so a column added by a pending migration cannot fail the whole account page
      SB.from('watchlist').select('lot_id').eq('user_id', uid),
      SB.from('lots').select(sel).eq('buyer_id', uid).order('created_at', { ascending: false }),
      SB.from('reviews').select('lot_id').eq('reviewer_id', uid),
      SB.from('lot_drafts').select('id,payload,image_urls,updated_at').eq('seller_id', uid).order('updated_at', { ascending: false })
    ]);
    const lots = myLotsRes.data || [], myBids = myBidsRes.data || [];
    const purchases = buysRes.data || [];
    const reviewedLotIds = new Set((myRevRes.data || []).map(r => r.lot_id));
    const prefs = prefRes.data || {};
    const watchIds = [...new Set((watchRes.data || []).map(w => w.lot_id))];
    const bidIds = [...new Set(myBids.map(b => b.lot_id))];   // rows are { lot_id, my_top, lot_top, bids_on_lot, leading }
    const allIds = [...new Set(lots.map(l => l.id).concat(bidIds).concat(watchIds))];
    const [bidLotsRes, allBidsRes, watchLotsRes] = await Promise.all([
      bidIds.length ? SB.from('lots').select(sel).in('id', bidIds) : Promise.resolve({ data: [] }),
      allIds.length ? SB.from('bids').select('lot_id,amount').in('lot_id', allIds) : Promise.resolve({ data: [] }),
      watchIds.length ? SB.from('lots').select(sel).in('id', watchIds) : Promise.resolve({ data: [] })
    ]);
    const bidLots = bidLotsRes.data || [], watchLots = watchLotsRes.data || [];
    const topByLot = {};
    const bidCount = {};
    (allBidsRes.data || []).forEach(b => {
      const t = topByLot[b.lot_id]; if (!t || Number(b.amount) > t.amount) topByLot[b.lot_id] = { amount: Number(b.amount) };
      bidCount[b.lot_id] = (bidCount[b.lot_id] || 0) + 1;
    });
    // Which lots I lead, straight from the database. A lot is mine to win when
    // my own highest bid is the lot's highest, which cannot tie because a bid
    // has to beat the previous one.
    const iLead = {};
    // is_leading, not leading: LEADING is a reserved word in Postgres and naming
    // the column that made the whole migration a syntax error, so nothing after
    // it ran and three of four bad bids still went through.
    myBids.forEach(r => { iLead[r.lot_id] = !!r.is_leading; });
    const myTop = topByLot, bidTop = topByLot;
    const finalPrice = (l, top) => (top[l.id] && top[l.id].amount) || Number(l.buy_now) || Number(l.starting_bid) || 0;
    const soldLots = lots.filter(l => l.status === 'sold');
    const liveLots = lots.filter(l => !isEnded(l));
    const earned = soldLots.reduce((s, l) => s + finalPrice(l, myTop), 0);
    // Leading an ended auction is not winning it if the reserve was never met.
    // That used to be read off lot.reserve; the number is private now, so the
    // database answers the question instead of handing over the figure.
    const rState = await reserveState(bidLots.map(l => l.id));
    const wins = bidLots.filter(l => {
      if (!isEnded(l) || !bidTop[l.id] || !iLead[l.id]) return false;
      const r = rState[l.id];
      return !r || !r.has || r.met;
    });
    // my_top is already the highest, computed in the database, so there is no
    // longer a list of individual bids to fold down here.
    const myBidByLot = {}; myBids.forEach(b => { myBidByLot[b.lot_id] = Number(b.my_top); });
    const stat = (n, k) => '<div class="acct-stat"><div class="n">' + n + '</div><div class="k">' + k + '</div></div>';
    const tog = (key, label, on) => '<div class="acct-toggle" data-pref="' + key + '"><span class="lbl">' + label + '</span><span class="sw' + (on !== false ? ' on' : '') + '"></span></div>';
    const stateOf = l => l.status === 'sold' ? 'Sold' : (l.status === 'unsold' ? 'Not sold' : (isEnded(l) ? 'Awaiting payment' : 'Live'));
    // Withdrawal is offered while the clock could still be running. The period
    // starts on delivery, so before delivery it has not begun and the right is
    // already there; after delivery it runs fourteen days. Erring long on
    // purpose: showing it a day too many costs nothing, a day too few is the
    // thing the law is about.
    const canWithdraw = (l) => {
      if (!l || l.status !== 'sold' || l.withdrawn_at) return false;
      if (!l.delivered_at) return true;
      return (Date.now() - Date.parse(l.delivered_at)) < 14 * 86400000;
    };
    const row = (l, right, sub) => '<div class="acct-row"><div class="th" data-nav="lot" data-lot="' + e(l.id) + '"' + (l.image_urls && l.image_urls[0] ? ' style="background-image:url(' + l.image_urls[0] + ')"' : '') + '></div><div class="info" data-nav="lot" data-lot="' + e(l.id) + '"><div class="t">' + e(l.toy) + '</div><div class="s">' + e(sub) + '</div></div>' + right + '</div>';
    // Your listings, in an order you choose. Default stays newest first, the
    // order the query returned, because that is what you want right after
    // putting something up. Bids is the one worth having with thirty-odd lots:
    // the question stops being what is on the shelf and becomes whether
    // anything is moving.
    //
    // Kept in localStorage, because a sort you have to set again on every visit
    // is a sort nobody uses twice.
    let lsKey = 'newest';
    try { lsKey = localStorage.getItem('hm_listsort') || 'newest'; } catch (err) {}
    const stateRank = { live: 0, preview: 1, unsold: 2, ended: 3, sold: 4 };
    const sortedLots = lots.slice();
    if (lsKey !== 'newest') {
      sortedLots.sort(function(x, y){
        let c = 0;
        if (lsKey === 'bids')  c = (bidCount[y.id] || 0) - (bidCount[x.id] || 0);
        if (lsKey === 'price') c = finalPrice(y, myTop) - finalPrice(x, myTop);
        if (lsKey === 'state') c = (stateRank[x.status] != null ? stateRank[x.status] : 9) - (stateRank[y.status] != null ? stateRank[y.status] : 9);
        if (lsKey === 'name')  c = String(x.toy || '').localeCompare(String(y.toy || ''));
        // Newest as the tiebreak, so two lots with nought bids hold their order
        // instead of shuffling every time the page draws.
        return c || (new Date(y.created_at) - new Date(x.created_at));
      });
    }
    const SORTS = [['newest', 'Newest'], ['bids', 'Bids'], ['price', 'Price'], ['state', 'State'], ['name', 'A-Z']];
    const listSortHtml = lots.length > 1
      ? '<div class="sortrow">' + SORTS.map(function(o){
          return '<button type="button" class="sortpill' + (o[0] === lsKey ? ' on' : '') + '" data-listsort="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>'
      : '';
    const listingsHtml = listSortHtml + (sortedLots.length ? sortedLots.map(l => {
      // An unsold lot is out of the public shop and sits here instead, with the
      // one action that matters. A price would be meaningless: nobody paid it.
      const right = l.status === 'unsold'
        ? '<div style="text-align:end"><button class="acct-pay" data-relist="' + e(l.id) + '" data-label="' + e(l.toy) + '">Relist</button><div class="st" style="margin-top:6px">Not sold &middot; uses 1 listing</div></div>'
        : '<div><div class="price">' + money(finalPrice(l, myTop)) + '</div><div class="st" style="text-align:end">' + stateOf(l) + '</div></div>';
      return row(l, right, [l.maker, l.year].filter(Boolean).join(' · '));
    }).join('') : '<div class="acct-empty">You have not listed anything yet.</div>');
    const winsHtml = wins.length ? wins.map(l => row(l, (l.status !== 'sold' ? '<button class="acct-pay" data-pay="' + e(l.id) + '" data-amt="' + bidTop[l.id].amount + '" data-label="' + e(l.toy) + '">Pay now · ' + money(bidTop[l.id].amount) + '</button>' : '<div class="st">Paid</div>'), phrase('Won at {amount}', { amount: money(bidTop[l.id].amount) }))).join('') : '<div class="acct-empty">No lots won yet.</div>';
    const bidsHtml = bidLots.length ? bidLots.map(l => { const leading = !!iLead[l.id]; return row(l, '<div><div class="price">' + money(myBidByLot[l.id]) + '</div><div class="st" style="text-align:end">' + (isEnded(l) ? (leading ? 'Won' : 'Lost') : (leading ? 'Leading' : 'Outbid')) + '</div></div>', 'Your bid'); }).join('') : '<div class="acct-empty">You have not bid on anything yet.</div>';
    const watchHtml = watchLots.length ? watchLots.map(l => row(l, '<div><div class="price">' + money(finalPrice(l, topByLot)) + '</div><div class="st" style="text-align:end">' + stateOf(l) + '</div></div>', [l.maker, l.year].filter(Boolean).join(' · '))).join('') : '<div class="acct-empty">Lots you watch will appear here. <a data-nav="home" href="#collection" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">Browse auctions</a></div>';
    // lot_drafts may not exist yet if section 6 of the schema has not been run;
    // supabase-js reports that as an error rather than throwing, so show none.
    const drafts = (draftsRes && !draftsRes.error) ? (draftsRes.data || []) : [];
    const draftsHtml = drafts.length ? drafts.map(d => {
      const pl = d.payload || {};
      const img = (d.image_urls && d.image_urls[0]) || '';
      const meta = [pl.line, pl.maker, pl.year].filter(Boolean).join(' · ');
      const n = (d.image_urls || []).length;
      return '<div class="acct-row"><div class="th"' + (img ? ' style="background-image:url(' + img + ');background-size:cover;background-position:center"' : '') + '></div>' +
        '<div class="nm"><div class="t">' + e(pl.toy || 'Untitled draft') + '</div><div class="st">' + e(meta || 'Draft') +
        ' · ' + phrase('saved {date}', { date: e(new Date(d.updated_at).toLocaleDateString(LOC(), { day: '2-digit', month: 'short' })) }) + '</div></div>' +
        '<div><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">' +
          '<button class="acct-pay" data-draft-open="' + e(d.id) + '" type="button">Open</button>' +
          '<button class="acct-signout" data-draft-del="' + e(d.id) + '" type="button">Delete</button>' +
        '</div><div class="st" style="text-align:end;margin-top:4px">' + n + ' photo' + (n === 1 ? '' : 's') + '</div></div></div>';
    }).join('') : '<div class="acct-empty"><b>No drafts yet.</b> Start a listing on the Sell page and choose Save as draft to keep it here. Saving a draft does not use one of your listings.</div>';

    const purchasesHtml = purchases.length ? purchases.map(l => {
      const rev = reviewedLotIds.has(l.id)
        ? '<div class="st">Reviewed</div>'
        : (l.seller_id && l.seller_id !== uid
            ? '<button class="acct-pay" data-review="' + e(l.id) + '" data-seller="' + e(l.seller_id) + '" data-name="' + e(l.toy) + '">Leave a review</button>'
            : '<div class="st">Your lot</div>');
      const wd = l.withdrawn_at
        ? '<div class="st">Withdrawn ' + new Date(l.withdrawn_at).toLocaleDateString(LOC()) + '</div>'
        : (canWithdraw(l) ? '<button class="acct-signout" data-withdraw="' + e(l.id) + '" data-name="' + e(l.toy) + '">Withdraw purchase</button>' : '');
      // The invoice number belongs on the purchase, not only in an email that
      // gets filed away or lost. It is what a buyer quotes when they write in.
      const sub = phrase('Bought') + (l.invoice_no ? ' \u00b7 ' + phrase('Invoice {no}', { no: l.invoice_no }) : '');
      return row(l, '<div style="text-align:end;display:grid;gap:6px;justify-items:end">' + rev + wd + '</div>', sub);
    }).join('') : '';
    // Nothing listed, nothing bid on, nothing watched, nothing bought, nothing
    // drafted. Every section below has a polite empty line of its own, and all
    // of them at once is five boxes telling a new arrival they have done
    // nothing. One panel that says what to do instead, and four lots to do it
    // with, because an empty watchlist is exactly where a suggestion belongs.
    const brandNew = !lots.length && !bidLots.length && !watchLots.length && !purchases.length && !drafts.length;
    let firstRunHtml = '';
    if (brandNew){
      let picks = [];
      try {
        const pr = await SB.from('lots').select(sel).in('status', ['live']).order('created_at', { ascending: false }).limit(4);
        picks = pr.data || [];
      } catch (err) { /* the panel still works without them */ }
      const tokens = prefs.tokens != null ? prefs.tokens : 0;
      firstRunHtml =
        '<div class="firstrun">' +
          '<div class="ey">New here</div>' +
          '<h2>Nothing in your account yet, which is exactly right on day one</h2>' +
          '<p>You have <b>' + tokens + ' listings</b> to use. Photographing a toy and having it identified, dated, graded and described costs nothing and uses none of them: a listing is only spent when you decide to put something up for sale. So the cheapest thing you can do here is find out what you own.</p>' +
          '<div class="acts">' +
            '<a class="btn accent" href="/sell/" data-nav="sell">Identify a toy, free</a>' +
            '<a class="btn ghost" href="/" data-nav="home">Browse the auctions</a>' +
          '</div>' +
          (picks.length
            ? '<div class="pick"><div class="ey" style="margin-bottom:12px">In the shop right now</div>' +
              picks.map(function(l){
                return row(l, '<div class="price">' + money(l.buy_now || l.starting_bid) + '</div>', [l.maker, l.year].filter(Boolean).join(' · '));
              }).join('') +
              '<div class="acct-empty">Tap the star on any lot to watch it. Watched lots show up here, and we email you before one ends.</div></div>'
            : '') +
        '</div>';
    }
    body.innerHTML =
      '<div class="acct-head"><div><div class="ey">Account</div><h1 style="font-family:var(--display);font-weight:700;text-transform:uppercase;letter-spacing:-.01em;font-size:clamp(30px,4.4vw,50px);margin:4px 0 0">' + e(authUser.email.split('@')[0]) + '</h1><div style="font-family:var(--body);color:var(--ink-2);font-size:14px;margin-top:4px">' + e(authUser.email) + '</div></div><button class="acct-signout" id="acctOut">Sign out</button></div>' +
      '<div class="acct-stats">' + stat((prefs.tokens != null ? prefs.tokens : 0), 'Listings left') + stat(lots.length, 'Listed') + stat(liveLots.length, 'Live') + stat(soldLots.length, 'Sold') + stat(money(earned), 'Earned') + stat(wins.length, 'Won') + '</div>' +
      firstRunHtml +
      '<div class="acct-sec"><div class="h">Membership</div>' +
        membershipHtml(prefs) +
      '</div>' +
      // High on the page, next to Membership: this is who you are to a buyer, and
      // it applies to every lot you have. The transactional lists below are about
      // individual items and can wait their turn.
      // Directly under Membership, above the lists. Getting paid outranks
      // everything else a seller does here, and until this is done a sale earns
      // them nothing they can actually reach.
      '<div class="acct-sec"><div class="h">Getting paid</div>' + payoutHtml(prefs) + '</div>' +
      '<div class="acct-sec"><div class="h">Your storefront</div>' + shopfrontHtml(prefs) + '</div>' +
      (brandNew ? '' : '<div class="acct-sec"><div class="h">Items you\'ve won</div>' + winsHtml + '</div>') +
      (purchases.length ? '<div class="acct-sec"><div class="h">Your purchases</div>' + purchasesHtml + '</div>' : '') +
      (brandNew ? '' : '<div class="acct-sec"><div class="h">Watching</div>' + watchHtml + '</div>') +
      '<div class="acct-sec"><div class="h">Shipping from</div>' +
        '<div class="acct-empty" style="padding-bottom:12px">We use your shipping country to calculate postage and determine whether customs may apply. This is required before you can list.</div>' +
        '<label class="ef" style="max-width:320px"><span>Country</span><select class="ei" id="acctCountry">' +
          '<option value="">Choose your country…</option>' +
          COUNTRIES.map(function(c){ return '<option value="' + c[0] + '"' + (prefs.country === c[0] ? ' selected' : '') + '>' + e(c[1]) + '</option>'; }).join('') +
        '</select></label>' +
        '<div class="acct-empty" id="acctCountryMsg"></div>' +
      '</div>' +
      (brandNew ? '' : '<div class="acct-sec"><div class="h">Drafts</div>' + draftsHtml + '</div>') +
      (brandNew ? '' : '<div class="acct-sec"><div class="h">Your listings</div>' + listingsHtml + '</div>') +
      (brandNew ? '' : '<div class="acct-sec"><div class="h">Your bids</div>' + bidsHtml + '</div>') +
      '<div class="acct-sec"><div class="h">Notifications</div>' +
        '<div class="acct-empty" style="padding-bottom:6px">Choose which emails you want to receive.</div>' +
        tog('notify_outbid', 'When I\'m outbid', prefs.notify_outbid) +
        tog('notify_ending', 'When a watched lot is ending', prefs.notify_ending) +
        tog('notify_won', 'When I win a lot', prefs.notify_won) +
        tog('notify_bid', 'When someone bids on my lot', prefs.notify_bid) +
        tog('notify_sold', 'When one of my items sells', prefs.notify_sold) +
      '</div>';
    document.getElementById('acctOut').addEventListener('click', async () => { if (SB){ await SB.auth.signOut(); authUser = null; } try { localStorage.removeItem('pe_user'); } catch (e) {} refreshAuthUI(); show('home'); injectDraftLots(); });
    body.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => startCheckout({ lotId: b.dataset.pay, kind: 'win', amount: parseFloat(b.dataset.amt), label: b.dataset.label })));
    // Relist. The RPC checks ownership, charges the token and clears the bids
    // from the auction that failed, so there is nothing to verify here beyond
    // asking once: it costs a token and the previous bids go.
    // Withdrawing has to be no harder than buying was, which is the actual legal
    // standard. One confirm, one click, and the confirmation arrives by email
    // because that is the durable medium the law asks for.
    body.querySelectorAll('[data-withdraw]').forEach(b => b.addEventListener('click', async () => {
      const name = b.dataset.name || 'this purchase';
      if (!confirm(phrase('Withdraw your purchase of {lot}?', { lot: name }) + '\n\n' + phrase('You do not have to give a reason. We email you a confirmation with the time, and you then have fourteen days to send it back.'))) return;
      b.disabled = true; b.textContent = 'Withdrawing…';
      try {
        const { data: sess } = await SB.auth.getSession();
        const token = sess && sess.session ? sess.session.access_token : '';
        const r = await fetch(PAY_URL.replace(/\/checkout$/, '') + '/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ lotId: b.dataset.withdraw }),
        });
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.error || 'Could not record it');
        openModal('Withdrawal recorded', phrase('We have your withdrawal for {lot}.', { lot: name }),
          'A confirmation is on its way to your email with the date and time. Send the item back within fourteen days of that notice, and we refund within fourteen days of receiving the withdrawal. If it arrived damaged or not as described, tell us and the return postage is ours.');
        renderAccount();
      } catch (err) {
        b.disabled = false; b.textContent = 'Withdraw purchase';
        openModal('Could not withdraw', 'Something went wrong.', (err && err.message) || 'Please try again, or email support@hammerandmold.com. Your right to withdraw is not affected by this failing.');
      }
    }));

    body.querySelectorAll('[data-relist]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Relist ' + (b.dataset.label || 'this lot') + '?\n\nIt uses one listing, and the bids from the auction that did not sell are cleared.')) return;
      b.disabled = true; b.textContent = 'Relisting…';
      const { error } = await SB.rpc('relist_lot', { target: b.dataset.relist, days: 7 });
      if (error){
        b.disabled = false; b.textContent = 'Relist';
        if (/NO_TOKENS/.test(error.message || '')) openModal('Out of listings', 'No listings left this month.', 'Relisting uses one listing. Buy more from your account, or switch to Trader for 50 listings a month.');
        else if (/relist_lot/.test(error.message || '')) { console.error('relist_lot is missing. Run section 11 of admin/schema.sql.'); openModal('Not available yet', 'Relisting is not switched on yet.', 'We have been told. Your lot is safe and still in your account, so nothing is lost.'); }
        else openModal('Could not relist', 'Something went wrong.', error.message || String(error));
        return;
      }
      openModal('Relisted', phrase('{lot} is back on.', { lot: b.dataset.label || phrase('Your lot') }), 'It is back in the shop with the previous bids cleared, and it runs for another 7 days from the first new bid. One listing was used.');
      renderAccount();
    }));
    body.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => openReview(b.dataset.seller, b.dataset.review, b.dataset.name)));
    const mBuy = document.getElementById('mBuy'); if (mBuy) mBuy.addEventListener('click', () => goCheckout(TOKENS_URL));
    var cSel = document.getElementById('acctCountry');
    if (cSel) cSel.addEventListener('change', async function(){
      var msg = document.getElementById('acctCountryMsg');
      var res = await SB.from('profiles').update({ country: cSel.value || null }).eq('id', uid);
      msg.textContent = res.error ? phrase('Could not save: {reason}', { reason: res.error.message })
        : (cSel.value ? phrase('Saved. You post from {country}.', { country: countryName(cSel.value) }) : phrase('Cleared.'));
    });

    // ----- Getting paid -----
    const payMsg = (t, kind) => { const m = document.getElementById('payMsg'); if (m){ m.textContent = t || ''; m.className = 'brand-msg' + (kind ? ' ' + kind : ''); } };
    const payBtn = document.getElementById('payStart');
    if (payBtn) payBtn.addEventListener('click', async () => {
      // Two round trips: create the account, then the onboarding link. It runs to
      // several seconds, and a still page reads as a dead button, so the same
      // hammer the curation uses comes down here too. The button is disabled as
      // well, because the first instinct on silence is to click again.
      const msgEl = document.getElementById('payMsg');
      payBtn.disabled = true;
      if (msgEl) msgEl.innerHTML = '<div class="pay-wait">' + HAMMER +
        '<span class="t">Setting up your payout account with Stripe…</span></div>';
      try {
        const r = await fetch(CONNECT_START, { method: 'POST', headers: await authHeaders(), body: '{}' });
        const d = await r.json().catch(() => ({}));
        // Leave the hammer running on success: the browser is about to navigate,
        // and clearing it first would flash an empty line on the way out.
        if (d && d.url){ location.href = d.url; return; }
        payMsg((d && d.error) || 'Could not start. Try again.', 'bad');
      } catch (err){ payMsg(err.message, 'bad'); }
      payBtn.disabled = false;
    });

    // The correction pass. Asks Stripe what is actually true and rewrites the line
    // the page drew from the stored flag, which is stale for anyone who has just
    // come back from onboarding.
    (async () => {
      const st = document.getElementById('payState');
      if (!st || !SB || !authUser) return;
      try {
        const r = await fetch(CONNECT_STATUS, { headers: await authHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        if (d.payouts_enabled){
          st.innerHTML = '<b>Your payout account is ready.</b> Eligible balances are paid monthly.';
          if (payBtn) payBtn.textContent = 'Update details';
        } else if (d.connected){
          st.innerHTML = '<b>Almost there.</b> Stripe still needs something before it can pay you' +
            (d.needs ? ' (' + d.needs + ' item' + (d.needs === 1 ? '' : 's') + ' outstanding)' : '') + '.';
          if (payBtn) payBtn.textContent = 'Finish setup';
        }
      } catch (e) { /* the stored flag stands */ }
    })();

    // ----- Shopfront: logo and branding -----
    const bfMsg = (t, kind) => { const m = document.getElementById('bfMsg'); if (!m) return; m.textContent = t || ''; m.className = 'brand-msg' + (kind ? ' ' + kind : ''); };
    const bfPick = document.getElementById('bfPick');
    const bfFile = document.getElementById('bfFile');
    if (bfPick && bfFile){
      bfPick.addEventListener('click', () => bfFile.click());
      bfFile.addEventListener('change', async () => {
        const f = bfFile.files && bfFile.files[0];
        if (!f) return;
        bfFile.value = '';   // so picking the same file twice still fires change
        if (!/^image\//.test(f.type)){ bfMsg('That is not an image.', 'bad'); return; }
        bfPick.disabled = true; bfMsg('Preparing…');
        const dataUrl = await logoShrink(f, 256);
        if (!dataUrl){ bfPick.disabled = false; bfMsg('Could not read that image.', 'bad'); return; }
        try {
          const blob = await (await fetch(dataUrl)).blob();
          // <uid>/profile/logo.png. The first path segment has to be the user's own
          // id: the storage policies match on foldername(name)[1], which is what
          // stops one seller overwriting another's files.
          const path = uid + '/profile/logo.png';
          bfMsg('Uploading…');
          const up = await SB.storage.from('lots').upload(path, blob, { contentType: 'image/png', upsert: true });
          if (up.error) throw up.error;
          // A cache-buster, because upsert reuses the path so the URL would not
          // change and the old logo would stay on screen behind the CDN. A query
          // string is fine: the column's constraint anchors the prefix only.
          const url = SB.storage.from('lots').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
          const res = await SB.from('profiles').update({ logo_url: url }).eq('id', uid);
          if (res.error) throw res.error;
          const box = document.getElementById('bfLogoBox');
          if (box) box.innerHTML = '<img src="' + url + '" alt="Your logo">';
          bfPick.textContent = 'Replace logo';
          bfMsg('Logo saved. It is on your public page now.', 'good');
        } catch (err){
          bfMsg(phrase('Could not save the logo: {reason}', { reason: (err && err.message) || String(err) }), 'bad');
        }
        bfPick.disabled = false;
      });
    }
    const bfDrop = document.getElementById('bfDrop');
    if (bfDrop) bfDrop.addEventListener('click', async () => {
      if (!confirm('Remove your logo? Your page falls back to the monogram.')) return;
      bfDrop.disabled = true;
      const res = await SB.from('profiles').update({ logo_url: null }).eq('id', uid);
      if (res.error){ bfDrop.disabled = false; bfMsg(phrase('Could not remove it: {reason}', { reason: res.error.message }), 'bad'); return; }
      // Take the file too, not just the reference. A logo left in a public bucket
      // is still fetchable by anyone who saw the URL.
      try { await SB.storage.from('lots').remove([uid + '/profile/logo.png']); } catch (e) {}
      renderAccount();
    });

    // The same rules the database enforces, checked here so a typo reads as a
    // sentence instead of a constraint name. The database stays the authority: this
    // is the courtesy, not the guard.
    const bfSave = document.getElementById('bfSave');
    if (bfSave) bfSave.addEventListener('click', async () => {
      const get = k => { const el = document.getElementById('bf_' + k); return el ? el.value.trim() : ''; };
      // A leading @ is stripped rather than rejected: people type it out of habit,
      // and the constraint would refuse it.
      const handleOf = k => get(k).replace(/^@+/, '');
      const patch = {
        display_name: get('display_name') || null,
        handle:       handleOf('handle') || null,
        type:         get('type') || null,
        location:     get('location') || null,
        bio:          get('bio') || null
      };
      // Only on a paid package. A disabled input still hands over its .value, so
      // leaving this out would send the branding anyway and the database would
      // refuse the whole save with a message about a plan the seller cannot see.
      if (canBrand(prefs)) SOC.forEach(s => { patch[s.key] = handleOf(s.key) || null; });

      const rules = [
        ['display_name', /^.{2,40}$/, 'A shop name needs between 2 and 40 characters.'],
        ['handle',       /^[A-Za-z0-9._]{1,30}$/, 'A handle can use letters, digits, dots and underscores only.'],
        ['type',         /^.{1,40}$/, 'Keep what you are under 40 characters.'],
        ['location',     /^.{1,60}$/, 'Keep the location under 60 characters.'],
        ['bio',          /^[\s\S]{1,600}$/, 'The about text can be at most 600 characters.'],
        ['instagram',    /^[A-Za-z0-9._]{1,30}$/, 'An Instagram handle can use letters, digits, dots and underscores only.'],
        ['x_handle',     /^[A-Za-z0-9_]{1,15}$/, 'An X handle is at most 15 letters, digits or underscores.'],
        ['facebook',     /^[A-Za-z0-9.]{1,50}$/, 'A Facebook name can use letters, digits and dots only.']
      ];
      for (const [k, re, msg] of rules){
        if (patch[k] != null && !re.test(patch[k])){ bfMsg(msg, 'bad'); const el = document.getElementById('bf_' + k); if (el) el.focus(); return; }
      }

      bfSave.disabled = true; bfMsg('Saving…');
      const { error } = await SB.from('profiles').update(patch).eq('id', uid);
      bfSave.disabled = false;
      if (error){
        // 23505 is a unique violation, which here can only be the handle.
        if (/BRANDING_REQUIRES_PAID_PLAN/.test(error.message || '')){
          // The database refused it, which means the page and the plan disagreed:
          // either the section above rendered before loadPlans() settled, or the
          // package lapsed in another tab. Say what happened rather than showing
          // the raise text.
          bfMsg('A logo and social links need Trader or Dealer.', 'bad');
        } else if (error.code === '23505' || /duplicate key|already exists/i.test(error.message || '')){
          bfMsg('That handle is taken. Try another.', 'bad');
        } else if (/violates check constraint/i.test(error.message || '')){
          bfMsg(phrase('One of those values was refused: {reason}', { reason: error.message }), 'bad');
        } else if (/permission denied|not allowed/i.test(error.message || '')){
          console.error('Shopfront save refused: run section 23 of admin/schema.sql.');
          bfMsg('We could not save that just now. Please try again in a moment.', 'bad');
        } else {
          bfMsg(phrase('Could not save: {reason}', { reason: error.message || String(error) }), 'bad');
        }
        return;
      }
      bfMsg('Saved. Your public page is updated.', 'good');
    });
    body.querySelectorAll('[data-draft-open]').forEach(b => b.addEventListener('click', async () => {
      const { data, error } = await SB.from('lot_drafts').select('id,payload,image_urls').eq('id', b.dataset.draftOpen).maybeSingle();
      if (error || !data){ openModal('Could not open the draft', 'It may have been deleted.', String((error && error.message) || 'Not found')); return; }
      if (typeof window.HM_openDraft === 'function') window.HM_openDraft(data);
    }));
    body.querySelectorAll('[data-draft-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this draft? The details we identified are lost. Photos already uploaded stay in storage.')) return;
      const { error } = await SB.from('lot_drafts').delete().eq('id', b.dataset.draftDel);
      if (error){ openModal('Could not delete', 'Something went wrong.', error.message); return; }
      renderAccount();
    }));
    const mMan = document.getElementById('mManage'); if (mMan) mMan.addEventListener('click', () => goCheckout(PORTAL_URL));
    // Remembered, then the page is drawn again. renderAccount re-reads it, so
    // there is one place that decides the order rather than two that can
    // disagree.
    body.querySelectorAll('[data-listsort]').forEach(b => b.addEventListener('click', () => {
      try { localStorage.setItem('hm_listsort', b.dataset.listsort); } catch (err) {}
      renderAccount();
    }));
    body.querySelectorAll('.acct-toggle[data-pref]').forEach(t => t.addEventListener('click', async () => {
      const sw = t.querySelector('.sw'); const on = !sw.classList.contains('on'); sw.classList.toggle('on', on);
      try { await SB.from('profiles').update({ [t.dataset.pref]: on }).eq('id', uid); } catch (e) {}
    }));
    } catch (err){ body.innerHTML = '<p style="font-family:var(--body);color:var(--ink-3);padding:40px 0">Could not load your account. Please refresh. ' + ((err && err.message) || '') + '</p>'; }
  }

  // ----- Checkout (single flow: Buy-now + won-auction both land here) -----
  const PAY_URL = 'https://plasticempires-pay.ramongervais.workers.dev/checkout';
  const NOTIFY_URL = 'https://plasticempires-pay.ramongervais.workers.dev/notify';
  const SHIP_URL = 'https://plasticempires-pay.ramongervais.workers.dev/notify-shipped';
  const SUBSCRIBE_URL = 'https://plasticempires-pay.ramongervais.workers.dev/subscribe';
  const TOKENS_URL = 'https://plasticempires-pay.ramongervais.workers.dev/buy-tokens';
  const PORTAL_URL = 'https://plasticempires-pay.ramongervais.workers.dev/portal';
  // ---- The "we buy your collection" form ----
  // It had a working button since 25 August that sent nothing anywhere. This is
  // what it does now.
  //
  // Photographs are shrunk here before they leave the device, then posted to the
  // pay worker, which emails them and records that an offer arrived. They are not
  // stored: someone sending these is showing the inside of their house to get a
  // price, and the lots bucket is public.
  const OFFER_URL = 'https://plasticempires-pay.ramongervais.workers.dev/offer';

  // The sell page has a resize helper, but it lives inside that page's closure and
  // is not reachable from here. Duplicated rather than refactored: this is a
  // generic image utility with nothing to get wrong, unlike a price, and pulling
  // apart the working upload path five weeks before launch is not a trade worth
  // making.
  function offerShrink(file, maxDim, quality){
    return new Promise(resolve => {
      const fr = new FileReader();
      fr.onerror = () => resolve('');
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => resolve('');
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { resolve(''); }
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  (function offerForm(){
    const send = document.getElementById('ofSend');
    const files = document.getElementById('ofFiles');
    const thumbs = document.getElementById('ofThumbs');
    const status = document.getElementById('ofStatus');
    if (!send || !files) return;

    const OFFER_MAX = 8;
    let shots = [];   // { name, dataUrl }

    const say = (t, bold) => { status.innerHTML = bold ? '<b>' + t + '</b>' : t; };
    const RESET = 'We reply within two working days. Your photographs are used to make you an offer and for nothing else.';

    function draw(){
      thumbs.innerHTML = shots.map((s, i) =>
        '<div class="th" style="background-image:url(' + s.dataUrl + ');background-size:cover;background-position:center">' +
        '<button type="button" class="th-x" data-of-rm="' + i + '" aria-label="Remove this photo">&times;</button></div>').join('');
    }

    files.addEventListener('change', async () => {
      const picked = [...files.files].filter(f => /^image\//.test(f.type));
      if (!picked.length) return;
      const room = OFFER_MAX - shots.length;
      if (room <= 0){ say('Eight photographs is the most we need. Remove one to add another.', true); return; }
      const taking = Math.min(picked.length, room);
      say(phrase(taking === 1 ? 'Preparing {n} photo\u2026' : 'Preparing {n} photos\u2026', { n: taking }));
      for (const f of picked.slice(0, room)){
        // 1400px at 0.7 keeps a figure readable and a maker's stamp legible while
        // landing around 150 kB, which matters because eight of them travel in one
        // request body.
        const d = await offerShrink(f, 1400, 0.7);
        if (d) shots.push({ name: f.name, dataUrl: d });
      }
      files.value = '';
      draw();
      say(shots.length + ' photo' + (shots.length === 1 ? '' : 's') + ' ready. ' + RESET);
    });

    thumbs.addEventListener('click', e => {
      const b = e.target.closest('[data-of-rm]');
      if (!b) return;
      shots.splice(parseInt(b.dataset.ofRm, 10), 1);
      draw();
      say(shots.length ? shots.length + ' photo' + (shots.length === 1 ? '' : 's') + ' ready. ' + RESET : RESET);
    });

    send.addEventListener('click', async () => {
      const email = (document.getElementById('ofEmail').value || '').trim();
      const count = (document.getElementById('ofCount').value || '').trim();
      const notes = (document.getElementById('ofNotes').value || '').trim();

      // Checked here so someone is not made to wait for a round trip to be told
      // their address is missing. The worker checks it again, because a browser
      // check is a convenience and never a guarantee.
      if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)){
        say('We need an email address to reply to.', true);
        document.getElementById('ofEmail').focus();
        return;
      }
      if (!shots.length && !notes){
        say('Add a photograph or tell us what you have, otherwise there is nothing to price.', true);
        return;
      }

      send.disabled = true;
      const was = send.textContent;
      send.textContent = 'Sending\u2026';
      say('Sending' + (shots.length ? ' with ' + shots.length + ' photo' + (shots.length === 1 ? '' : 's') : '') + '\u2026');
      try {
        const r = await fetch(OFFER_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, count: count, notes: notes, photos: shots.map(s => s.dataUrl) }),
        });
        const d = await r.json();
        if (!r.ok || !d.ok){
          say((d && d.error) || 'That did not go through. Try again, or write to us at support@hammerandmold.com.', true);
          return;
        }
        track('offer_sent', { photos: d.photos || 0, count: count ? Number(count) : null });
        shots = []; draw();
        document.getElementById('ofEmail').value = '';
        document.getElementById('ofCount').value = '';
        document.getElementById('ofNotes').value = '';
        send.hidden = true;
        say('Thank you. We have it, and we will come back to you within two working days with what we think each piece is worth and what we would pay for the lot.', true);
        return;
      } catch (err) {
        say('That did not go through. Check your connection and try again.', true);
      } finally {
        send.disabled = false;
        send.textContent = was;
      }
    });
  })();

  const PLANS_URL = 'https://plasticempires-pay.ramongervais.workers.dev/plans';
  const CHANGE_URL = 'https://plasticempires-pay.ramongervais.workers.dev/change-plan';

  // The session token, for any worker call that acts on money or on an account.
  //
  // The worker used to take whatever userId this page put in the body and believe
  // it, which meant anyone could downgrade another seller's plan or open their
  // billing portal by typing a different id. It now asks Supabase whose session
  // this is. An attacker can claim any id; they cannot produce a signed session
  // for it.
  //
  // userId still travels in the body for now, and the worker ignores it. Removing
  // it is a separate tidy-up and leaving it costs nothing.
  async function authHeaders(){
    const base = { 'Content-Type': 'application/json' };
    if (!SB) return base;
    try {
      const { data } = await SB.auth.getSession();
      const tok = data && data.session && data.session.access_token;
      if (tok) base.Authorization = 'Bearer ' + tok;
    } catch (e) {}
    return base;
  }

  async function goCheckout(endpoint, extra){
    if (SB && !authUser){ openAuth(); return; }
    try {
      const body = Object.assign({ userId: authUser ? authUser.id : '', email: authUser ? authUser.email : '', origin: location.origin }, extra || {});
      const r = await fetch(endpoint, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) });
      const d = await r.json();
      if (d && d.url) location.href = d.url; else openModal('Something went wrong', 'Could not start', (d && d.error) || 'Please try again.');
    } catch (err){ openModal('Something went wrong', 'Could not start', err.message); }
  }

  // ----- Seller packages -----
  // The table comes from the worker, never from here. A price written into this
  // file is a price that will one day disagree with the one being charged.
  let PLAN_CACHE = null;
  async function loadPlans(){
    if (PLAN_CACHE) return PLAN_CACHE;
    try {
      const r = await fetch(PLANS_URL);
      const d = await r.json();
      if (d && Array.isArray(d.plans) && d.plans.length) PLAN_CACHE = d.plans;
    } catch (e) {}
    return PLAN_CACHE;
  }
  const planFee = p => p.cents === 0 ? 'Free' : '€' + (p.cents / 100).toFixed(0);
  // Whole euros, Dutch thousands separator, for thresholds and totals where cents
  // would be noise. The rest of the site uses toLocaleString('nl-NL') the same way.
  const money0 = n => '€ ' + Math.round(Number(n) || 0).toLocaleString('nl-NL');
  // What a seller pays us in a month at this volume: commission plus the fee.
  const planCost = (p, monthly) => monthly * p.commission + p.cents / 100;
  // What the listing allowance can carry, at their own average price. Used to say
  // "this package cannot hold your volume" rather than quoting a cost for a
  // package that would run out of tokens halfway through the month.
  // Deliberately generous: a package "fits" if its allowance is at least the
  // number of sales. In reality a seller needs more listings than sales, because
  // not everything sells first time, and by how much is unknown until we have run
  // real auctions. So the chooser says this out loud rather than inventing a
  // sell-through rate and quietly recommending a package that runs out of tokens.
  const planFits = (p, sales) => p.listings >= sales;

  // Only Starter carries a fit line. The 1-7 / 8-30 / 30+ labels that used to be
  // on all three read as hard limits, which they never were, and they did not line
  // up with the actual economics: what decides a package is what you SELL FOR in a
  // month, not how many items that took. The paid two say that in money instead,
  // on the line below, computed rather than written down.
  const PLAN_FIT = {
    starter: 'Best for occasional sellers',
    trader:  '',
    dealer:  '',
  };

  // What each package buys beyond the commission and the allowance. Kept next to
  // PLAN_FIT rather than inside renderPlans so the selling argument and the
  // arithmetic stay separate: one is copy, the other is the plans table.
  //
  // Branding is on this list because as of section 24 it is actually enforced. A
  // paid feature nobody is told about is not a feature.
  const PLAN_EXTRA = {
    starter: [],
    trader:  ['Your logo and social links on your shop'],
    dealer:  ['Your logo and social links on your shop', 'Featured shop placement'],
  };

  // The turning point: the sales per month at which a package costs less than the
  // free one, despite the monthly fee.
  //
  // This is the answer to "EUR 25 is a lot", and until now the page did not give
  // it anywhere. The EUR 100 hammer table deliberately leaves the monthly fee out,
  // and the chooser only answers after a seller types two numbers. So the one
  // figure that decides the question was the one figure missing.
  //
  // Computed from the plans table, never written down: a hardcoded EUR 357 would go
  // stale the first time a price or a commission moves.
  function planBreakEven(p, plans){
    if (!p.cents) return null;
    // Against the package DIRECTLY BELOW, not against the free one. Comparing
    // every package to Starter said Dealer paid for itself from EUR 360, and it does
    // beat Starter there. It does not beat TRADER there: at EUR 360 Trader costs
    // EUR 50,20 and Dealer EUR 53,80, so the honest answer is EUR 450, where Dealer
    // finally passes the package a seller would otherwise be on. A ladder has to
    // be climbed one rung at a time.
    const below = plans.filter(x => x.cents < p.cents).sort((a, b) => b.cents - a.cents)[0];
    if (!below) return null;
    const saved = below.commission - p.commission;     // selling-fee points saved
    if (saved <= 0) return null;
    return ((p.cents - below.cents) / 100) / saved;    // euros of sales a month
  }

  // Rounded up to the nearest five, so it reads as a threshold rather than as
  // false precision. The epsilon is not decoration: 0.12 - 0.08 is 0.039999…, so
  // Dealer's exact EUR 450 comes back as 450.0000000000002 and a plain ceil pushed
  // it to EUR 455, which is a number that is true of nothing.
  const beRound = v => Math.ceil(v / 5 - 1e-9) * 5;

  async function renderPlans(){
    // Three containers: the packages page, the sell page, and the dialogue on the
    // account page, so none of them carries its own copy of a price. This list is
    // the whole reason the dialogue sat on "Loading the packages…" forever: the
    // element existed, nothing was ever asked to fill it.
    const boxes = ['planCards', 'sellPlanCards', 'plansModalCards'].map(id => document.getElementById(id)).filter(Boolean);
    if (!boxes.length) return;
    const plans = await loadPlans();
    if (!plans){ boxes.forEach(b => { b.innerHTML = '<div class="acct-empty">Packages could not be loaded. Reload the page, or write to us at support@hammerandmold.com.</div>'; }); return; }
    await loadMyPlan();
    const mine = (currentPlanKey() || 'starter');
    const html = plans.map(p => {
      const isMine = p.key === mine;
      const cta = isMine
        ? '<button class="btn ghost t-cta" type="button" disabled>Current package</button>'
        : '<button class="btn accent t-cta" type="button" data-plan="' + mkEsc(p.key) + '">' + (p.cents === 0 ? phrase('Switch to Starter') : phrase('Choose {plan}', { plan: mkEsc(p.name) })) + '</button>';
      const fit = PLAN_FIT[p.key] || '';
      return '<div class="tier' + (isMine ? ' on' : '') + '">' +
        (p.key === 'trader' ? '<div class="t-tag">Most popular</div>' : '') +
        '<div class="t-name">' + mkEsc(p.name) + '</div>' +
        '<div class="t-price">' + planFee(p) + (p.cents ? '<span>/month</span>' : '') + '</div>' +
        (fit ? '<div class="t-fit">' + fit + '</div>' : '') +
        // The threshold in money, before anyone has to work it out. Rounded up to
        // the nearest five so it reads as a threshold and not a false precision,
        // and so it lands on the 235 and 450 the table below proves.
        (() => {
          const be = planBreakEven(p, plans);
          if (be == null) return '';
          return '<div class="t-be">Cheapest from <b>' + money0(beRound(be)) +
                 '/month</b> in sales</div>';
        })() +
        '<ul class="t-list">' +
          '<li><b>' + (p.commission * 100).toFixed(0) + '%</b> selling fee</li>' +
          '<li><b>' + p.listings + '</b> listings a month</li>' +
          (p.cap > p.listings ? '<li>Unused listings roll over, up to ' + p.cap + '</li>' : '') +
          '<li>Unlimited toy identification</li>' +
          '<li>Buyer protection on every sale</li>' +
          (PLAN_EXTRA[p.key] || []).map(x => '<li>' + x + '</li>').join('') +
        '</ul>' + cta + '</div>';
    }).join('');
    boxes.forEach(b => { b.innerHTML = html; });
    renderAllIn(plans);
  }

  // The all-in table: monthly fee plus commission, per level of monthly sales.
  //
  // Catawiki is deliberately NOT a column here. It has its own table above with its
  // own footnote, and dropping it into a column headed "what you pay" would be
  // unfair: 9 of its 21.5 points are charged to the buyer, not the seller. This
  // table answers a different question, which package should I be on, and it can
  // answer that honestly without a competitor in it.
  function renderAllIn(plans){
    const table = document.getElementById('allInTable');
    const note = document.getElementById('allInNote');
    if (!table || !plans || !plans.length) return;
    const ordered = plans.slice().sort((a, b) => a.cents - b.cents);
    // Chosen to straddle the turning points rather than to flatter any package.
    // EUR 150 is there on purpose: it is below every break-even, so the free package
    // wins that row and the table is visibly not an upsell. Trader already wins at
    // EUR 250, which is what its EUR 233 turning point means.
    const levels = [150, 250, 500, 1000, 2000, 5000];
    const costOf = (p, s) => p.cents / 100 + s * p.commission;

    table.innerHTML =
      '<thead><tr><th>Monthly sales</th>' +
        ordered.map(p => '<th class="n">' + mkEsc(p.name) + '</th>').join('') +
      '</tr></thead><tbody>' +
      levels.map(s => {
        const costs = ordered.map(p => costOf(p, s));
        const best = Math.min.apply(null, costs);
        return '<tr><td>' + money0(s) + '</td>' +
          ordered.map((p, i) => '<td class="n' + (costs[i] === best ? ' win' : '') + '">' +
            money0(costs[i]) + '</td>').join('') +
        '</tr>';
      }).join('') +
      '</tbody>';

    // The sentence spelled out from the same numbers, one rung at a time: where
    // each package starts beating the one below it, not the free one.
    const be = {};
    ordered.forEach(p => { const v = planBreakEven(p, plans); if (v != null) be[p.key] = beRound(v); });
    const bands = [];
    ordered.forEach((p, i) => {
      const lo = be[p.key], next = ordered[i + 1], hi = next ? be[next.key] : null;
      if (lo == null && hi != null) bands.push(mkEsc(p.name) + ' is cheapest below roughly ' + money0(hi) + ' a month');
      else if (lo != null && hi != null) bands.push(mkEsc(p.name) + ' is cheapest from roughly ' + money0(lo) + ' to ' + money0(hi));
      else if (lo != null) bands.push(phrase('{plan} is cheapest above {amount}', { plan: mkEsc(p.name), amount: money0(lo) }));
    });
    note.innerHTML = phrase('Bold shows the cheapest package at each sales level.') + ' ' +
      bands.join('. ') + '. ' + phrase('Total cost includes both the monthly package fee and selling fee.');
  }

  // The plan on the account, read from whatever the last account render fetched.
  // 'premium' is the old paid tier and reads as Trader, which is what the worker
  // does too: never show someone who is paying that they are on the free one.
  let PLAN_NOW = null;
  // Fetched on its own rather than waiting for the account page to render. The
  // packages page marked Starter as "your package" for a paying Trader because
  // PLAN_NOW was only ever set by membershipHtml, which runs on a page the seller
  // was not looking at.
  async function loadMyPlan(){
    if (PLAN_NOW || !SB || !authUser) return PLAN_NOW;
    try {
      const { data } = await SB.from('profiles').select('plan').eq('id', authUser.id).single();
      if (data && data.plan) PLAN_NOW = data.plan;
    } catch (e) {}
    return PLAN_NOW;
  }
  const currentPlanKey = () => {
    const v = String(PLAN_NOW || '').toLowerCase();
    return v === 'premium' ? 'trader' : (v || null);
  };

  // ----- The chooser -----
  // Answers on the seller's own numbers, and says "stay where you are" when that
  // is the answer. A package that costs more than the one below it is not an
  // upgrade, and this is the page that has to admit it.
  function runChooser(){
    const out = document.getElementById('chOut');
    const sEl = document.getElementById('chSales'), pEl = document.getElementById('chPrice');
    if (!out || !sEl || !pEl) return;
    const sales = Math.max(0, parseInt(sEl.value, 10) || 0);
    const price = Math.max(0, parseFloat(pEl.value) || 0);
    if (!sales || !price){ out.hidden = true; return; }
    const plans = PLAN_CACHE;
    if (!plans) return;
    const monthly = sales * price;

    const rows = plans.map(p => ({ p, fits: planFits(p, sales), cost: planCost(p, monthly) }));
    const usable = rows.filter(r => r.fits);
    const best = (usable.length ? usable : [rows[rows.length - 1]])
      .reduce((a, b) => b.cost < a.cost ? b : a);

    const eur = n => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    out.hidden = false;
    out.innerHTML =
      '<div class="ch-verdict">' + mkEsc(best.p.name) + ' &middot; ' + eur(best.cost) + ' a month</div>' +
      '<table class="ch-table"><thead><tr><th>Package</th><th class="n">Costs you</th><th class="n">Share of your ' + eur(monthly) + '</th><th>Fits your volume</th></tr></thead><tbody>' +
      rows.map(r => '<tr' + (r.p.key === best.p.key ? ' class="best"' : '') + '>' +
        '<td>' + mkEsc(r.p.name) + '</td>' +
        '<td class="n">' + eur(r.cost) + '</td>' +
        '<td class="n">' + (monthly ? (r.cost / monthly * 100).toFixed(1) + '%' : '-') + '</td>' +
        '<td>' + (r.fits ? phrase('Yes') : phrase('No, only {n} listings', { n: r.p.listings })) + '</td></tr>').join('') +
      '</tbody></table>' +
      '<div class="ch-note">' +
        (best.p.cents === 0
          ? 'At this volume the free package is the cheapest thing we have. Come back when you are selling more; nothing here gets better by paying sooner.'
          : phrase('On Starter the same month would cost you {starter}, so {plan} saves you {saving} a month.', { starter: eur(planCost(plans[0], monthly)), plan: mkEsc(best.p.name), saving: eur(planCost(plans[0], monthly) - best.cost) })) +
        ' ' + phrase('Catawiki would take {amount} of it, counting the 9% they charge your buyer.', { amount: eur(monthly * 0.197) }) +
      '</div>' +
      '<div class="ch-note">This counts one listing per sale. Not everything sells the first time it is listed, so if you relist much, pick the package with room above your number rather than the one that exactly matches it. Unused listings roll over, so headroom is not wasted.</div>' +
      (best.p.key === currentPlanKey()
        ? '<div class="ch-note">You are already on ' + mkEsc(best.p.name) + '.</div>'
        : '<button class="btn accent" type="button" style="margin-top:18px" data-plan="' + mkEsc(best.p.key) + '">' + (best.p.cents === 0 ? phrase('Move to Starter') : phrase('Choose {plan}', { plan: mkEsc(best.p.name) })) + '</button>');
  }
  ['chSales', 'chPrice'].forEach(id => {
    document.addEventListener('input', e => { if (e.target && e.target.id === id) runChooser(); });
  });

  // One handler for every package button on the site: the cards, the chooser and
  // the account page all use data-plan.
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-plan]');
    if (!b) return;
    const key = b.dataset.plan;
    if (SB && !authUser){ openAuth(); return; }
    const plans = await loadPlans();
    const target = (plans || []).find(p => p.key === key);
    if (!target) return;
    const now = currentPlanKey();
    track('plan_chosen', { from: now || 'none', to: key });

    // No subscription yet and a paid package chosen: that is a purchase, so it
    // goes through Stripe Checkout.
    if (!now || now === 'starter'){
      if (target.cents === 0) return;
      b.disabled = true;
      try {
        const r = await fetch(SUBSCRIBE_URL, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ userId: authUser.id, email: authUser.email, origin: location.origin, plan: key }) });
        const d = await r.json();
        if (d && d.url){ location.href = d.url; return; }
        // A subscription exists after all, so this is a move and not a purchase.
        // The plan column can be stale where the subscription is not: that is
        // how a paying Trader was shown Starter as their package.
        if (d && d.error === 'already_subscribed'){ PLAN_NOW = null; await changePlan(key, target); return; }
        openModal('Could not start', 'Something went wrong', (d && d.error) || 'Please try again.');
      } catch (err){ openModal('Could not start', 'Something went wrong', err.message); }
      finally { b.disabled = false; }
      return;
    }
    // Already paying: this is a move, which the worker does on the existing
    // subscription so nobody gets billed twice.
    b.disabled = true;
    try { await changePlan(key, target); }
    finally { b.disabled = false; }
  });

  // Extracted so both entry points reach it: the button on a seller who is known
  // to be paying, and the /subscribe attempt that comes back already_subscribed.
  async function changePlan(key, target){
    const plans = await loadPlans();
    const now = currentPlanKey() || (await loadMyPlan(), currentPlanKey()) || 'starter';
    const going_down = plans.findIndex(p => p.key === key) < plans.findIndex(p => p.key === now);
    try {
      const r = await fetch(CHANGE_URL, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ userId: authUser.id, plan: key }) });
      const d = await r.json();
      if (d && d.error === 'no_subscription'){ goCheckout(SUBSCRIBE_URL, { plan: key }); return; }
      if (!d || d.error){
        openModal('Could not change package', 'Something went wrong',
          d && d.error === 'already_subscribed' ? 'Your subscription could not be read. Reload the page and try again, or open Billing from your account.' : ((d && d.error) || 'Please try again.'));
        return;
      }
      // Choosing the package you are already on, with a move down booked, is the
      // cancel. The worker releases the Stripe schedule and answers this.
      if (d.cancelled){
        openModal('Change cancelled', phrase('You are staying on {plan}.', { plan: target.name }),
          'The booked move has been called off. Nothing about your package changes, and you can book it again whenever you want to.');
      } else if (d.unchanged){
        openModal(phrase('Already on {plan}', { plan: target.name }), 'Nothing to change.', 'You are on this package and it is billing correctly.');
      } else if (going_down){
        const when = d.at ? new Date(d.at * 1000).toLocaleDateString(LOC(), { day: 'numeric', month: 'long', year: 'numeric' }) : phrase('the end of the period you have paid for');
        openModal('Change booked', phrase('You move to {plan} on {when}.', { plan: target.name, when: when }),
          'Nothing changes before then: you keep the package you paid for, and the listings you have built up stay yours. We will email you a few days before it happens, and you can cancel it from your account until then.');
      } else {
        openModal(phrase('You are on {plan}', { plan: target.name }), phrase('{n} listings a month and {pct}% selling fee, from now.', { n: target.listings, pct: (target.commission * 100).toFixed(0) }),
          'Your card was charged only the difference for the rest of this month, not a second full month.');
      }
      PLAN_NOW = null;                        // the plan just moved, so re-read it
      if (typeof renderAccount === 'function') renderAccount();
      renderPlans();
    } catch (err){ openModal('Could not change package', 'Something went wrong', err.message); }
  }
  // Our own checkout step, before Stripe. Two reasons, and the second matters
  // more. A buyer sees the real total for their own address instead of finding
  // the postage at the last screen. And the destination is known BEFORE the
  // session is created, so the Worker can price the right zone and lock the
  // country: without it, someone quoted Dutch postage could enter a Portuguese
  // address at Stripe's address step and pay the Dutch rate for it.
  //
  // Card details are still Stripe's. Taking those here would put this site in
  // PCI scope and make SCA our problem, which is a compliance project rather
  // than a design choice. Stripe's Payment Element is the way to bring the card
  // step onto our own page later without owning the card data.
  const DEST = [
    ['NL', 'Netherlands'], ['BE', 'Belgium'], ['DE', 'Germany'], ['FR', 'France'],
    ['LU', 'Luxembourg'], ['IE', 'Ireland'], ['ES', 'Spain'], ['IT', 'Italy'],
    ['PT', 'Portugal'], ['AT', 'Austria'], ['DK', 'Denmark'], ['SE', 'Sweden'],
    ['FI', 'Finland'], ['PL', 'Poland'], ['CZ', 'Czechia'], ['SK', 'Slovakia'],
    ['SI', 'Slovenia'], ['HU', 'Hungary'], ['RO', 'Romania'], ['BG', 'Bulgaria'],
    ['HR', 'Croatia'], ['GR', 'Greece'], ['EE', 'Estonia'], ['LV', 'Latvia'],
    ['LT', 'Lithuania'], ['MT', 'Malta'], ['CY', 'Cyprus'],
  ];

  // True while a purchase is in progress. The checkout page has no meaning without
  // it, so routeTo sends anyone arriving cold back to the lot rather than showing
  // an empty form that asks for money.
  let CK_LIVE = false;

  function askAddress(opts, lot){
    const money = n => '€ ' + Number(n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    CK_LIVE = true;
    document.getElementById('ckTitle').textContent = opts.label || 'Where should it go?';
    const back = document.getElementById('ckBackLot');
    if (back){
      back.textContent = (opts.label || 'Lot').slice(0, 40);
      back.onclick = () => { CK_LIVE = false; routeTo('lot', opts.lotId); };
    }
    const body = document.getElementById('ckBody');
    body.innerHTML = '';
    const f = document.createElement('div');
    // A grid, not a flex row with a percentage on one child. The old markup put
    // the city in a flex:1 column and the input inside overflowed the modal on a
    // laptop and ran off the screen on a phone. Grid columns cannot do that.
    //
    // Address type is also smaller than the bid type it inherited. A bid is one
    // number and deserves to be large; an address is seven fields and reads as
    // shouting at 20px bold, which is also what made it too tall to fit.
    f.className = 'bidform ck-form';
    f.innerHTML =
      '<div class="ck-grid">' +
        '<div class="wide"><label class="bidlabel" for="ckName">Full name</label><input class="bidinput" id="ckName" autocomplete="name"></div>' +
        // Pairs that belong together. The first attempt at two columns put the
        // addition beside the postcode and the city beside the country, which
        // splits the one pair everybody reads as a unit: postcode and city. An
        // addition is part of the street line, so it sits next to it.
        '<div><label class="bidlabel" for="ckLine1">Street and number</label><input class="bidinput" id="ckLine1" autocomplete="address-line1"></div>' +
        '<div><label class="bidlabel" for="ckLine2">Addition</label><input class="bidinput" id="ckLine2" autocomplete="address-line2"></div>' +
        '<div><label class="bidlabel" for="ckZip">Postcode</label><input class="bidinput" id="ckZip" autocomplete="postal-code"></div>' +
        '<div><label class="bidlabel" for="ckCity">City</label><input class="bidinput" id="ckCity" autocomplete="address-level2"></div>' +
        '<div class="wide"><label class="bidlabel" for="ckCountry">Country</label>' +
          '<select class="bidinput" id="ckCountry" autocomplete="country">' +
            DEST.map(([c, n]) => '<option value="' + c + '"' + (c === 'NL' ? ' selected' : '') + '>' + n + '</option>').join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="del-panel" id="ckTotal" style="margin-top:14px"></div>' +
      '<div class="ck-acts">' +
        '<button class="btn accent" id="ckGo" type="button">Continue to payment</button>' +
        '<button class="btn ghost" id="ckCancel" type="button">Cancel</button>' +
      '</div>' +
      '<div class="bidhint" id="ckHint"></div>';
    body.appendChild(f);
    show('checkout', { extra: opts.lotId });
    // Cancel goes back to the lot, which is where the buyer was and what they
    // were looking at. Closing to nowhere would lose the thing they wanted.
    { const x = document.getElementById('ckCancel');
      if (x) x.addEventListener('click', () => { CK_LIVE = false; routeTo('lot', opts.lotId); }); }

    // Postage is quoted live for the country chosen, because within the EU the
    // same product runs from EUR 8.24 to Austria to EUR 27.73 to Finland. No
    // single stored figure can be right for both, and a buyer should not be
    // charged the average of a spread they are not in.
    let chosen = null, quoted = [], point = null;
    const collecting = () => !!(chosen && chosen.pickup);

    // The shops near the buyer. Marktplaats does this as postcode, a list with
    // distances, pick one; that is the shape a Dutch buyer already knows, so it
    // is the shape used here. Fetched on demand rather than with the quote,
    // because most buyers never open it.
    async function pickPoint(){
      const box = document.getElementById('ckPoint');
      const line1 = document.getElementById('ckLine1').value.trim();
      const houseNumber = (line1.match(/(\d+\s*[a-zA-Z]?)\s*$/) || [])[1] || '';
      box.innerHTML = '<div class="del-note">Looking for shops near ' + esc(document.getElementById('ckZip').value.trim()) + '\u2026</div>';
      let pts = [];
      try {
        const r = await fetch(PAY_URL.replace(/\/checkout$/, '') + '/service-points', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: document.getElementById('ckCountry').value,
            postcode: document.getElementById('ckZip').value.trim(), houseNumber,
            carrier: chosen && chosen.carrier }),
        });
        const d = await r.json();
        pts = (d && d.points) || [];
      } catch (e) { pts = []; }
      if (!pts.length){
        // The old wording said "check it", which sent people to re-read a postcode
        // that was perfectly correct: the real reason was that the geocoder only
        // knew the Netherlands, so no address abroad could ever produce a list.
        // That is fixed, but the message still has to be true for the case where a
        // postcode really has no shop near it, and it should not leave someone who
        // picked the cheaper option wondering what to do next.
        box.innerHTML = '<div class="del-note"><b>No pickup point near that postcode.</b> Not every address has one within range. Choose delivery to your door instead, or try a nearby postcode if you are happy to collect a little further away.</div>';
        return;
      }
      // The search box is written once and the list re-renders underneath it, so
      // typing never rebuilds the input and never loses the caret.
      box.innerHTML =
        '<div class="so-head">Pickup points near you</div>' +
        '<input class="bidinput pt-search" id="ckPtQ" autocomplete="off" spellcheck="false" ' +
          'placeholder="Search a shop, or type another postcode">' +
        '<div id="ckPtList"></div>';

      const listEl = document.getElementById('ckPtList');
      const renderList = (q) => {
        const t = String(q || '').trim().toLowerCase();
        const shown = t
          ? pts.filter((p) => (p.name + ' ' + p.street + ' ' + p.city).toLowerCase().indexOf(t) !== -1)
          : pts;
        listEl.innerHTML = shown.length
          ? shown.map((p) => {
              const i = pts.indexOf(p);
              return '<button type="button" class="pt-row" data-pt="' + i + '">' +
                '<span class="pt-n">' + esc(p.name) + '<i>' + esc(p.street + ', ' + p.city) + '</i></span>' +
                '<span class="pt-d">' + (p.distance == null ? '' : (p.distance / 1000).toFixed(1) + ' km') + '</span>' +
              '</button>';
            }).join('')
          : '<div class="del-note">Nothing here matches that. Clear the box to see them all, or type a postcode to look somewhere else.</div>';
        listEl.querySelectorAll('.pt-row').forEach((b) => b.addEventListener('click', () => {
          point = pts[Number(b.dataset.pt)];
          drawTotal();
        }));
      };
      renderList('');

      // A postcode is a different question from a name: it means "look somewhere
      // else", not "filter what is here". Typing the code near work should find the
      // shops near work, not nothing. Anything that is not a postcode filters the
      // list already loaded, which needs no request at all.
      const q = document.getElementById('ckPtQ');
      let tmr = null;
      q.addEventListener('input', () => {
        const v = q.value;
        renderList(v);
        clearTimeout(tmr);
        // Only a Dutch-style postcode triggers a new lookup, and only after the
        // typing stops. Firing per keystroke would be four requests for one code.
        if (!/^\s*\d{4}\s*[a-zA-Z]{2}\s*$/.test(v)) return;
        tmr = setTimeout(async () => {
          listEl.innerHTML = '<div class="del-note">Looking for shops near ' + esc(v.trim()) + '\u2026</div>';
          try {
            const r = await fetch(PAY_URL.replace(/\/checkout$/, '') + '/service-points', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ country: document.getElementById('ckCountry').value,
                postcode: v.trim(), houseNumber: '', carrier: chosen && chosen.carrier }),
            });
            const d = await r.json();
            const found = (d && d.points) || [];
            if (found.length){ pts = found; renderList(''); q.value = ''; }
            else listEl.innerHTML = '<div class="del-note">No pickup point near ' + esc(v.trim()) + '.</div>';
          } catch (e) {
            listEl.innerHTML = '<div class="del-note">Could not reach the carrier. Try again.</div>';
          }
        }, 500);
      });
    }
    const drawTotal = () => {
      const ship = chosen ? Number(chosen.price) : 0;
      const box = document.getElementById('ckTotal');
      // Who is carrying it, said out loud.
      //
      // The worker has always returned the carrier and the checkout has always
      // thrown it away, so a buyer chose between "Collect from a pickup point"
      // and "Delivered to your door" with no idea whether that meant PostNL, DPD
      // or DHL. In the Netherlands that is not a detail. People have a carrier
      // they trust and a carrier whose notes they have found on the mat, and
      // Marktplaats names every one of theirs for exactly this reason.
      const CARRIER = { postnl: 'PostNL', dpd: 'DPD', dhl: 'DHL', budbee: 'Budbee',
                        bpost: 'bpost', ups: 'UPS', dhl_express: 'DHL Express',
                        gls: 'GLS', mondialrelay: 'Mondial Relay' };
      const carrierName = c => CARRIER[String(c || '').toLowerCase()] ||
        (c ? String(c).charAt(0).toUpperCase() + String(c).slice(1) : '');
      const opt = (o) => {
        const who = carrierName(o.carrier);
        return '<label class="ship-opt' + (o.pickup ? ' pickup' : '') + (chosen && chosen.id === o.id ? ' on' : '') + '">' +
          '<input type="radio" name="shipopt" value="' + esc(o.id) + '"' + (chosen && chosen.id === o.id ? ' checked' : '') + '>' +
          '<span class="so-t">' + esc(o.label) +
            (who ? '<span class="so-c">' + esc(who) + '</span>' : '') +
            '<b>' + money(o.price) + '</b></span>' +
          '<span class="so-n">' + esc(o.note) + '</span>' +
        '</label>';
      };
      // A pickup option that names no shop cannot be posted, so it is asked for
      // here rather than discovered after the money has moved.
      const needsPoint = !!(chosen && chosen.needs_point);
      const ptRow = !needsPoint ? '' :
        '<div class="pt-pick">' +
          (point
            ? '<div class="pt-chosen"><b>' + esc(point.name) + '</b><span>' + esc(point.street + ', ' + point.city) + '</span></div>' +
              '<button type="button" class="stamp-btn" id="ckPtChange">Choose a different shop</button>'
            : '<button type="button" class="stamp-btn" id="ckPtOpen">Select a pick-up point</button>') +
          '<div id="ckPoint"></div>' +
        '</div>';
      box.innerHTML =
        (quoted.length > 1 ? '<div class="so-head">How it travels</div>' + quoted.map(opt).join('') : '') +
        ptRow +
        '<div class="del-row"><span>' + esc(opts.label || 'Lot') + '</span><span>' + money(opts.amount) + '</span></div>' +
        (collecting()
          ? '<div class="del-row"><span>Collection</span><span>Free</span></div>'
          : '<div class="del-row"><span>Delivery' + (chosen && quoted.length === 1 ? ', ' + esc(chosen.label.toLowerCase()) : '') + '</span><span>' + (chosen ? money(ship) : '\u2014') + '</span></div>') +
        '<div class="del-row"><span><b>Total</b></span><span><b>' + (chosen ? money(Number(opts.amount) + ship) : '\u2014') + '</b></span></div>' +
        '<div class="del-note">Charged once, at Stripe. Nothing is invoiced afterwards.</div>';
      // Asking for a delivery address for something nobody is delivering is the
      // kind of form that makes people abandon a checkout. The name stays: we
      // still need to know who is at the door.
      const grid = f.querySelector('.ck-grid');
      if (grid) grid.querySelectorAll('div').forEach(el => {
        const keep = el.querySelector('#ckName');
        el.hidden = collecting() && !keep;
      });
      box.querySelectorAll('input[name=shipopt]').forEach((r) => r.addEventListener('change', () => {
        chosen = quoted.find((o) => o.id === r.value) || chosen;
        point = null;            // a shop chosen for DPD is not a shop for PostNL
        drawTotal();
      }));
      const o1 = document.getElementById('ckPtOpen'); if (o1) o1.addEventListener('click', pickPoint);
      const o2 = document.getElementById('ckPtChange'); if (o2) o2.addEventListener('click', pickPoint);
    };

    async function quote(){
      const cc = document.getElementById('ckCountry').value;
      const box = document.getElementById('ckTotal');
      box.innerHTML = '<div class="del-note">Asking the carriers what this costs to ' + esc(cc) + '\u2026</div>';
      try {
        const r = await fetch(PAY_URL.replace(/\/checkout$/, '') + '/shipping-quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lotId: opts.lotId, country: cc }),
        });
        const d = await r.json();
        quoted = (d && d.options) || [];
        // No carrier account wired up yet: fall back to whatever the seller set,
        // so a missing secret cannot stop somebody buying.
        if (!quoted.length && d && typeof d.fallback === 'number'){
          quoted = [{ id: 'seller', label: 'Tracked', note: 'Posted by the seller.', price: d.fallback }];
        }
        // Collection in person, offered only to a Dutch address because nobody
        // flies in from Finland for a wrestling figure. Added after the carrier
        // options rather than before them: posting is what most buyers want, and
        // a free option at the top reads as the recommended one.
        if (cc === 'NL') {
          quoted.unshift({ id: 'pickup', label: 'Collect it yourself', carrier: null,
            note: 'Da Costastraat 49, Haarlem, by appointment. Nothing is posted and no postage is charged.',
            price: 0, pickup: true });
        }
        chosen = quoted.find(o => !o.pickup) || quoted[0] || null;
      } catch (e) { quoted = []; chosen = null; }
      if (!quoted.length){
        box.innerHTML = '<div class="del-note">We cannot post this lot to that country. Pick another destination, or message the seller.</div>';
        return;
      }
      drawTotal();
    }
    document.getElementById('ckCountry').addEventListener('change', quote);
    quote();

    document.getElementById('ckGo').addEventListener('click', () => {
      const g = id => document.getElementById(id).value.trim();
      const hint = document.getElementById('ckHint');
      const addr = { name: g('ckName'), line1: g('ckLine1'), line2: g('ckLine2'), postal_code: g('ckZip'), city: g('ckCity'), country: g('ckCountry'), shipLevel: chosen ? chosen.id : null, point: point };
      const collecting = !!(chosen && chosen.pickup);
      if (collecting && !addr.name){
        hint.textContent = 'We need a name, so we know who is coming.';
        return;
      }
      if (!collecting && (!addr.name || !addr.line1 || !addr.postal_code || !addr.city)){
        hint.textContent = 'Name, street, postcode and city are all needed before we can post it.';
        return;
      }
      if (!chosen){ hint.textContent = 'Pick how it should travel first.'; return; }
      if (chosen.needs_point && !point){ hint.textContent = 'Choose which shop it should wait at.'; return; }
      hint.textContent = 'Taking you to Stripe…';
      goToStripe(opts, addr);
    });
  }

  async function goToStripe(opts, addr){
    try {
      const r = await fetch(PAY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: opts.lotId, kind: opts.kind, email: authUser ? authUser.email : '',
          buyerId: authUser ? authUser.id : '', origin: location.origin,
          country: addr.country, address: addr, shipLevel: addr.shipLevel, point: addr.point }) });
      const d = await r.json();
      if (d && d.url) location.href = d.url;
      else openModal('Checkout error', 'Could not start payment', (d && d.error) || 'Please try again.');
    } catch (err){ openModal('Checkout error', 'Could not start payment', err.message); }
  }

  async function startCheckout(opts){
    opts = opts || {};
    track('checkout_start', { kind: opts.kind || '', amount: opts.amount || 0 }, opts.lotId);
    const money = n => '€ ' + Number(n || 0).toLocaleString('nl-NL');
    if (SB && !authUser){ openAuth(); return; }
    if (!PAY_URL){
      openModal('Secure checkout', opts.label || 'Payment', phrase(opts.kind === 'win' ? 'This will take you to a secure Stripe checkout to pay {amount} for the lot you won.' : 'This will take you to a secure Stripe checkout to buy this lot now for {amount}.', { amount: money(opts.amount) }) + ' ' + phrase('Payments are being wired up and go live shortly.'));
      return;
    }
    // The lot's own postage columns, so the total shown is the total charged.
    let lot = { shipping_eur: 0 };
    if (SB && opts.lotId){
      const { data } = await SB.from('lots').select(LOT_COLS_PUBLIC).eq('id', opts.lotId).single();
      if (data) lot = data;
    }
    askAddress(opts, lot);
  }

  // ----- Message a seller (privacy-safe relay via Resend; email never exposed) -----
  const MSG_URL = 'https://plasticempires-pay.ramongervais.workers.dev/message';
  function openMessage(sellerId, sellerName){
    if (SB && !authUser){ openAuth(); return; }
    openModal('Message', 'Contact ' + sellerName, 'Your message is emailed to the seller. They reply to your address. Neither email is shown publicly.');
    const body = document.getElementById('modalBody');
    const form = document.createElement('div'); form.className = 'bidform'; form.style.marginTop = '14px';
    form.innerHTML = '<textarea id="msgText" class="ei" rows="4" placeholder="Ask about condition, shipping, combined lots…"></textarea><div class="bidinput-row" style="margin-top:10px"><button class="btn accent" type="button" id="msgSend">Send message</button></div><div class="bidhint" id="msgHint"></div>';
    body.appendChild(form);
    document.getElementById('msgSend').addEventListener('click', async () => {
      const t = document.getElementById('msgText').value.trim();
      if (t.length < 5){ document.getElementById('msgHint').textContent = 'Please write a short message.'; return; }
      const btn = document.getElementById('msgSend'); btn.disabled = true; document.getElementById('msgHint').textContent = 'Sending…';
      try {
        const r = await fetch(MSG_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sellerId: sellerId, message: t, fromEmail: authUser ? authUser.email : '', origin: location.origin }) });
        const d = await r.json();
        if (d && d.ok){ form.remove(); document.getElementById('modalEy').textContent = 'Sent'; document.getElementById('modalTitle').textContent = 'Your message is on its way.'; document.getElementById('modalBody').textContent = phrase('We emailed it to {seller}. They will reply to your address.', { seller: sellerName }); }
        else { document.getElementById('msgHint').textContent = (d && d.error) || 'Could not send. Please try again.'; btn.disabled = false; }
      } catch (err){ document.getElementById('msgHint').textContent = err.message; btn.disabled = false; }
    });
  }

  // ----- Sell page token counter -----
  async function refreshSellTokens(){
    const el = document.getElementById('sellTokens'); if (!el) return;
    // Said first, and said to everyone. Identifying a toy costs a few cents and
    // no token, and a seller looking at a token counter has no way of knowing
    // that: the line used to read "each listing uses 1" and stop, which invites
    // exactly the wrong conclusion. Someone not signed in used to see nothing at
    // all, and they are the person who most needs to hear it.
    const free = 'Identification is free';
    if (!SB || !authUser){ el.innerHTML = free + ' &middot; ' + phrase('a listing is only used when you sell'); return; }
    try {
      const { data } = await SB.from('profiles').select('tokens').eq('id', authUser.id).single();
      const t = data ? data.tokens : null;
      if (t == null){ el.innerHTML = free + ' &middot; ' + phrase('a listing is only used when you sell'); return; }
      el.innerHTML = free + ' &middot; <b>' + t + '</b> listing' + (t === 1 ? '' : 's') + ' left'
        + (t <= 0 ? ' &middot; <a data-nav="account">buy more</a>' : '');
    } catch (e){ el.innerHTML = free; }
  }

  // ----- Leave a seller review (buyer only, one per purchase) -----
  function openReview(sellerId, lotId, lotName){
    if (SB && !authUser){ openAuth(); return; }
    openModal('Review', 'Rate this seller', phrase('How was your purchase of {lot}? Your review appears on the seller profile.', { lot: lotName || phrase('this lot') }));
    const body = document.getElementById('modalBody');
    const form = document.createElement('div'); form.className = 'bidform'; form.style.marginTop = '14px';
    form.innerHTML = '<div class="rev-stars" id="revStars">' + [1, 2, 3, 4, 5].map(n => '<button type="button" class="rev-star" data-n="' + n + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '">&#9733;</button>').join('') + '</div><textarea id="revText" class="ei" rows="3" placeholder="What was your experience? (optional)"></textarea><div class="bidinput-row" style="margin-top:10px"><button class="btn accent" type="button" id="revSend">Post review</button></div><div class="bidhint" id="revHint"></div>';
    body.appendChild(form);
    let rating = 0;
    const stars = form.querySelectorAll('.rev-star');
    const paint = () => stars.forEach((s, i) => s.classList.toggle('on', i < rating));
    stars.forEach((s, i) => s.addEventListener('click', () => { rating = i + 1; paint(); }));
    document.getElementById('revSend').addEventListener('click', async () => {
      if (!rating){ document.getElementById('revHint').textContent = 'Pick a star rating.'; return; }
      const btn = document.getElementById('revSend'); btn.disabled = true;
      const { error } = await SB.from('reviews').insert({ reviewer_id: authUser.id, lot_id: lotId, rating: rating, body: (document.getElementById('revText').value || '').trim() || null });
      if (error){ document.getElementById('revHint').textContent = /duplicate|unique/i.test(error.message) ? 'You already reviewed this purchase.' : (/row-level|policy/i.test(error.message) ? 'Only the buyer of this lot can review it.' : error.message); btn.disabled = false; return; }
      form.remove();
      document.getElementById('modalEy').textContent = 'Thank you';
      document.getElementById('modalTitle').textContent = 'Review posted.';
      document.getElementById('modalBody').textContent = phrase('Your review now appears on the seller profile.');
      if (typeof renderAccount === 'function') renderAccount();
    });
  }

  // ----- Lot detail page (live, from DB) -----
  async function openLot(id, opts){
    const body = document.getElementById('lotBody');
    const e = s => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
    const money = n => '€ ' + Number(n || 0).toLocaleString('nl-NL');
    // Long values (Completeness, Curator's notes) stack under their label. Right
    // -aligning six lines of prose reads as a layout fault, not as a choice.
    const row = (k, v) => '<div class="row' + (String(v).length > 58 ? ' col' : '') + '"><span class="k">' + e(k) + '</span><span class="v">' + e(v) + '</span></div>';
    document.getElementById('lotCrumb').textContent = 'Lot';
    body.innerHTML = '<p style="padding:64px 0;color:var(--ink-3);font-family:var(--body)">Loading lot…</p>';
    show('lot', { extra: id, fromHistory: opts && opts.fromHistory });
    track('lot_view', null, id);
    if (!SB || !id){ body.innerHTML = '<p style="padding:64px 0;font-family:var(--body)">This lot is only available on the live site.</p>'; return; }
    const { data: lot, error } = await SB.from('lots').select(LOT_COLS_PUBLIC).eq('id', id).single();
    // The seller needs the address to post the parcel and the buyer needs the
    // tracking. Asked for separately, and only when somebody is signed in,
    // because the function refuses anyone who is neither.
    if (lot && authUser){
      try {
        const { data: priv } = await SB.rpc('lot_private', { p_lot: id });
        const p = Array.isArray(priv) ? priv[0] : priv;
        if (p) { lot.ship_to = p.ship_to; lot.tracking = p.tracking; }
      } catch (e) { /* not entitled, or not signed in: the page renders without them */ }
    }
    if (error || !lot){
      // "It may have been removed" was the only thing this said, which sent me
      // looking for a deleted lot when the real problem was a malformed link: the
      // admin button was building /lot/admin/ and the id in the path was the word
      // "admin". A lot id is always a uuid, so a value that is not one means the
      // address is wrong, not the lot gone. Worth separating: the two have
      // completely different causes.
      // 42501 is permission denied, and on a lot query it never means the lot is
      // gone. It means this tab is running JavaScript older than the database:
      // it asked for a column that has since been locked down, so Postgres
      // refused the whole row and the page concluded the lot had been deleted.
      //
      // That happened for real on 1 October. The reserve column was revoked a
      // few minutes after the code that stopped asking for it went out, and
      // every tab already open kept asking. "Code first, then SQL" turns out
      // not to be enough: deployed is not the same as loaded. A reload fixes
      // it in a second once you know that, and nothing on the page said so.
      if (error && (error.code === '42501' || /permission denied/i.test(error.message || ''))) {
        body.innerHTML = deadEnd('Out of date', 'This page is older than the shop',
          'Nothing is wrong with the lot and nothing is wrong with your account. This tab has been open since before we last changed something, so it is asking for the catalogue in a way we no longer answer. One reload and it is current again.');
        const b = body.querySelector('.btn');
        if (b) { b.textContent = 'Reload the page'; b.removeAttribute('href'); b.removeAttribute('data-nav'); b.style.cursor = 'pointer'; b.addEventListener('click', function(){ location.reload(true); }); }
        if (typeof track === 'function') track('stale_client', { where: 'lot' }, id);
        return;
      }
      const looksLikeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
      body.innerHTML = looksLikeId
        ? deadEnd('Not found', 'This lot is not here any more',
            'It was sold and archived, or the seller took it out of the shop. The catalogue turns over every week, so a link that worked last month can point at nothing today. Everything currently for sale is one click away.')
        : deadEnd('Not a lot address', 'That address does not name a lot',
            'A lot address ends in a long identifier made of letters and numbers, and this one does not. The link was most likely cut short somewhere between being copied and being opened.');
      return;
    }
    // An unsold lot is the seller's business, not a public record of a sale
    // that did not happen. Only its owner sees the page. This is a courtesy in
    // the interface, not a security boundary: the row is still world-readable
    // over the API until the RLS note in section 11 of the schema is acted on.
    if (lot.status === 'unsold' && !(authUser && authUser.id === lot.seller_id)){
      body.innerHTML = deadEnd('Not listed', 'This one is not in the shop right now',
        'The seller has taken it out of the catalogue. That is usually temporary: a lot comes out to be re-photographed, corrected or held back, and goes up again afterwards. It may well return.');
      return;
    }
    // amount and created_at only: bidder_id is private, and the bid history on a
    // lot page never showed a name anyway.
    const { data: bidRows } = await SB.from('bids').select('amount,created_at').eq('lot_id', id).order('amount', { ascending: false });
    // Whether the signed-in visitor is the one leading, answered by the database
    // for one lot rather than by handing the whole bid list to the browser.
    let iAmLeading = false;
    if (SB && authUser){ try { const r = await SB.rpc('am_i_leading', { target: id }); iAmLeading = !!(r && r.data); } catch (e) {} }
    let seller = null;
    if (lot.seller_id){ const { data: sp } = await SB.from('seller_public').select('display_name,type,location').eq('id', lot.seller_id).single(); seller = sp; }
    const bids = bidRows || [];
    const cur = bids.length ? Number(bids[0].amount) : Number(lot.starting_bid || 0);
    const ended = lot.status === 'ended' || lot.status === 'sold' || lot.status === 'unsold' || (lot.ends_at && new Date(lot.ends_at) <= Date.now());
    const topBid = bids.length ? bids[0] : null;
    // Two booleans, never the figure. One round trip, and the page still draws
    // if it fails: no note rather than a wrong one.
    const rs = (await reserveState([lot.id]))[lot.id] || { has: false, met: false };
    const reserve = rs.has;
    const reserveMet = !rs.has || rs.met;
    const iWon = ended && topBid && reserveMet && authUser && iAmLeading;
    const isSold = lot.status === 'sold';
    const isPreview = lot.status === 'preview';
    const isFixed = lot.sale_type === 'fixed';
    const fixedPrice = Number(lot.buy_now || cur || 0);
    const imgs = (lot.image_urls || []).filter(Boolean);
    document.getElementById('lotCrumb').textContent = lot.toy || 'Lot';

    // The lot writes its own title, description and Product schema. Without this
    // every lot shared to a chat showed "Hammer & Mold, know the toy, then own
    // it" and no price, and a search for a specific figure had nothing to match
    // against but the home page.
    (function lotSeo(){
      const bits = [lot.maker, lot.year, lot.line].filter(Boolean).join(' \u00b7 ');
      const title = (lot.toy || 'Lot') + (bits ? ' \u00b7 ' + bits : '') + ' \u00b7 Hammer & Mold';
      const desc = String(lot.blurb || lot.completeness || lot.notes || '')
        .replace(/\s+/g, ' ').trim().slice(0, 300) ||
        'A curated vintage toy at Hammer & Mold, identified, dated and condition-graded.';
      setMeta('lot', PATHS.lot + '/' + encodeURIComponent(lot.id), title, desc);
      const hero = (lot.image_urls || []).filter(Boolean)[0];
      if (hero){
        setTag('meta[property="og:image"]', 'content', hero);
        setTag('meta[name="twitter:image"]', 'content', hero);
        setTag('meta[property="og:image:alt"]', 'content', (lot.toy || 'Vintage toy') + ', photographed for Hammer & Mold');
      }

      // Product + Offer, so a price, a condition and an availability exist in a
      // form a search engine can read. A shop with none of this is invisible to
      // exactly the searches it should win.
      const price = isFixed ? fixedPrice : (cur || lot.starting_bid || 0);
      const avail = isSold ? 'SoldOut' : (isPreview ? 'PreOrder' : (ended ? 'SoldOut' : 'InStock'));
      const condMap = t => /mint|sealed|misb|mib/i.test(t || '') ? 'NewCondition' : 'UsedCondition';
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: lot.toy || 'Vintage toy',
        description: desc,
        image: (lot.image_urls || []).filter(Boolean).slice(0, 6),
        itemCondition: 'https://schema.org/' + condMap(lot.condition),
        offers: {
          '@type': 'Offer',
          url: 'https://hammerandmold.com' + PATHS.lot + '/' + encodeURIComponent(lot.id),
          priceCurrency: 'EUR',
          price: Number(price).toFixed(2),
          availability: 'https://schema.org/' + avail,
          itemCondition: 'https://schema.org/' + condMap(lot.condition),
          seller: { '@type': 'Organization', name: 'Hammer & Mold' },
        },
      };
      if (lot.maker) ld.brand = { '@type': 'Brand', name: String(lot.maker).split(/[(,]/)[0].trim() };
      if (lot.year) ld.releaseDate = String(lot.year);
      let tag = document.getElementById('lotLd');
      if (!tag){ tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.id = 'lotLd'; document.head.appendChild(tag); }
      tag.textContent = JSON.stringify(ld);
    })();

    let ends = '';
    if (lot.ends_at){ const ms = new Date(lot.ends_at) - Date.now(); if (ms <= 0) ends = 'Ended'; else { const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000); ends = d > 0 ? d + 'd ' + h + 'h left' : h + 'h left'; } }
    // The clock has not started. Saying "7d left" here would be a countdown on a
    // timer that is not running, which is the one thing a bidder must not misread.
    else ends = (lot.auction_days || 7) + ' days from first bid';
    const condPct = (c => { const t = String(c || '').toLowerCase(); if (/mint|mib|misb|sealed/.test(t)) return 100; if (/near|excellent/.test(t)) return 85; if (/very good|\bvg\b/.test(t)) return 70; if (/\bgood\b/.test(t)) return 55; if (/fair|played|loose/.test(t)) return 45; if (/poor|project|parts/.test(t)) return 25; return 0; })(lot.condition);
    const variants = Array.isArray(lot.variants) ? lot.variants : [];
    const varHtml = variants.length ? '<div class="lot-variants">' + variants.map(v => '<span class="lot-chip"><b>' + e(v.axis || '') + '</b> ' + e(v.value || '') + '</span>').join('') + '</div>' : '';
    const mainImg = imgs.length ? imgs[0] : '';
    const gallery =
      '<div class="art-media">' +
        '<div class="lot-main" id="lotMain">' +
          '<span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>' +
          (mainImg ? '<img class="lot-img" id="lotImg" src="' + e(mainImg) + '" alt="' + e(lot.toy) + '" draggable="false">' : '<div class="vlabel"><div class="k">' + e([lot.maker, lot.year].filter(Boolean).join(' · ')) + '</div><div class="n">' + e(lot.toy) + '</div></div>') +
          '<div class="zoom-lens" id="zoomLens" hidden></div>' +
        '</div>' +
        (imgs.length > 1 ? '<div class="lot-thumbs">' + imgs.map((u, i) => '<button class="lot-th' + (i === 0 ? ' active' : '') + '" type="button" data-img="' + e(u) + '" style="background-image:url(' + e(u) + ')"></button>').join('') + '</div>' : '') +
        '<div class="vcap" style="text-align:start">' + (imgs.length ? phrase(imgs.length === 1 ? '{n} photo from the seller.' : '{n} photos from the seller.', { n: imgs.length }) : 'No photos yet.') + '</div>' +
      '</div>';
    const isOwner = authUser && lot.seller_id && authUser.id === lot.seller_id;
    // Edit sits next to Remove, because this is where an owner looks for it. It
    // is only offered to an admin: the editor itself lives in the console, and
    // sending a seller to a gate they cannot pass is worse than not offering it.
    // A seller-facing editor is still to build.
    const ownerHtml = isOwner
      ? '<div class="lot-owner"><span>This is your lot.</span>' +
        '<button class="lot-remove" id="lotEditLive" type="button" hidden>Edit this lot</button>' +
        '<button class="lot-remove" id="lotRemove" type="button">Take out of the shop</button></div>'
      : '';
    const s = lot.ship_to;
    // A collected lot has no address to show, and showing an empty card would
    // read as a fault. It says who is coming instead.
    const shipHtml = (isOwner && s && s.pickup)
      ? '<div class="won-box"><div class="won-h">Being collected</div><div class="won-sub">' +
        e(s.name || 'The buyer') + ' is collecting this in person. Nothing to post.</div></div>'
      : (isOwner && s) ? '<div class="won-box"><div class="won-h">Ship to</div><div class="won-sub" style="white-space:pre-line">' + [s.name, s.line1, s.line2, [s.postal_code, s.city].filter(Boolean).join(' '), s.state, s.country].filter(Boolean).map(e).join('\n') + (s.phone ? '\n' + e(s.phone) : '') + (s.email ? '\n' + e(s.email) : '') + '</div></div>' : '';
    const isBuyer = authUser && s && s.email && authUser.email && s.email.toLowerCase() === authUser.email.toLowerCase();
    const shipped = !!lot.shipped_at;
    // A collected lot is never shipped, so offering a tracking number and a
    // "mark as shipped" button is asking the seller to lie about a parcel that
    // does not exist. The previous version showed that panel on every sold lot.
    const collected = !!(s && s.pickup);
    const shipStatusHtml = !isSold ? '' : collected ? (
      shipped
        ? '<div class="won-box"><div class="won-h">Collected</div><div class="won-sub">Handed over ' + new Date(lot.shipped_at).toLocaleDateString(LOC()) + '.</div></div>'
        : (isOwner
            ? '<div class="won-box"><div class="won-h">Waiting to be collected</div><div class="won-sub">' + e(s.name || 'The buyer') + ' is picking this up in person. Mark it off once they have.</div><button class="btn accent" id="shipBtn" type="button" style="margin-top:10px;width:100%">Mark as collected</button></div>'
            : '<div class="won-box"><div class="won-h">Ready to collect</div><div class="won-sub" style="white-space:pre-line">Hammer &amp; Mold, Da Costastraat 49, 2032 MG Haarlem.\nBy appointment: message the seller from your account to agree a time before you travel.</div></div>')
    ) : (
      shipped
        ? '<div class="won-box"><div class="won-h">Shipped</div><div class="won-sub">Sent ' + new Date(lot.shipped_at).toLocaleDateString(LOC()) + ((lot.tracking && (isOwner || isBuyer)) ? ' &middot; ' + phrase('Tracking: {code}', { code: e(lot.tracking) }) : '') + '</div></div>'
        : (isOwner
            ? '<div class="won-box"><div class="won-h">Mark as shipped</div><div class="won-sub">Add a tracking number (optional) and let the buyer know it is on the way.</div><input id="shipTrack" class="ei" placeholder="Tracking number (optional)" style="margin-top:10px"><button class="btn accent" id="shipBtn" type="button" style="margin-top:10px;width:100%">Mark as shipped</button></div>'
            : (isBuyer ? '<div class="won-box"><div class="won-h">Awaiting shipment</div><div class="won-sub">The seller has been notified and will ship your item.</div></div>' : '')));
    const detail =
      '<div class="art-detail">' +
        '<div class="art-sub">' + e([lot.maker, lot.year, lot.line].filter(Boolean).join(' · ')) + '</div>' +
        '<h1 class="art-title">' + e(lot.toy) + '</h1>' +
        // The lead is the blurb. Older lots have no blurb, so they fall back to
        // notes rather than losing their opening paragraph entirely.
        ((lot.blurb || lot.notes) ? '<p style="font-family:var(--body);font-size:18px;color:var(--ink);margin:0;max-width:46ch">' + e(lot.blurb || lot.notes) + '</p>' : '') +
        varHtml +
        '<div class="spec">' +
          (lot.maker ? row('Maker', lot.maker) : '') +
          (lot.year ? row('Released', lot.year) : '') +
          (lot.line ? row('Line', lot.line) : '') +
          (lot.condition ? '<div class="row"><span class="k">Condition</span><span class="v">' + (condPct ? qstarsPct(condPct) + ' ' : '') + e(lot.condition) + '</span></div>' : '') +
          (lot.stamp_shown === false ? row("Maker's mark", 'Not shown, dated from the sculpt') : (lot.stamp_shown === true ? row("Maker's mark", 'Photographed') : '')) +
          (lot.completeness ? row('Completeness', lot.completeness) : '') +
          // Right under Completeness, above the notes. Condition says how it looks,
          // this says why: a repainted figure and an original one are different
          // objects at different prices, and a buyer who finds that out after paying
          // does not come back. Only rendered when the seller answered, because
          // inventing "as found" for the twenty older lots would be a claim we made
          // up on their behalf.
          (lot.care_level
            ? '<div class="row' + (lot.care_note ? ' col' : '') + '"><span class="k">Restoration</span><span class="v">' +
                '<b>' + e(careLabel(lot.care_level)) + '</b>' +
                (lot.care_note ? '<br>' + e(lot.care_note) : '') +
              '</span></div>'
            : '') +
          // The forensics: stamp transcription, dating, variant reasoning. Only
          // shown when a blurb took over the lead, or it would appear twice.
          ((lot.blurb && lot.notes) ? row("Curator's notes", lot.notes) : '') +
          (seller ? '<div class="row"><span class="k">Seller</span><span class="v"><a data-nav="seller" data-seller="' + e(lot.seller_id) + '" style="text-decoration:underline;text-underline-offset:3px;cursor:pointer">' + e(seller.display_name || 'Private seller') + '</a>' + (seller.location ? ' · ' + e(seller.location) : '') + '</span></div>' : '') +
          (lot.weight_kg ? row('Packed weight', Number(lot.weight_kg) + ' kg') : '') +
          // Written out rather than passed through row(), which escapes its value:
          // this one needs a real element for the live quote to write into.
          '<div class="row col"><span class="k">Shipping</span><span class="v" id="lotShip">Quoted for your address at checkout</span></div>' +
        '</div>' +
        '<div class="auction">' +
          '<div class="auction-row">' +
            '<div><div class="auc-label">' + (ended ? (topBid ? (reserveMet ? 'Winning bid' : 'Highest bid') : (isSold ? 'Sold for' : 'Result')) : (isFixed ? 'Price' : (bids.length ? phrase(bids.length === 1 ? 'Current bid · {n} bid' : 'Current bid · {n} bids', { n: bids.length }) : 'Starting bid'))) + '</div><div class="auc-amount">' + (ended ? (topBid ? money(cur) : (isSold && lot.buy_now ? money(lot.buy_now) : (isFixed ? money(fixedPrice) : '-'))) : (isFixed ? money(fixedPrice) : money(cur))) + '</div>' +
              (ended ? '' : '<div class="auc-del" id="lotDel">Working out delivery\u2026</div>' +
                 '<div class="del-panel" id="delPanel" hidden></div>') + '</div>' +
            '<div><div class="auc-label">' + (isPreview ? 'Opens' : (ended ? 'Auction' : (isFixed ? 'Sale' : 'Ends in'))) + '</div><div class="auc-countdown' + ((!ended && lot.extended) || isPreview ? ' ext' : '') + '">' + (isPreview ? '1 Oct 2026' : (ended ? 'Ended' : (isFixed ? 'Direct sale' : ends))) + '</div></div>' +
          '</div>' +
          ((!ended && !isPreview && !isFixed && lot.extended) ? '<div class="ext-note">Anti-snipe · extended by 2 minutes after a late bid</div>' : '') +
          ((!ended && !isPreview && !isFixed && reserve) ? '<div class="reserve-note' + (reserveMet ? ' met' : '') + '">' + (reserveMet ? 'Reserve met' : 'Reserve not yet met') + '</div>' : '') +
          (ended ?
            '<div class="won-box' + (iWon ? ' win' : '') + '">' +
              (iWon ? '<div class="won-h">You won this lot.</div><div class="won-sub">' + (isSold ? 'Payment received. Thank you.' : 'Complete your payment to confirm the purchase.') + '</div>' + (isSold ? '' : '<button class="btn accent" type="button" id="lotPay">Pay now &middot; ' + money(cur) + '</button>') :
                (topBid ? (reserveMet ? '<div class="won-h">' + (isSold ? 'Sold.' : 'Auction ended.') + '</div><div class="won-sub">Winning bid ' + money(cur) + '.</div>' : '<div class="won-h">Auction ended.</div><div class="won-sub">Reserve not met. The lot was not sold.</div>') : (isSold ? '<div class="won-h">Sold.</div><div class="won-sub">This lot has been purchased' + (lot.buy_now ? ' for ' + money(lot.buy_now) : '') + '.</div>' : '<div class="won-h">Auction ended.</div><div class="won-sub">No bids were placed.</div>'))) +
            '</div>' :
            (isPreview ?
              '<div class="won-box"><div class="won-h">Preview</div><div class="won-sub">' + (isFixed ? 'This item is not on sale yet.' : 'Bidding has not opened yet.') + ' Watch it to be notified the moment it goes live.</div><button class="btn accent" type="button" id="lotWatch">' + (watchedIds.has(lot.id) ? 'Watching &check;' : 'Watch this lot') + '</button></div>' :
              (isFixed ?
                '<div class="buy-row"><button class="btn accent" type="button" id="lotBuy">Buy now &middot; ' + money(fixedPrice) + '</button></div>' :
                '<div class="buy-row">' +
                  '<button class="btn accent" type="button" id="lotBid">Place a bid</button>' +
                  (lot.buy_now ? '<button class="btn ghost" type="button" id="lotBuy">Buy now &middot; ' + money(lot.buy_now) + '</button>' : '') +
                '</div>'))) +
          // No third shipping statement here. This one read shipping_eur, a column
          // filled from an estimated table before the carriers were wired up, and
          // it printed EUR 15.00 under the buy button while the live quote three
          // rows above said EUR 3.85. One number, from the carrier, or none.
          '<div class="trust">' + (isPreview ? (isFixed ? 'This item is not on sale yet.' : 'This lot is not open for bidding yet.') : (ended ? 'This lot is closed.' : (isFixed ? 'A direct-sale item, buy it now to purchase. Every piece is inspected, and the risk in transit is ours until it reaches you.' : 'Bidding is binding and a hidden reserve may apply. The clock starts on the first bid, not on a date, so this lot waits until someone wants it. Every piece is inspected, and the risk in transit is ours until it reaches you.'))) + '</div>' +
          // Sharing only became possible today: until this morning every lot had
          // the same URL, so a link sent to a friend opened the home page and the
          // toy was never seen. Native sheet where the browser has one, a copy
          // button and two direct links where it does not.
          '<div class="share">' +
            '<span class="sl">Share</span>' +
            // Every one carries its mark. A row of word-only buttons reads as a
            // list of settings; the glyph is what makes it read as sharing. Solid
            // shapes on currentColor, so they invert with the button on hover and
            // work on both themes without a second colour.
            // "Share this lot" next to the row's own "Share" label was saying the
            // word twice and it was the width that pushed X onto a second line.
            '<button type="button" id="shNative" hidden>' + SH_ICON.share + 'Send</button>' +
            '<button type="button" id="shCopy">' + SH_ICON.link + 'Copy link</button>' +
            '<a id="shWa" target="_blank" rel="noopener">' + SH_ICON.whatsapp + 'WhatsApp</a>' +
            '<a id="shFb" target="_blank" rel="noopener">' + SH_ICON.facebook + 'Facebook</a>' +
            // Instagram has no share URL. There is no facebook.com/sharer for it,
            // there never has been, and a link in a caption is not clickable on
            // Instagram anyway. So this button does the thing a person actually
            // does next: it puts a finished caption on the clipboard, ready to
            // paste under the photo. On a phone the Send button is the better
            // route, because the operating system sheet has real Instagram in it.
            '<button type="button" id="shIg">' + SH_ICON.instagram + 'Instagram</button>' +
            '<a id="shX" target="_blank" rel="noopener">' + SH_ICON.x + 'X</a>' +
          '</div>' +
          '<div class="protect"><button class="protect-h" type="button" id="lotProtect" aria-expanded="false">' +
            '<span>Buyer protection</span><span class="protect-x">+</span></button>' +
            '<ul class="protect-list" hidden>' + PROTECTION.map(function(x){ return '<li><b>' + x[0] + '</b><span>' + x[1] + '</span></li>'; }).join('') +
          '</ul></div>' +
          ownerHtml + shipHtml + shipStatusHtml +
        '</div>' +
      '</div>';
    const hist = bids.length ?
      '<hr class="rule" /><section class="band"><div class="wrap"><div class="band-head"><div><div class="ey">Bid history</div><h2>' + bids.length + ' bid' + (bids.length > 1 ? 's' : '') + '</h2></div></div>' +
      '<div class="bidhist">' + bids.map(function(b, i){
        // Bidders are never named: the bids table stopped exposing bidder_id in
        // August and the history never showed a name anyway. What was missing
        // was when, which is the half that tells you whether a lot is moving or
        // whether one person looked at it a week ago and nobody since.
        const d = b.created_at ? new Date(b.created_at) : null;
        const when = d ? d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
        return '<div class="bidrow' + (i === 0 ? ' top' : '') + '">' +
          '<span class="who">' + (i === 0 ? 'Highest bid' : 'Bid') + (when ? '<span class="when">' + e(when) + '</span>' : '') + '</span>' +
          '<span class="amt">' + money(b.amount) + '</span></div>';
      }).join('') +
      ((!ended && !isPreview && !isFixed && reserve)
        ? '<div class="bidnote">' + (reserveMet
            ? 'The reserve has been met, so this lot sells to whoever is in front when the clock runs out.'
            : 'The reserve has not been met yet. If nobody goes higher, the lot does not sell and the highest bidder does not get it.') + '</div>'
        : '') +
      '</div></div></section>' : '';
    body.innerHTML = '<div class="art-top">' + gallery + detail + '</div>' + hist;

    // ---- Share ----
    (function shareWire(){
      const url = 'https://hammerandmold.com' + PATHS.lot + '/' + encodeURIComponent(lot.id);
      const bits = [lot.maker, lot.year].filter(Boolean).join(' ');
      // The text carries the toy and its maker even when a preview card does not
      // render, which matters: a link crawler does not run our JavaScript, so on
      // some apps this typed line is the only description that arrives.
      const text = phrase('{lot} at Hammer & Mold', { lot: (lot.toy || phrase('A vintage toy')) + (bits ? ', ' + bits : '') });
      const nat = document.getElementById('shNative');
      const cp = document.getElementById('shCopy');
      const wa = document.getElementById('shWa');
      const xx = document.getElementById('shX');
      const fb = document.getElementById('shFb');
      const ig = document.getElementById('shIg');
      if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
      if (xx) xx.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
      // Facebook's sharer takes the URL and nothing else: any text passed to it
      // is ignored and the card is built from the page's own og: tags, which
      // build-pages.mjs writes per lot. So the preview is only as good as those,
      // and there is no point composing a line here that will be thrown away.
      if (fb) fb.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);

      // One clipboard write, two buttons. Falls back to selecting a temporary
      // input where the clipboard is refused, because the point is that the
      // visitor ends up with the text either way.
      async function copyText(value){
        try { await navigator.clipboard.writeText(value); return; }
        catch (e) {
          const t = document.createElement('textarea');
          t.value = value; document.body.appendChild(t); t.select();
          try { document.execCommand('copy'); } catch (e2) {}
          t.remove();
        }
      }
      // innerHTML with the icon back, not textContent: setting text would wipe
      // the svg and leave a word where a marked button was, and it would never
      // come back.
      function flash(btn, icon, done, back){
        btn.innerHTML = icon + done; btn.classList.add('done');
        setTimeout(() => { btn.innerHTML = icon + back; btn.classList.remove('done'); }, 2200);
      }

      if (ig) ig.addEventListener('click', async () => {
        // A caption, not a link. Instagram does not make a caption link
        // clickable, so the caption says where the lot is rather than pretending
        // the address is a button.
        const cap = text + '.\n\n' + (lot.blurb ? String(lot.blurb).slice(0, 300) + '\n\n' : '') +
          'Bidding now at hammerandmold.com, link in bio.\n' + url;
        await copyText(cap);
        flash(ig, SH_ICON.instagram, 'Caption copied', 'Instagram');
        if (typeof track === 'function') track('share', { how: 'instagram', lot: lot.id });
      });
      if (nat && navigator.share){
        nat.hidden = false;
        nat.addEventListener('click', () => {
          navigator.share({ title: lot.toy || 'Hammer & Mold', text: text, url: url }).catch(() => {});
          if (typeof track === 'function') track('share', { how: 'native', lot: lot.id });
        });
      }
      if (cp) cp.addEventListener('click', async () => {
        await copyText(url);
        flash(cp, SH_ICON.link, 'Link copied', 'Copy link');
        if (typeof track === 'function') track('share', { how: 'copy', lot: lot.id });
      });
    })();

    var pb = document.getElementById('lotProtect');
    if (pb) pb.addEventListener('click', function(){
      var list = pb.parentNode.querySelector('.protect-list');
      var open = list.hidden;
      list.hidden = !open;
      pb.setAttribute('aria-expanded', open ? 'true' : 'false');
      pb.querySelector('.protect-x').textContent = open ? '\u2013' : '+';
    });
    let mainIdx = 0, ox = 0.5, oy = 0.5;
    const lotImg = document.getElementById('lotImg');
    const lotMain = document.getElementById('lotMain');
    const thumbs = [...body.querySelectorAll('.lot-th')];
    const setMain = idx => {
      mainIdx = (idx + imgs.length) % imgs.length;
      ox = 0.5; oy = 0.5;
      if (lotImg){ lotImg.src = imgs[mainIdx]; lotImg.style.objectPosition = '50% 50%'; }
      thumbs.forEach((x, i) => x.classList.toggle('active', i === mainIdx));
    };
    thumbs.forEach((t, idx) => t.addEventListener('click', () => setMain(idx)));
    if (lotMain && lotImg && imgs.length){
      // prev / next arrows on the large view
      if (imgs.length > 1){
        [[-1, '&#8249;', 'prev'], [1, '&#8250;', 'next']].forEach(([dir, sym, cls]) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'lot-nav ' + cls; b.innerHTML = sym; b.setAttribute('aria-label', dir < 0 ? 'Previous photo' : 'Next photo');
          b.addEventListener('click', ev => { ev.stopPropagation(); setMain(mainIdx + dir); });
          lotMain.appendChild(b);
        });
      }
      const hover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
      const lens = document.getElementById('zoomLens');
      document.querySelectorAll('.zoom-pane').forEach(p => p.remove());
      const pane = document.createElement('div'); pane.className = 'zoom-pane'; pane.hidden = true; document.body.appendChild(pane);
      const ZOOM = 4;
      let dragging = false, moved = false, sx = 0, sy = 0, sox = 0.5, soy = 0.5, ovX = 0, ovY = 0;
      const dims = () => { const mr = lotMain.getBoundingClientRect(); const nw = lotImg.naturalWidth, nh = lotImg.naturalHeight; const f = (nw && nh) ? Math.max(mr.width / nw, mr.height / nh) : 1; return { mr, nw, nh, f, ovX: Math.max(0, nw * f - mr.width), ovY: Math.max(0, nh * f - mr.height) }; };
      const place = () => { const mr = lotMain.getBoundingClientRect(); pane.style.width = mr.width + 'px'; pane.style.height = mr.height + 'px'; let left = mr.right + 16; if (left + mr.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mr.width - 8); pane.style.left = left + 'px'; pane.style.top = mr.top + 'px'; pane.style.backgroundImage = 'url(' + (lotImg.currentSrc || lotImg.src) + ')'; };
      const leaveZoom = () => { pane.hidden = true; lens.hidden = true; };
      const showZoom = (mx, my, d) => {
        if (pane.hidden){ place(); pane.hidden = false; lens.hidden = false; }
        const cropX = d.ovX * ox, cropY = d.ovY * oy;
        const lensW = d.mr.width / ZOOM, lensH = d.mr.height / ZOOM;
        const lx = Math.max(0, Math.min(d.mr.width - lensW, mx - lensW / 2)), ly = Math.max(0, Math.min(d.mr.height - lensH, my - lensH / 2));
        lens.style.width = lensW + 'px'; lens.style.height = lensH + 'px'; lens.style.left = lx + 'px'; lens.style.top = ly + 'px';
        pane.style.backgroundSize = (d.nw * d.f * ZOOM) + 'px ' + (d.nh * d.f * ZOOM) + 'px';
        pane.style.backgroundPosition = '-' + ((lx + cropX) * ZOOM) + 'px -' + ((ly + cropY) * ZOOM) + 'px';
      };
      // The cursor has to say which of the three gestures is available, and that
      // depends on the photo: only one that overflows the square can be dragged.
      // A crosshair said "point precisely" when the answer was "you can move this".
      const panCursor = d => (d && (d.ovX >= 1 || d.ovY >= 1)) ? 'grab' : 'zoom-in';
      const setPanCursor = () => { lotImg.style.cursor = panCursor(dims()); };
      if (hover){
        setPanCursor();
        lotMain.addEventListener('mousemove', ev => {
          if (dragging) return;
          const d = dims(); if (!d.nw){ leaveZoom(); return; }
          lotImg.style.cursor = panCursor(d);   // recomputed: each photo crops differently
          const mx = ev.clientX - d.mr.left, my = ev.clientY - d.mr.top;
          if (mx < 0 || my < 0 || mx > d.mr.width || my > d.mr.height){ leaveZoom(); return; }
          showZoom(mx, my, d);
        });
        lotMain.addEventListener('mouseleave', leaveZoom);
      }
      // drag to pan when the image overflows the square (portrait / landscape)
      lotMain.addEventListener('pointerdown', ev => {
        if (ev.target.closest('.lot-nav')) return;
        const d = dims(); if (d.ovX < 1 && d.ovY < 1) return;
        dragging = true; moved = false; sx = ev.clientX; sy = ev.clientY; sox = ox; soy = oy; ovX = d.ovX; ovY = d.ovY;
        lotImg.style.cursor = 'grabbing'; leaveZoom();
        try { lotMain.setPointerCapture(ev.pointerId); } catch (e) {}
      });
      lotMain.addEventListener('pointermove', ev => {
        if (!dragging) return;
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        if (ovX >= 1) ox = Math.max(0, Math.min(1, sox - dx / ovX));
        if (ovY >= 1) oy = Math.max(0, Math.min(1, soy - dy / ovY));
        lotImg.style.objectPosition = (ox * 100) + '% ' + (oy * 100) + '%';
      });
      const endDrag = () => { if (!dragging) return; dragging = false; setPanCursor(); setTimeout(() => { moved = false; }, 0); };
      lotMain.addEventListener('pointerup', endDrag);
      lotMain.addEventListener('pointercancel', endDrag);
      // click opens fullscreen (unless it was a pan-drag)
      lotMain.addEventListener('click', ev => { if (ev.target.closest('.lot-nav') || moved) return; openZoom(imgs, mainIdx); });
    }
    const bidBtn = document.getElementById('lotBid'); if (bidBtn) bidBtn.addEventListener('click', () => openBid(lot.toy, cur, bids.length, lot.id, lot.seller_id));
    const buyBtn = document.getElementById('lotBuy'); if (buyBtn) buyBtn.addEventListener('click', () => startCheckout({ lotId: lot.id, kind: 'buynow', amount: lot.buy_now, label: lot.toy }));
    const payBtn = document.getElementById('lotPay'); if (payBtn) payBtn.addEventListener('click', () => startCheckout({ lotId: lot.id, kind: 'win', amount: cur, label: lot.toy }));
    const shipBtn = document.getElementById('shipBtn'); if (shipBtn) shipBtn.addEventListener('click', async () => {
      shipBtn.disabled = true; shipBtn.textContent = 'Saving…';
      const track = ((document.getElementById('shipTrack') || {}).value || '').trim() || null;
      try {
        const { error: ue } = await SB.from('lots').update({ shipped_at: new Date().toISOString(), tracking: track }).eq('id', lot.id);
        if (ue) throw ue;
        try { await fetch(SHIP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lotId: lot.id }) }); } catch (e) {}
        openModal('Marked as shipped', lot.toy || 'Lot', 'The buyer has been notified' + (track ? ' with tracking ' + track : '') + '.');
        openLot(lot.id);
      } catch (err) { shipBtn.disabled = false; shipBtn.textContent = 'Mark as shipped'; openModal('Could not update', 'Something went wrong', String((err && err.message) || err)); }
    });
    const lwatch = document.getElementById('lotWatch'); if (lwatch) lwatch.addEventListener('click', async () => {
      if (SB && !authUser){ openAuth(); return; }
      const on = !watchedIds.has(lot.id); if (on) watchedIds.add(lot.id); else watchedIds.delete(lot.id);
      lwatch.innerHTML = on ? 'Watching &check;' : 'Watch this lot';
      document.querySelectorAll('[data-watch="' + lot.id + '"]').forEach(b => { b.classList.toggle('on', on); b.innerHTML = watchStarSvg(on); });
      try { if (SB){ if (on) await SB.from('watchlist').insert({ user_id: authUser.id, lot_id: lot.id }); else await SB.from('watchlist').delete().eq('user_id', authUser.id).eq('lot_id', lot.id); } } catch (e) {}
    });
    (async function quoteLot(){
      const del = document.getElementById('lotDel'), dp = document.getElementById('delPanel'), sh = document.getElementById('lotShip');
      if (!del || !PAY_URL) return;
      let opts = [];
      try {
        const r = await fetch(PAY_URL.replace(/\/checkout$/, '') + '/shipping-quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lotId: lot.id, country: 'NL' }),
        });
        const d = await r.json();
        opts = (d && d.options) || [];
      } catch (e) { opts = []; }
      if (!opts.length){
        del.textContent = 'Delivery quoted for your address at checkout';
        return;
      }
      const cheapest = opts[0];
      del.innerHTML = '+ ' + e(SHIPPING.eur(cheapest.price)) + ' delivery within ' + e(SELLER_HOME) +
        ' &middot; <button type="button" class="auc-del-more" id="delMore" aria-expanded="false">more options</button>';
      if (sh) sh.textContent = opts.map(o => o.label + ' ' + SHIPPING.eur(o.price)).join(' \u00b7 ') + ' \u00b7 ' + phrase('Tracked');
      dp.innerHTML = opts.map(o =>
        '<div class="del-row"><span>' + e(o.label) + '</span><span>' + e(SHIPPING.eur(o.price)) + '</span></div>').join('') +
        '<div class="del-note">Prices to the Netherlands, quoted from the carriers. Another country is priced at checkout, once we know where it is going. Outside the EU a parcel may attract import VAT and duty on arrival, paid by the buyer.</div>';
      const dm = document.getElementById('delMore');
      if (dm) dm.addEventListener('click', () => {
        const open = dp.hidden;
        dp.hidden = !open;
        dm.setAttribute('aria-expanded', open ? 'true' : 'false');
        dm.textContent = open ? 'fewer options' : 'more options';
      });
    })();
    const ed = document.getElementById('lotEditLive');
    if (ed && SB) {
      SB.rpc('is_admin').then(r => { if (!r.error && r.data === true) ed.hidden = false; }).catch(() => {});
      // Absolute. Relative, this resolved against whatever path the lot page was
      // on: from /lot/<uuid> the browser read 'admin/' as /lot/admin/, so the
      // button landed on /lot/admin/#lot=<id> and the router looked up a lot with
      // the id "admin". It worked while the whole site was one URL, and path
      // routing broke it without touching this line. Same family as shipping.js.
      ed.addEventListener('click', () => { location.href = '/admin/#lot=' + encodeURIComponent(lot.id); });
    }
    // This button used to delete the row. It does not any more, and the reason
    // is a lot that was taken out of the shop to be re-photographed and came
    // back as nothing: the record gone, the five photographs orphaned in
    // storage, and the address in a paid advertisement pointing at a hole.
    //
    // Taking a lot out of the shop and destroying it are two different acts and
    // only one of them belongs on a product page. Withdrawing keeps the id, the
    // photographs, the bids and the text, keeps any accounting row pointing at
    // something real, and is undone by putting it back. Deleting is none of
    // those and there is no version of this button worth that risk.
    //
    // 'unsold' is the status the shop already treats as invisible: both shop
    // queries ask for live/preview or ended/sold, so this drops out of the
    // catalogue without teaching the rest of the site a new state.
    const rm = document.getElementById('lotRemove');
    if (rm) {
      rm.textContent = 'Take out of the shop';
      rm.addEventListener('click', async () => {
        if (!window.confirm('Take this lot out of the shop?\n\nIt leaves the catalogue and keeps its photos, text and bids. You can put it back from your account.')) return;
        rm.disabled = true;
        // .select() because RLS filtering every row away is a 204 and not an
        // error, and a button that silently did nothing is worse than one that
        // said why.
        const { data, error } = await SB.from('lots').update({ status: 'unsold' }).eq('id', lot.id).select('id');
        if (error){
          rm.disabled = false;
          openModal('Could not do that', 'Something went wrong', error.message);
          return;
        }
        if (!data || !data.length){
          rm.disabled = false;
          openModal('Could not do that', 'Nothing changed',
            'The database accepted the request and changed no rows, which means a row-level policy filtered it out. Take it out from the admin console instead.');
          return;
        }
        show('home'); injectDraftLots();
      });
    }
  }

  // ----- Fullscreen zoom + pan lightbox (mouse wheel, double-click, drag, pinch) -----

  // ----- Watermark on save -----
  // The image on screen stays clean, and the file that leaves the site carries
  // the mark. Supabase serves the photos with access-control-allow-origin: *, so
  // canvas can read the pixels and re-encode them; without that header this
  // would be impossible in the browser at all.
  //
  // Be clear about what this does and does not do. It covers the two routes
  // someone actually uses to take an image: right-click save, and dragging it to
  // the desktop. It does not stop a screenshot, and it does not stop anyone who
  // opens devtools and reads the URL, because at that point the bytes are
  // already on their machine. Making that impossible means never serving a clean
  // image at all, which is a different decision.
  const WM_TEXT = 'HAMMER & MOLD';
  const WM_SITE = 'hammerandmold.com';

  async function watermarkBlob(src){
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('could not read the image')); img.src = src; });
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, w, h);

    // Scaled to the image, so a 400px card and a 1600px original both look right
    const u = Math.max(w, h) / 100;

    // A repeated diagonal wordmark, faint enough to read the toy through it and
    // heavy enough that cropping it out costs you the picture.
    x.save();
    x.globalAlpha = 0.085;
    x.fillStyle = '#000';
    x.font = '700 ' + (u * 3.2).toFixed(1) + 'px Helvetica, Arial, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.translate(w / 2, h / 2);
    x.rotate(-Math.PI / 6);
    // Tight enough that cropping the subject out still crops the mark in.
    const step = u * 17, reach = Math.hypot(w, h);
    for (let ry = -reach; ry < reach; ry += step){
      for (let rx = -reach; rx < reach; rx += step * 1.55){
        x.fillText(WM_TEXT, rx, ry);
      }
    }
    x.restore();

    // And one legible line, so the file says where it came from
    const barH = u * 7;
    x.save();
    x.fillStyle = 'rgba(0,0,0,0.62)';
    x.fillRect(0, h - barH, w, barH);
    x.fillStyle = '#fff';
    x.textBaseline = 'middle';
    x.font = '700 ' + (u * 2.5).toFixed(1) + 'px Helvetica, Arial, sans-serif';
    x.textAlign = 'left';
    x.fillText(WM_TEXT, u * 2, h - barH / 2);
    x.font = '400 ' + (u * 2.1).toFixed(1) + 'px Helvetica, Arial, sans-serif';
    x.textAlign = 'right';
    x.fillText(WM_SITE, w - u * 2, h - barH / 2);
    x.restore();

    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.9));
  }

  const wmName = (src) => {
    const base = String(src || '').split('?')[0].split('/').pop().replace(/\.[a-z]+$/i, '').replace(/[^a-zA-Z0-9]+/g, '').slice(0, 24);
    return 'hammerandmold' + (base ? '-' + base : '') + '.jpg';
  };

  async function saveWatermarked(src){
    try {
      const blob = await watermarkBlob(src);
      if (!blob) throw new Error('could not encode the image');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = wmName(src);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      openModal('Could not prepare the file', 'Save did not complete.', String(e.message || e));
    }
  }

  // The two routes people actually use. Delegated, so it covers the lot page,
  // the fullscreen viewer and the shop cards without wiring each one.
  const WM_SEL = '.lot-main img, .zoom-img, .cardimg, .lot-thumbs img';
  document.addEventListener('contextmenu', e => {
    const img = e.target.closest && e.target.closest(WM_SEL);
    if (!img || !img.src) return;
    e.preventDefault();
    saveWatermarked(img.dataset.full || img.src);
  });
  document.addEventListener('dragstart', e => {
    const img = e.target.closest && e.target.closest(WM_SEL);
    if (img) e.preventDefault();
  });

  function openZoom(images, index){
    images = (images || []).filter(Boolean);
    if (!images.length) return;
    let i = index || 0;
    const ov = document.createElement('div');
    ov.className = 'zoom-ov';
    ov.innerHTML =
      '<button class="zoom-x" type="button" aria-label="Close">&#10005;</button>' +
      '<button class="zoom-dl" type="button" aria-label="Download this image">&#8659;</button>' +
      (images.length > 1 ? '<button class="zoom-nav prev" type="button" aria-label="Previous">&#8249;</button><button class="zoom-nav next" type="button" aria-label="Next">&#8250;</button>' : '') +
      '<div class="zoom-stage"><img class="zoom-img" alt="" draggable="false"></div>' +
      (images.length > 1 ? '<div class="zoom-count"></div>' : '') +
      '<div class="zoom-hint">' + phrase('Scroll or double-click to zoom &middot; drag to pan &middot; saved images are watermarked') + (images.length > 1 ? ' &middot; ' + phrase('&#8249; &#8250; to browse') : '') + '</div>';
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    const img = ov.querySelector('.zoom-img');
    const dl = ov.querySelector('.zoom-dl');
    if (dl) dl.addEventListener('click', ev => {
      ev.stopPropagation();
      saveWatermarked(images[i]);
    });
    const stage = ov.querySelector('.zoom-stage');
    const count = ov.querySelector('.zoom-count');
    let scale = 1, tx = 0, ty = 0;
    const apply = () => { img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; img.style.cursor = scale > 1 ? 'grab' : 'zoom-in'; };
    const clampPan = () => { const r = stage.getBoundingClientRect(); const mx = Math.max(0, (img.clientWidth * scale - r.width) / 2), my = Math.max(0, (img.clientHeight * scale - r.height) / 2); tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty)); };
    const zoomAt = (cx, cy, ns) => { const r = stage.getBoundingClientRect(); const ox = cx - r.left - r.width / 2, oy = cy - r.top - r.height / 2; const k = ns / scale; tx = (tx - ox) * k + ox; ty = (ty - oy) * k + oy; scale = ns; if (scale <= 1){ scale = 1; tx = 0; ty = 0; } clampPan(); apply(); };
    const load = () => { scale = 1; tx = 0; ty = 0; img.src = images[i]; if (count) count.textContent = (i + 1) + ' / ' + images.length; apply(); };
    load();
    stage.addEventListener('wheel', ev => { ev.preventDefault(); zoomAt(ev.clientX, ev.clientY, Math.max(1, Math.min(5, scale * (ev.deltaY < 0 ? 1.15 : 0.87)))); }, { passive: false });
    img.addEventListener('dblclick', ev => { ev.preventDefault(); zoomAt(ev.clientX, ev.clientY, scale > 1 ? 1 : 2.5); });
    img.addEventListener('click', ev => { if (scale === 1 && !moved) zoomAt(ev.clientX, ev.clientY, 2.5); });
    // pointer: drag-pan (1 finger) + pinch-zoom (2 fingers)
    const pts = new Map(); let dragging = false, moved = false, sx = 0, sy = 0, stx = 0, sty = 0, pinchBase = 0, pinchScale = 1;
    const two = () => [...pts.values()];
    stage.addEventListener('pointerdown', ev => {
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pts.size === 1 && scale > 1){ dragging = true; moved = false; sx = ev.clientX; sy = ev.clientY; stx = tx; sty = ty; img.style.cursor = 'grabbing'; try { stage.setPointerCapture(ev.pointerId); } catch (e) {} }
      else if (pts.size === 2){ dragging = false; const a = two(); pinchBase = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; pinchScale = scale; }
    });
    stage.addEventListener('pointermove', ev => {
      if (!pts.has(ev.pointerId)) return;
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pts.size === 2){ const a = two(); const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, Math.max(1, Math.min(5, pinchScale * (d / pinchBase)))); return; }
      if (dragging){ moved = true; tx = stx + (ev.clientX - sx); ty = sty + (ev.clientY - sy); clampPan(); apply(); }
    });
    const endPt = ev => { pts.delete(ev.pointerId); if (pts.size < 2 && !dragging) pinchBase = 0; if (pts.size === 0){ dragging = false; setTimeout(() => { moved = false; }, 0); } };
    stage.addEventListener('pointerup', endPt);
    stage.addEventListener('pointercancel', endPt);
    const go = d => { i = (i + d + images.length) % images.length; load(); };
    if (images.length > 1){ ov.querySelector('.prev').addEventListener('click', ev => { ev.stopPropagation(); go(-1); }); ov.querySelector('.next').addEventListener('click', ev => { ev.stopPropagation(); go(1); }); }
    ov.querySelector('.zoom-x').addEventListener('click', close);
    ov.addEventListener('click', ev => { if (ev.target === ov || ev.target === stage){ if (scale > 1){ scale = 1; tx = 0; ty = 0; apply(); } else close(); } });
    const key = ev => { if (ev.key === 'Escape') close(); else if (ev.key === 'ArrowLeft' && images.length > 1) go(-1); else if (ev.key === 'ArrowRight' && images.length > 1) go(1); };
    document.addEventListener('keydown', key);
    function close(){ document.removeEventListener('keydown', key); document.body.style.overflow = ''; ov.remove(); }
  }

  // ----- Account (email magic-link, preview) -----
  const authModal = document.getElementById('authModal');
  const escA = s => String(s == null ? '' : s).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
  function currentUser(){ if (authUser) return authUser.email || ''; try { return localStorage.getItem('pe_user') || ''; } catch (e) { return ''; } }
  function refreshAuthUI(){
    const u = currentUser();
    document.querySelectorAll('[data-auth-label]').forEach(el => { el.textContent = u ? ('· ' + u.split('@')[0]) : 'Sign in'; });
    // The banner's own call to action. Its click handler always knew whether
    // you were signed in; the label did not, so somebody who had just made an
    // account was still being told to reserve one.
    const ab = document.getElementById('authLinkB');
    if (ab) ab.innerHTML = u ? 'Your account &#8594;' : 'Reserve your account &#8594;';
  }
  function openAuth(){
    const u = currentUser(), b = document.getElementById('authBody');
    if (u){
      b.innerHTML = '<div class="ey">Account</div><h3>Signed in</h3><p>' + phrase('Signed in as {email}. Your bids, your watchlist and anything you sell live in your account, on every device you sign in on.', { email: escA(u) }) + '</p><div class="buy-row"><button class="btn accent" type="button" id="authOut">Sign out</button><button class="btn ghost" type="button" id="authX">Close</button></div>';
      b.querySelector('#authOut').addEventListener('click', async () => { if (SB) { await SB.auth.signOut(); authUser = null; } try { localStorage.removeItem('pe_user'); } catch (e) {} refreshAuthUI(); authModal.hidden = true; });
      b.querySelector('#authX').addEventListener('click', () => authModal.hidden = true);
    } else {
      b.innerHTML = '<div class="ey">Account</div><h3>Sign in with your email</h3><p>No password to invent or forget. We email you a link that signs you in, and it works once. Creating an account and signing in are the same step: if this email is new here, the account is made when you open the link.</p><div class="bidform"><label class="bidlabel" for="authEmail">Email</label><div class="bidinput-row"><input class="bidinput" id="authEmail" type="email" placeholder="you@email.com"><button class="btn accent" type="button" id="authGo">Send magic link</button></div><div class="acceptnote">By signing in you agree to our <a href="/terms/" data-nav="terms" id="authTermsL">Terms &amp; Conditions</a> and our <a href="/privacy/" data-nav="privacy">Privacy Policy</a>.</div><div class="bidhint" id="authHint"></div></div><button class="btn close" type="button" id="authX">Close</button>';
      const go = async () => {
        const v = b.querySelector('#authEmail').value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { b.querySelector('#authHint').textContent = 'Enter a valid email address.'; return; }
        if (SB) {
          const btn = b.querySelector('#authGo'); btn.disabled = true; b.querySelector('#authHint').textContent = 'Sending…';
          const { error } = await SB.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + location.pathname } });
          if (error) { b.querySelector('#authHint').textContent = error.message; btn.disabled = false; return; }
          b.innerHTML = '<div class="ey">Check your inbox</div><h3>Link sent</h3><p>To <b class="brk">' + escA(v) + '</b>. Open it on this device and it brings you back to this exact page, signed in. The link works once and expires after an hour. If it is not there in a minute, look in spam: it comes from hammerandmold.com.</p><button class="btn accent" type="button" id="authX">Done</button>';
          b.querySelector('#authX').addEventListener('click', () => authModal.hidden = true);
          return;
        }
        try { localStorage.setItem('pe_user', v); } catch (e) {}
        refreshAuthUI();
        b.innerHTML = '<div class="ey">Check your inbox</div><h3>You are signed in.</h3><p>On the live site a magic link would be emailed to ' + escA(v) + '. In this preview you are signed in instantly.</p><button class="btn accent" type="button" id="authX">Done</button>';
        b.querySelector('#authX').addEventListener('click', () => authModal.hidden = true);
      };
      b.querySelector('#authGo').addEventListener('click', go);
      b.querySelector('#authEmail').addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
      b.querySelector('#authTermsL').addEventListener('click', () => { authModal.hidden = true; });
      b.querySelector('#authX').addEventListener('click', () => authModal.hidden = true);
    }
    authModal.hidden = false;
  }
  if (authModal){
    authModal.addEventListener('click', e => { if (e.target === authModal) authModal.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') authModal.hidden = true; });
    document.querySelectorAll('#authLink, #authLinkM').forEach(el => el.addEventListener('click', e => { e.preventDefault(); if (currentUser()) renderAccount(); else openAuth(); }));
    const authB = document.getElementById('authLinkB'); if (authB) authB.addEventListener('click', e => { e.preventDefault(); if (currentUser()) renderAccount(); else openAuth(); });
    refreshAuthUI();
    if (SB) {
      SB.auth.getSession().then(async ({ data }) => { authUser = data.session ? data.session.user : null; refreshAuthUI(); await loadWatchlist(); injectDraftLots(); });
      // Fires on a restored session too, so the URL flag is what separates
      // "you just signed in" from "you were already signed in", and it is only
      // ever announced once.
      // Said once, on arrival, before anything else can take the screen.
      if (AUTH_URL_ERROR){
        const expired = /expired|invalid/i.test(AUTH_URL_ERROR.code + ' ' + AUTH_URL_ERROR.text);
        setTimeout(function(){
          openModal('Sign-in link', expired ? 'That link has been used up' : 'That link did not work',
            expired
              ? 'A sign-in link works once and lasts an hour, so an opened one or an old one stops working. Nothing is wrong with your account. Ask for a new link and open the newest email, not the one above it.'
              : ((AUTH_URL_ERROR.text || AUTH_URL_ERROR.code) + '. Ask for a new link and try again.'),
            { label: 'Send me a new link', go: function(){ openAuth(); } });
        }, 350);
      }
      let welcomed = false;
      SB.auth.onAuthStateChange(async (ev, session) => {
        authUser = session ? session.user : null;
        refreshAuthUI(); await loadWatchlist(); injectDraftLots();
        if (!ARRIVED_BY_LINK || welcomed || ev !== 'SIGNED_IN' || !session || !session.user) return;
        welcomed = true;
        // A brand new account is worth a different sentence from a returning
        // visitor. Two minutes is generous: the row is written when the link is
        // opened, so the gap is a round trip and not a session.
        const made = Date.parse(session.user.created_at || '') || 0;
        const isNew = made > 0 && (Date.now() - made) < 120000;
        const who = session.user.email || 'you';
        if (isNew){
          openModal('Welcome', 'Your account is ready',
            phrase('Signed in as {email}, and from here on that email is all you need: no password to invent and none to forget. You are back on the page you were reading. Bids, your watchlist and anything you list live in your account on every device you sign in on.', { email: who }),
            { label: 'See my account', go: function(){ routeTo('account'); } });
        } else {
          openModal('Signed in', 'Welcome back',
            phrase('Signed in as {email}. You are back on the page you asked the link from.', { email: who }));
        }
      });
    }
  }
  injectDraftLots();

  // ---- The path the visitor arrived on ----
  // A shared link, a bookmark or a refresh has to land where it points. Before
  // this every one of them opened the home page, which is also why sharing a lot
  // was pointless: the recipient never saw the toy.
  (function(){
    const landed = routeFromPath(true);
    if (!landed){
      // Unknown path, so treat it as the home page and correct the address bar
      // rather than leaving a URL that resolves to nothing.
      const home = LANG_PREFIX + '/';
      setMeta('home', home);
      if (location.pathname !== home) history.replaceState({ view: 'home' }, '', home);
      pageview(home);
    }
  })();

  (function(){
    const ss = document.getElementById('shopSearch');
    if (ss){
      ss.addEventListener('input', queueShopSearch);
      ss.addEventListener('search', applyShopSearch);          // the native clear button
      ss.addEventListener('keydown', e => { if (e.key === 'Enter'){ clearTimeout(shopSearchTimer); applyShopSearch(); } });
      const qp = new URLSearchParams(location.search).get('q');
      if (qp){ ss.value = qp; shopQuery = qp.trim(); }
    }
    const so = document.getElementById('shopSort');
    if (so) so.addEventListener('change', () => { shopSort = so.value; shopPage = 1; injectDraftLots(); });
  })();

  // The launch countdown lived here. It stopped running the day #promoCount was
  // taken out of the ribbon, and the only thing it still carried was a copy of
  // the old banner text that nothing could ever display. Removed rather than
  // left as a second place where that sentence lives.

  // ----- Return from Stripe checkout -----
  (function(){
    const p = new URLSearchParams(location.search);
    const paid = p.get('paid'), canceled = p.get('canceled'), lotParam = p.get('lot'), account = p.get('account');
    if (!paid && !canceled && !lotParam && !account) return;
    history.replaceState(null, '', location.pathname);
    if (account){
      // the webhook that updates plan/tokens lands a moment after the redirect, so re-render a few times
      if (typeof renderAccount === 'function'){ renderAccount(); [1500, 3500, 6000].forEach(t => setTimeout(() => renderAccount(), t)); }
      if (account && account !== 'cancel'){
        // Whatever package the checkout was for. The name comes from the table
        // so this line cannot welcome someone to a tier that no longer exists.
        const p = (PLAN_CACHE || []).find(x => x.key === account) || null;
        const nm = p ? p.name : (account.charAt(0).toUpperCase() + account.slice(1));
        openModal(phrase('You are on {plan}', { plan: nm }), 'Your package is active.',
          (p ? p.listings + ' listings a month and ' + (p.commission * 100).toFixed(0) + '% commission. ' : '') +
          'Your account updates in a moment. You can move up or down at any time, and billing is in your account.');
      }
      else if (account === 'tokens') openModal('Tokens added', 'Your top-up is complete.', '25 listing tokens are being added to your account, it updates in a moment.');
      return;
    }
    if (lotParam && !paid && !canceled){ if (typeof openLot === 'function') setTimeout(() => openLot(lotParam), 300); return; }
    if (paid){
      track('paid', null, paid);
      openModal('Payment received', 'Thank you.', 'Your payment went through. We will confirm the details and arrange shipping by email. In the sandbox no real money moved.');
      if (typeof openLot === 'function') setTimeout(() => openLot(paid), 400);
    } else {
      openModal('Checkout cancelled', 'No payment was taken.', 'You closed the checkout before paying. You can pay again from the lot page whenever you are ready.');
    }
  })();

  // ----- Mobile menu -----
  (function(){
    const mast = document.querySelector('header.mast');
    const navToggle = document.getElementById('navToggle');
    if (!mast || !navToggle) return;
    navToggle.addEventListener('click', () => {
      const open = mast.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.mobile-panel a').forEach(a => a.addEventListener('click', () => {
      mast.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false');
    }));
  })();

  document.getElementById('themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';  // default (no attr) = light
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
    document.querySelectorAll('.vitrine canvas.stars').forEach(c => c.remove());
    document.querySelectorAll('.film canvas.stars').forEach(f => f.dataset.done = '');
    requestAnimationFrame(paintStars);
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.vitrine canvas.stars').forEach(c => c.remove());
    requestAnimationFrame(paintStars);
  });
  paintStars();

;
if ('serviceWorker' in navigator) { window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}); }); }