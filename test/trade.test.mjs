// The bid block's ranges, taken straight out of src/index.html so the test
// runs the code the site ships, not a copy of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
const grab = re => { const m = src.match(re); if (!m) throw new Error('not found: ' + re); return m[0]; };
const code = grab(/const bidStep = [^\n]+\n/) + grab(/const r2 = [^\n]+\n/) +
  grab(/function tradeRange\(t\)\{[\s\S]*?\n  \}\n/);
const tradeRange = new Function(code + '; return tradeRange;')();
// The slider's steps, as openBid builds them.
const steps = (dn, ceil) => { const out = []; for (let k = Math.round(dn.pct); k >= 1; k--) { const amt = Math.round(dn.ref * (1 - k / 100) * 100) / 100; if (amt >= dn.min && amt < ceil) out.push([k, amt]); } return out; };

test('Granny Gross: start 24,99, 5% down, no bids', () => {
  const R = tradeRange({ buyNow: 0, downPct: 5, floor: 23.74, start: 24.99, top: null });
  assert.equal(R.down.min, 23.74);
  assert.equal(R.up.min, 24.99);
  assert.deepEqual(steps(R.down, R.up.min).map(s => s[1]), [23.74, 23.99, 24.24, 24.49, 24.74]);
});

test('Prime Evil: start 120, 5% down, slider 114 to 118,80', () => {
  const R = tradeRange({ buyNow: 0, downPct: 5, floor: 114, start: 120, top: null });
  assert.equal(R.down.min, 114);
  assert.equal(R.up.min, 120);
  assert.deepEqual(steps(R.down, R.up.min), [[5, 114], [4, 115.2], [3, 116.4], [2, 117.6], [1, 118.8]]);
});

test('After a bid of 116: the slider only offers steps above it', () => {
  const R = tradeRange({ buyNow: 0, downPct: 5, floor: 114, start: 120, top: 116 });
  assert.equal(R.down.min, 117);
  assert.deepEqual(steps(R.down, R.up.min), [[2, 117.6], [1, 118.8]]);
});

test('Once a bid reaches the start, Bid down disappears', () => {
  const R = tradeRange({ buyNow: 0, downPct: 5, floor: 114, start: 120, top: 120 });
  assert.equal(R.down, null);
  assert.equal(R.up.min, 121);
});

test('Buy now with no starting bid: only Buy now, no €0 block', () => {
  const R = tradeRange({ buyNow: 24.99, downPct: 0, start: 0, top: null });
  assert.deepEqual(R, { buyNow: 24.99 });
});

test('Bid down switched on but the floor not loaded: ordinary bidding, nothing breaks', () => {
  const R = tradeRange({ buyNow: 0, downPct: 5, start: 120, top: null });
  assert.equal(R.down, undefined);
  assert.equal(R.up.min, 120);
});

test('Buy now lot with Bid down: from 5% under Buy now up to a cent below it', () => {
  const R = tradeRange({ buyNow: 30, downPct: 5, start: 0, top: null });
  assert.equal(R.down.min, 28.5);
  assert.equal(R.up.max, 29.99);
});
