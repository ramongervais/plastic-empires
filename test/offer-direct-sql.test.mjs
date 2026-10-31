// admin/offer-direct.sql against real Postgres (PGlite): an offer on a direct
// sale goes straight to the seller, one at a time, and a declined or lapsed
// offer puts the piece back on sale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const BUYER = '11111111-1111-1111-1111-111111111111';
const SELLER = '22222222-2222-2222-2222-222222222222';
const OTHER = '33333333-3333-3333-3333-333333333333';
const FIX = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const AUC = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

test('direct offers', async (t) => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function public.is_admin() returns boolean language sql stable as $$ select false $$;
    create table public.lots (id uuid primary key, toy text, seller_id uuid, status text, sale_type text, buy_now numeric, starting_bid numeric,
      reserve numeric, down_pct numeric default 0, auction_days int default 7, ends_at timestamptz, decide_by timestamptz, closed_at timestamptz);
    create table public.bids (id bigserial primary key, lot_id uuid references public.lots(id), bidder_id uuid, amount numeric, created_at timestamptz default now());
    insert into public.lots (id, seller_id, status, sale_type, buy_now, starting_bid, down_pct) values
      ('${FIX}', '${SELLER}', 'live', 'fixed', 30, 28, 5),
      ('${AUC}', '${SELLER}', 'live', 'auction', null, 20, 0);
  `);
  await db.exec(readFileSync(new URL('../admin/offer-direct.sql', import.meta.url), 'utf8'));
  await db.exec(`
    create trigger bids_check before insert on public.bids for each row execute function public.check_bid();
    create trigger bids_clock after insert on public.bids for each row execute function public.start_auction_clock();
  `);
  const lot = async (id) => (await db.query('select * from public.lots where id = $1', [id])).rows[0];
  const bid = (id, who, amt) => db.query('insert into public.bids (lot_id, bidder_id, amount) values ($1, $2, $3)', [id, who, amt]);
  const as = async (uid, sql, p) => { await db.exec(`select set_config('test.uid', '${uid}', false)`); return db.query(sql, p); };

  await t.test('an offer goes to the seller at once, with 48 hours', async () => {
    await bid(FIX, BUYER, 28.5);
    const l = await lot(FIX);
    assert.equal(l.status, 'offer');
    assert.equal(l.ends_at, null);
    const h = (new Date(l.decide_by) - Date.now()) / 3600e3;
    assert.ok(h > 47.9 && h <= 48, 'decide_by is 48 hours out: ' + h);
  });
  await t.test('one offer at a time', async () => {
    await assert.rejects(() => bid(FIX, OTHER, 29), /Another offer is with the seller/);
  });
  await t.test('declined: back on sale, the bids gone, the offer kept in history', async () => {
    assert.equal((await as(SELLER, 'select public.decide_offer($1, false) as r', [FIX])).rows[0].r, 'declined');
    const l = await lot(FIX);
    assert.equal(l.status, 'live'); assert.equal(l.decide_by, null);
    assert.equal((await db.query('select count(*)::int n from public.bids')).rows[0].n, 0);
    const hist = (await db.query('select bidder_id, amount::float a, outcome from public.offer_history')).rows;
    assert.deepEqual(hist, [{ bidder_id: BUYER, a: 28.5, outcome: 'declined' }]);
  });
  await t.test('the next buyer may offer lower than the declined one', async () => {
    await bid(FIX, OTHER, 28.6);
    assert.equal((await lot(FIX)).status, 'offer');
  });
  await t.test('lapsed: the same, through the worker', async () => {
    await db.query("select public.reopen_direct_offer($1, 'lapsed')", [FIX]);
    assert.equal((await lot(FIX)).status, 'live');
    assert.equal((await db.query("select count(*)::int n from public.offer_history where outcome = 'lapsed'")).rows[0].n, 1);
  });
  await t.test('accepted: waiting for payment, at the offer', async () => {
    await bid(FIX, BUYER, 29);
    await as(SELLER, 'select public.decide_offer($1, true)', [FIX]);
    assert.equal((await lot(FIX)).status, 'ended');
    assert.equal((await db.query('select max(amount)::float m from public.bids where lot_id = $1', [FIX])).rows[0].m, 29);
  });
  await t.test('only the seller decides', async () => {
    await db.query("update public.lots set status = 'offer' where id = $1", [FIX]);
    await assert.rejects(() => as(OTHER, 'select public.decide_offer($1, false)', [FIX]), /Only the seller/);
  });
  await t.test('an auction still starts its clock and stays live', async () => {
    await bid(AUC, BUYER, 20);
    const l = await lot(AUC);
    assert.equal(l.status, 'live'); assert.ok(l.ends_at);
  });
});
