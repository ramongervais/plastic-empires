// The English must come out of phrase() exactly as it did when it was glued
// together by hand. A lost or doubled space is the easiest thing to introduce
// here and the hardest to notice.
import test from 'node:test';
import assert from 'node:assert/strict';
global.window = {};
function phrase(s, vals){
  const D = window.__NL__;
  if (D && D[s] !== undefined) s = D[s];
  return s.replace(/\{(\w+)\}/g, (_, k) => (vals && vals[k] != null ? vals[k] : ''));
}
test('lot listed reads as one sentence, as it did before', () => {
  const urls = { length: 6 }, pre = false, wasToy = 'Rancor';
  const title = phrase(pre ? '{lot} is ready for launch.' : '{lot} is live in the shop.', { lot: wasToy });
  const body = (urls.length ? phrase(urls.length === 1 ? 'Saved with {n} photo.' : 'Saved with {n} photos.', { n: urls.length }) : phrase('Saved.')) + ' ' +
    phrase(pre ? 'It shows in Preview now and opens for bidding when you take it live.' : 'It now appears in the Shop.') + ' ' +
    phrase('The page is cleared, so you can start the next one.');
  assert.equal(title, 'Rancor is live in the shop.');
  assert.equal(body, 'Saved with 6 photos. It now appears in the Shop. The page is cleared, so you can start the next one.');
});
test('the bid result reads as one sentence', () => {
  const body = phrase('{amount} on {lot}.', { amount: '€ 45', lot: 'Rancor' }) + ' ' +
    phrase('Your bid is recorded.') + ' ' + phrase('The auction was extended by 2 minutes.');
  assert.equal(body, '€ 45 on Rancor. Your bid is recorded. The auction was extended by 2 minutes.');
});
test('the checkout line keeps its single space', () => {
  const body = phrase('This will take you to a secure Stripe checkout to pay {amount} for the lot you won.', { amount: '€ 90' }) +
    ' ' + phrase('Payments are being wired up and go live shortly.');
  assert.equal(body, 'This will take you to a secure Stripe checkout to pay € 90 for the lot you won. Payments are being wired up and go live shortly.');
});
test('the photo counter keeps its middots', () => {
  const files = { length: 6 }, fresh = { length: 2 };
  const out = phrase(files.length === 1 ? '{n} photo' : '{n} photos', { n: files.length })
    + ' · ' + phrase('first one is the cover buyers see')
    + (fresh.length ? ' · ' + phrase('{size} to upload', { size: '120 kB' }) + ' ' + phrase('(resized from {size})', { size: '300 kB' }) : '');
  assert.equal(out, '6 photos · first one is the cover buyers see · 120 kB to upload (resized from 300 kB)');
});
test('singular and plural both land', () => {
  assert.equal(phrase('{n} listing left', { n: 1 }), '1 listing left');
  assert.equal(phrase('{n} listings left', { n: 7 }), '7 listings left');
});
test('the Dutch swaps in without touching the glue', () => {
  window.__NL__ = { '{amount} on {lot}.': '{amount} op {lot}.', 'Your bid is recorded.': 'Je bod is vastgelegd.' };
  const body = phrase('{amount} on {lot}.', { amount: '€ 45', lot: 'Rancor' }) + ' ' + phrase('Your bid is recorded.');
  assert.equal(body, '€ 45 op Rancor. Je bod is vastgelegd.');
  window.__NL__ = undefined;
});
