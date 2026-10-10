import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
// phrase() as it now stands in index.html, lifted verbatim.
function mk(D){ global.window={__NL__:D};
  return function phrase(s, vals){
    const d = window.__NL__;
    if (d && d[s] !== undefined) s = d[s];
    return s.replace(/\{(\w+)\}/g, (_, k) => (vals && vals[k] != null ? vals[k] : ''));
  };
}
test('fills placeholders after translating', () => {
  const p = mk({'Bid {amount} or more':'Bied {amount} of meer'});
  assert.equal(p('Bid {amount} or more', {amount:'€ 50'}), 'Bied € 50 of meer');
});
test('falls through to English when there is no entry', () => {
  const p = mk({});
  assert.equal(p('{amount} on {lot}.', {amount:'€ 45', lot:'Rancor'}), '€ 45 on Rancor.');
});
test('reorders when the Dutch puts the placeholders elsewhere', () => {
  const p = mk({'{a} and {b}':'{b} en {a}'});
  assert.equal(p('{a} and {b}', {a:'een', b:'twee'}), 'twee en een');
});
test('a missing value empties the slot rather than printing undefined', () => {
  const p = mk({});
  assert.equal(p('{a}/{b}', {a:'x'}), 'x/');
});
