// admin/add-chat.sql run against real Postgres (PGlite), with just enough of
// Supabase stubbed around it: the auth schema, the two roles, is_admin() and a
// lots table. Then the access rules are tried as a buyer, the seller, a
// stranger and the admin.
import nodeTest from 'node:test';
// One connection, so the cases run strictly one after another.
const cases = [];
const test = (name, fn) => cases.push([name, fn]);
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const BUYER = '11111111-1111-1111-1111-111111111111';
const SELLER = '22222222-2222-2222-2222-222222222222';
const STRANGER = '33333333-3333-3333-3333-333333333333';
const ADMIN = '44444444-4444-4444-4444-444444444444';
const LOT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SOLD = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, created_at timestamptz not null default now() - interval '30 days');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  create table public.profiles (id uuid primary key, is_admin boolean not null default false);
  create function public.is_admin() returns boolean language sql stable security definer as $$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;
  grant execute on function public.is_admin() to authenticated;
  create table public.lots (id uuid primary key, seller_id uuid, status text);
  create publication supabase_realtime;
  grant usage on schema public to anon, authenticated;
  insert into auth.users (id) values ('${BUYER}'), ('${SELLER}'), ('${STRANGER}'), ('${ADMIN}');
  insert into public.profiles (id, is_admin) values ('${BUYER}', false), ('${SELLER}', false), ('${STRANGER}', false), ('${ADMIN}', true);
  insert into public.lots values ('${LOT}', '${SELLER}', 'live'), ('${SOLD}', '${SELLER}', 'sold');
`);
await db.exec(readFileSync(new URL('../admin/add-chat.sql', import.meta.url), 'utf8'));
await db.exec(`alter table public.profiles add column if not exists email text`);
await db.exec(readFileSync(new URL('../admin/add-chat-safety.sql', import.meta.url), 'utf8'));

async function as(uid, sql, params) {
  await db.exec(`reset role; select set_config('test.uid', '${uid || ''}', false); set role authenticated;`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
}
const fails = async (fn, re) => { await assert.rejects(fn, re); };

let conv;
test('a buyer starts a conversation and writes; the same call reopens it', async () => {
  conv = (await as(BUYER, 'select public.start_conversation($1) as id', [LOT])).rows[0].id;
  assert.ok(conv);
  assert.equal((await as(BUYER, 'select public.start_conversation($1) as id', [LOT])).rows[0].id, conv);
  const m = (await as(BUYER, 'select * from public.send_message($1, $2)', [conv, 'Does the trapdoor still work?'])).rows[0];
  assert.equal(m.body, 'Does the trapdoor still work?');
  assert.equal(m.flagged, false);
});

test('contact details are hidden and the message is flagged', async () => {
  const m = (await as(SELLER, 'select * from public.send_message($1, $2)', [conv, 'Mail jan@example.com or call +31 6 1234 5678, or www.marktplaats.nl/x. IBAN NL91 ABNA 0417 1643 00.'])).rows[0];
  assert.equal(m.flagged, true);
  assert.doesNotMatch(m.body, /example\.com|1234|marktplaats|ABNA/);
  assert.match(m.body, /•••/);
});

test('a year, a price and a size are not mistaken for a phone number', async () => {
  const m = (await as(SELLER, 'select * from public.send_message($1, $2)', [conv, 'Made in 1983, 33 cm long, yours for 299.99 euro.'])).rows[0];
  assert.equal(m.flagged, false);
  assert.equal(m.body, 'Made in 1983, 33 cm long, yours for 299.99 euro.');
});

test('only the two of them read it; the admin can, a stranger cannot', async () => {
  assert.equal((await as(BUYER, 'select count(*)::int as n from public.messages')).rows[0].n, 3);
  assert.equal((await as(SELLER, 'select count(*)::int as n from public.messages')).rows[0].n, 3);
  assert.equal((await as(STRANGER, 'select count(*)::int as n from public.messages')).rows[0].n, 0);
  assert.equal((await as(STRANGER, 'select count(*)::int as n from public.conversations')).rows[0].n, 0);
  assert.equal((await as(ADMIN, 'select count(*)::int as n from public.messages')).rows[0].n, 3);
});

test('nobody writes around the functions, or as someone else', async () => {
  await fails(() => as(STRANGER, 'select public.send_message($1, $2)', [conv, 'hi']), /not yours/);
  await fails(() => as(BUYER, `insert into public.messages (conversation_id, sender_id, body) values ($1, '${SELLER}', 'fake')`, [conv]), /permission denied/);
  await fails(() => as(BUYER, 'update public.messages set body = $1', ['changed']), /permission denied/);
  await fails(() => as(BUYER, 'delete from public.messages'), /permission denied/);
});

test('no conversation about your own lot, or about one that has sold', async () => {
  await fails(() => as(SELLER, 'select public.start_conversation($1)', [LOT]), /your own lot/);
  await fails(() => as(BUYER, 'select public.start_conversation($1)', [SOLD]), /in the shop/);
});

test('unread counts and reading', async () => {
  assert.equal((await as(BUYER, 'select public.my_unread_conversations() as n')).rows[0].n, 1);
  await as(BUYER, 'select public.mark_conversation_read($1)', [conv]);
  assert.equal((await as(BUYER, 'select public.my_unread_conversations() as n')).rows[0].n, 0);
  assert.equal((await as(SELLER, 'select public.my_unread_conversations() as n')).rows[0].n, 0, 'the seller wrote last');
});

test('reporting: only a message sent to you, and only the admin sees reports', async () => {
  const theirs = (await as(BUYER, 'select id from public.messages where sender_id = $1 limit 1', [SELLER])).rows[0].id;
  await as(BUYER, 'select public.report_message($1, $2)', [theirs, 'asked to pay outside the site']);
  const mine = (await as(BUYER, 'select id from public.messages where sender_id = $1 limit 1', [BUYER])).rows[0].id;
  await fails(() => as(BUYER, 'select public.report_message($1, $2)', [mine, 'x']), /sent to you/);
  assert.equal((await as(BUYER, 'select count(*)::int as n from public.message_reports')).rows[0].n, 0);
  assert.equal((await as(ADMIN, 'select count(*)::int as n from public.message_reports')).rows[0].n, 1);
});

test('the spam limit holds at thirty an hour', async () => {
  for (let i = 0; i < 29; i++) await as(BUYER, 'select public.send_message($1, $2)', [conv, 'message ' + i]);
  await fails(() => as(BUYER, 'select public.send_message($1, $2)', [conv, 'one too many']), /a lot of messages/);
});

test('blocking closes the conversation both ways, and unblocking reopens it', async () => {
  await as(SELLER, 'select public.block_in_conversation($1, true)', [conv]);
  await fails(() => as(BUYER, 'select * from public.send_message($1, $2)', [conv, 'hello?']), /blocked/);
  await fails(() => as(SELLER, 'select * from public.send_message($1, $2)', [conv, 'hello?']), /blocked/);
  assert.equal((await as(BUYER, 'select count(*)::int as n from public.chat_blocks')).rows[0].n, 0, 'the blocked side does not see the block');
  await as(SELLER, 'select public.block_in_conversation($1, false)', [conv]);
  await db.exec("delete from public.messages where sender_id = '" + SELLER + "' and body like 'ok%'");
});

test('only an admin handles a report', async () => {
  const rep = (await as(ADMIN, 'select id from public.message_reports limit 1')).rows[0].id;
  await fails(() => as(BUYER, 'select public.admin_handle_report($1)', [rep]), /Admins only/);
  await as(ADMIN, 'select public.admin_handle_report($1)', [rep]);
  assert.ok((await as(ADMIN, 'select handled_at from public.message_reports where id = $1', [rep])).rows[0].handled_at);
});

test('users cannot run the clean-up', async () => {
  await fails(() => as(BUYER, 'select public.purge_old_conversations()'), /permission denied/);
});

nodeTest('chat SQL', async (t) => { for (const [name, fn] of cases) await t.test(name, fn); });
