# Hammer & Mold - QA checklist

Pre-launch test pass for hammerandmold.com. Public auctions open **1 September 2026**.

**How to use it.** Work top to bottom, tick as you go, and write the actual result next to
anything that fails rather than just unticking it. Each step states what *should* happen, so a
failure is a factual difference, not a judgement call. Sections marked **[needs 2 accounts]**
cannot be tested while you are the only registered user.

Test on: Safari and Chrome on desktop, Safari on iPhone, and one Android browser. Repeat the
Cross-cutting section in **both light and dark theme**, using the toggle in the masthead.

Legend: `[ ]` untested &middot; `[x]` pass &middot; `[!]` fail, note the result

---

## 0. Known open issues

Confirm these are still true, or fixed, before shipping. All were found during development and
none are regressions.

- [ ] **Hero photo in dark theme** shows as a white plate. The JPEG carries a white background;
      needs a transparent PNG exported from the PSD. Cosmetic, light is the default theme.
- [ ] **Mobile clipping at 420px.** The promo ribbon, search field, sort select and hero lede run
      past the right edge. `overflow-x:hidden` masks it so there is no scrollbar, but content is
      cut off. Pre-existing, present before the hero work.
- [ ] **Empty main grid when every active lot is promoted.** With one active lot in a featured
      placement, the "For sale" grid below the strip is empty, because a promoted lot is lifted
      out of the grid to avoid appearing twice. Resolves itself once there are several lots.
- [ ] **Footer "Featured toy" link** under Visit still opens the Millennium Falcon artifact page.
      Not broken, but the hero is no longer a featured toy, so the label may mislead.
- [ ] **`is_admin` guard trigger is untested.** `profiles_guard_is_admin` exists but has never
      fired, because proving it blocks self-promotion needs a non-admin signed-in account.
      **[needs 2 accounts]**
- [ ] **`anon` holds INSERT and DELETE grants on `profiles`.** RLS blocks both, verified, but the
      grants are pointless. Check how a profile row is created at signup before revoking, since
      revoking the wrong one breaks registration.

---

## 1. Shop and lots

- [ ] Homepage loads with no console errors.
- [ ] "For sale" lists every lot that is `live` or `preview`, plus anything closed in the last
      24 hours. Nothing older.
- [ ] Lot count under the search field matches the number of cards on screen.
- [ ] **Search** by toy, maker and line each narrow the grid. The count changes to
      "N of M lots". A query matching nothing shows the empty message.
- [ ] Clearing the search restores every card and the count returns to "M lots".
- [ ] **Sort** all four ways and confirm the order actually changes:
  - [ ] Newest (most recently created first)
  - [ ] Ending soon (nearest `ends_at` first)
  - [ ] Price low to high
  - [ ] Price high to low
- [ ] A `preview` lot shows the `PREVIEW` badge and an "Opens 1 September" button instead of a
      bid button.
- [ ] A `live` auction lot shows the bid count and a "Place a bid" button.
- [ ] A fixed-price lot shows "Direct sale" and a "Buy now" button with the price.
- [ ] A closed lot shows `SOLD` or `ENDED` and "view result", and is visually dimmed.
- [ ] Clicking a card image or its title opens the lot page. Clicking the watch star does **not**.
- [ ] Lot page shows the correct toy, maker, line, year, condition, completeness and notes.
- [ ] Lot page shows the seller, and that seller name links through to their public page.

## 2. Bidding

- [ ] Placing a bid below the current high bid is rejected with a clear message.
- [ ] A valid bid is accepted, the amount updates, and the bid count increments.
- [ ] The bid history lists bids newest first with the right amounts.
- [ ] A **hidden reserve** that is not yet met shows the not-met note. It flips to met, with a
      tick, once a bid clears it.
- [ ] **Anti-snipe:** a bid inside the final minutes extends the auction and the card shows
      `EXTENDED +2 MIN`.
- [ ] A lot past `ends_at` stops accepting bids even if the page was left open.
- [ ] Bidding while signed out prompts sign-in rather than failing silently. **[needs 2 accounts]**
- [ ] Outbidding another user notifies them if they have that preference on. **[needs 2 accounts]**

## 3. Watchlist

- [ ] The star on a card toggles filled and hollow, and survives a page reload.
- [ ] A watched lot appears in the watchlist on the account page.
- [ ] The star does not appear on closed lots.
- [ ] Ending-soon email arrives for a watched lot, if that preference is on.

## 4. Featured ads, public side

- [ ] With no active placement, **no strip appears at all** and the shop looks unchanged.
- [ ] With one or more, the strip shows above the grid, headed "Featured lots" with
      "Promoted placement, paid for by the seller" on the right.
- [ ] A promoted lot appears in the strip and **not** in the main grid below.
- [ ] Placements appear in rank order, lowest rank first.
- [ ] Reordering rank in the console changes the order on the shop after a reload.
- [ ] With more than 8 active placements, only 8 show in the strip. The rest fall into the
      normal grid without a slot.
- [ ] Searching for a promoted lot keeps the strip visible and shows only that card.
- [ ] Searching for something that matches no promoted lot **hides the whole strip**.
- [ ] The lot count includes promoted lots.
- [ ] A placement whose `ends_at` has passed disappears from the strip.
- [ ] A placement marked refunded disappears immediately.
- [ ] A placement on a lot that is sold or ended does not take a slot.

## 5. Sell flow

- [ ] The Sell page explains the steps and states the maker's-stamp photo requirement.
- [ ] Uploading photos produces square previews.
- [ ] AI curation returns a toy name, maker, line, year, condition grade, variants and a
      proposed starting bid.
- [ ] **Auto-moderation rejects a non-toy or prohibited item** at curation, with a reason.
- [ ] Choosing **Auction** versus **Direct sale** (fixed price) changes the fields shown.
- [ ] The token counter shows the current balance and decrements by one per listing.
- [ ] At zero tokens, listing is blocked with a prompt to upgrade or buy a pack.
- [ ] Tier copy is correct: Starter free, **3 tokens/month, 15% commission**; Premium
      **50 tokens/month with rollover, 10% commission**, featured placement, early-bird pricing
      for the first six months.
- [ ] The token balance refreshes after an upgrade without a manual reload.

## 6. Accounts and auth

- [ ] Sign-in sends a magic link and the link returns you to the page you started on.
- [ ] The masthead shows your handle once signed in, and "Sign in" when not.
- [ ] Sign out clears the session and the UI returns to signed-out state.
- [ ] **Account page loads your plan and token balance.** These were failing silently before the
      `seller_public` fix, so check specifically.
- [ ] Notification toggles (outbid, won, sold, ending soon) save and survive a reload.
- [ ] "Your lots" and "Your bids" list the right items.
- [ ] A won lot offers the buyer flow; a sold lot offers the seller "Mark as shipped" with an
      optional tracking number.
- [ ] Leaving a review after a purchase works, and stars record correctly. **[needs 2 accounts]**

## 7. Public seller pages

- [ ] A seller page shows display name, type, location, bio and joined date.
- [ ] It does **not** show plan, token balance or notification settings. This is the point of the
      `seller_public` view, so treat any leak as a blocker.
- [ ] The seller's lots list correctly.
- [ ] Reviews show with the right star counts.
- [ ] The page works **while signed out**. It was broken before, so test signed out specifically.

## 8. Molder pages

Each should load with its own hero, dek, factbar, story, lines grid and commercial thumbnails.
Every commercial link should open the right YouTube video in a new tab.

- [ ] Kenner (from both the Star Wars and The Real Ghostbusters cards)
- [ ] Kaiju (Marusan, Bullmark, Popy)
- [ ] Playmates / TMNT
- [ ] LJN / E.T.
- [ ] Galoob / The A-Team
- [ ] Thinkway / Toy Story
- [ ] The Molders filter chips narrow the grid to each maker, and "All" restores it.
- [ ] Sorting the lines by Era and A-Z both reorder correctly.
- [ ] Breadcrumbs return you home.

## 9. Admin console

At **/admin/**, signed in as an admin.

- [ ] Signed out, the console shows the sign-in gate and no data.
- [ ] Signed in as a **non-admin**, it shows "No access" and no data. **[needs 2 accounts]**
- [ ] Signed in as an admin, the three tabs load and switch cleanly.
- [ ] `noindex, nofollow` is present, and `robots.txt` disallows `/admin/` in every group.

### Featured ads

- [ ] Tiles are right: live count against 8 slots, scheduled, revenue paid, outstanding with the
      open invoice count.
- [ ] Revenue paid sums only `paid` placements. Refunded ones are excluded.
- [ ] The lot picker lists non-draft lots with maker and year.
- [ ] Creating a placement with **Starts blank** begins immediately.
- [ ] Creating with **Ends blank** is open ended and the table says so.
- [ ] An end date before the start date is rejected.
- [ ] Creating without choosing a lot is rejected.
- [ ] State badges are right: `live`, `scheduled` for a future start, `expired` past the end.
- [ ] Rank arrows move a row, are disabled at the ends, and the new order reaches the shop.
- [ ] Mark paid, mark unpaid and refund each update the badge and the tiles.
- [ ] Refunding sets state to expired and pulls it from the shop.
- [ ] Delete asks for confirmation and warns that the payment record goes too.
- [ ] Filters (All, Live, Scheduled, Unpaid, Expired) each show the right subset.
- [ ] The note field is visible in the console and **never** on the public site.

### Sellers

- [ ] Lists every profile with type, location, plan, tokens, lot count and joined date.
- [ ] Tiles are right: total profiles, Premium, Starter, tokens held across all accounts.
- [ ] Lot counts match the number of non-draft lots per seller.
- [ ] "Make Premium" and "Downgrade" both take effect and survive a reload.
- [ ] "Tokens" sets a balance. A negative or non-numeric entry is rejected.

### Site settings

- [ ] Adding a key with a JSON value stores it and shows it in the table.
- [ ] A plain-text value is accepted and stored as a string.
- [ ] An invalid key (spaces or symbols) is rejected.
- [ ] Saving an existing key overwrites it rather than erroring.
- [ ] Edit loads the row into the form; saving overwrites.
- [ ] Delete asks for confirmation and removes the row.

## 10. Security

Run these from a terminal, unauthenticated. Substitute your anon key. Each **must** fail or
return nothing. Any success is a blocker.

```bash
URL=https://yazoeshmplhmxefnovjy.supabase.co
KEY=<anon key from index.html>

# Revenue data must not be readable. Expect []
curl -s "$URL/rest/v1/featured_placements?select=*" -H "apikey: $KEY"

# The public view must not carry money. Expect 42703
curl -s "$URL/rest/v1/featured_active?select=amount_eur,status" -H "apikey: $KEY"

# Private profile columns must not be reachable. Expect 42703
curl -s "$URL/rest/v1/seller_public?select=plan,tokens,is_admin" -H "apikey: $KEY"

# The profiles table must be closed to anon. Expect []
curl -s "$URL/rest/v1/profiles?select=id,plan,tokens" -H "apikey: $KEY"

# Nobody may grant themselves admin. Expect a permission or RLS error
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.<your-uuid>" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"is_admin":true}'

# Nor write placements or settings. Expect RLS violations
curl -s -X POST "$URL/rest/v1/featured_placements" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"lot_id":"00000000-0000-0000-0000-000000000000","amount_eur":999}'
curl -s -X POST "$URL/rest/v1/settings" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"key":"probe","value":true}'

# Admin functions must refuse. Expect "not authorised" and []
curl -s -X POST "$URL/rest/v1/rpc/admin_set_plan" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"target":"00000000-0000-0000-0000-000000000000","new_plan":"premium"}'
curl -s -X POST "$URL/rest/v1/rpc/admin_list_sellers" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{}'
```

- [ ] All of the above behave as stated.
- [ ] A signed-in non-admin cannot set `is_admin` on their own row. The
      `profiles_guard_is_admin` trigger should raise. **[needs 2 accounts]**
- [ ] A signed-in non-admin cannot read another user's profile row.
      **[needs 2 accounts]**

> Never paste the `service_role` key into anything client side. Only the anon key belongs in
> `index.html`.

## 11. Cross-cutting

Repeat in **light and dark** theme.

- [ ] Theme toggle switches immediately and the choice survives a reload.
- [ ] No element becomes unreadable in either theme, in particular photographs, badges and
      the promoted strip.
- [ ] Responsive: **1920, 1440, 1180, 900, 768, 420 and 375px wide**. At each, no horizontal
      scrollbar and nothing cut off at the right edge.
- [ ] The shop grid steps 4 columns, then 2, then 1 as the viewport narrows. The featured strip
      follows the same steps.
- [ ] Mobile navigation opens, links work, and it closes again.
- [ ] Every image has meaningful alt text.
- [ ] Keyboard only: reach and activate the search field, sort, a lot card, the bid button and
      the theme toggle. Focus is always visible.
- [ ] The countdown ribbon shows the right time remaining to 1 September 2026 and does not
      go negative afterwards.
- [ ] Terms and About load, and the Terms cover the token model, moderation, reviews and
      shipping.

## 12. Performance, PWA and SEO

- [ ] The service worker registers and is **network-first**, so a redeploy is picked up on
      reload without a hard refresh.
- [ ] Installing to the home screen uses the right name and icon.
- [ ] Offline shows a usable fallback rather than a browser error.
- [ ] Hero photograph is under roughly 400KB and does not delay first paint.
- [ ] `<title>`, meta description, canonical, Open Graph and the JSON-LD graph all name
      Hammer & Mold and `hammerandmold.com`. No "Plastic Empires" anywhere.
- [ ] `sitemap.xml` and `llms.txt` resolve and list the right molders.
- [ ] Lighthouse on the homepage: note Performance, Accessibility and Best Practices.

---

## Sign-off

| Area | Tested by | Date | Result |
|---|---|---|---|
| Shop and lots | | | |
| Bidding | | | |
| Featured ads | | | |
| Sell flow | | | |
| Accounts and auth | | | |
| Admin console | | | |
| Security | | | |
| Cross-cutting | | | |

**Blockers before 1 September:**

1.
2.
3.
