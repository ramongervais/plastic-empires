// Postage tariffs and parcel sizes, in one file on purpose.
//
// The seller flow suggests an amount and the admin editor suggests an amount. If
// this table lived in both places they would drift, and the same lot would get
// two different answers depending on which screen you opened. It is also the
// thing most likely to be edited: the four volumetric figures below are an
// assumption that wants checking against a real PostNL or DHL tariff sheet, and
// that should be a one-file change.
//
// Loaded as a plain script before the page's own code, so these are globals and
// there is no module step to add.

const SHIP_BANDS = [
  { label: 'Up to 0.5 kg', max: 0.5, nl: 6.95,  eu: 10, uk: 14, row: 20 },
  { label: '0.5 to 1 kg', max: 1, nl: 6.95,  eu: 12, uk: 17, row: 23 },
  { label: '1 to 2 kg', max: 2, nl: 6.95,  eu: 15, uk: 20, row: 27 },
  { label: '2 to 5 kg', max: 5, nl: 6.95,  eu: 20, uk: 26, row: 35 },
  { label: '5 to 10 kg', max: 10, nl: 6.95,  eu: 25, uk: 33, row: 50 },
  { label: '10 to 20 kg', max: 20, nl: 16.95, eu: 35, uk: 45, row: 70 }
];
// Carriers charge on whichever is greater: what a parcel weighs, or what it
// takes up. Volumetric weight is length x width x height / 5000, and for the
// things sold here it wins almost every time: a 13 inch hollow vinyl kaiju
// weighs half a kilo and bills as four. Pricing on weight alone under-charges
// by around EUR 10 a lot on exactly this catalogue's biggest items, which is
// why an eBay seller in Kansas asks $54 to post a $56 Godzilla.
//
// Three dimensions is three more fields a seller has to measure. A size class
// is one tap and gets within a band, which is all the precision a band needs.
// These four volumetric figures are the assumption in the whole calculation:
// each is its box divided by 5000, the divisor DHL and UPS use. PostNL prices
// domestic parcels by size class rather than volumetric kilos, so the penalty
// bites hardest on EU and courier shipments. Check them against a real tariff
// sheet before launch; they are deliberately in one table so that is a
// four-number edit.
const SIZE_CLASSES = [
  { id: 'S',  label: 'Small',    hint: 'a loose 3-4 inch figure, padded envelope or small box', box: '25 x 18 x 8',   vol: 1 },
  { id: 'M',  label: 'Medium',   hint: 'a loose 8 inch figure, a shoebox',                     box: '32 x 20 x 12', vol: 1.5 },
  { id: 'L',  label: 'Large',    hint: 'a big vinyl kaiju, a boxed or carded figure',          box: '40 x 30 x 20', vol: 5 },
  { id: 'XL', label: 'Oversize', hint: 'a playset, a vehicle, a multi-figure lot',             box: '55 x 40 x 30', vol: 13 },
];
const sizeClass = id => SIZE_CLASSES.find(c => c.id === id) || null;

// What the carrier will actually bill for.
function chargeableKg(kg, sizeId){
  const c = sizeClass(sizeId);
  return Math.max(Number(kg) || 0, c ? c.vol : 0);
}

// the band a given weight falls into, clamped to the heaviest
const bandFor = kg => SHIP_BANDS.filter(b => Number(kg) <= b.max)[0] || SHIP_BANDS[SHIP_BANDS.length - 1];

// Three destinations, three prices. One amount per lot meant a Dutch buyer paid
// the EU rate: EUR 8.05 too much on a medium parcel, EUR 18.05 on an oversize
// one, on a marketplace whose buyers are mostly Dutch. Note that UK sits in
// "rest of world" for POSTAGE even though the help page treats it separately for
// CUSTOMS. Those are two different questions: what a carrier charges, and who
// clears the parcel.
const SHIP_ZONES = [
  { key: 'nl',  id: 'nl',  label: 'Netherlands' },
  { key: 'eu',  id: 'eu',  label: 'EU' },
  { key: 'row', id: 'row', label: 'Rest of world' },
];

// The three amounts a size class implies, so every screen quotes the same thing.
function shipQuote(kg, sizeId){
  const b = bandFor(chargeableKg(kg, sizeId));
  return { band: b.label, nl: b.nl, eu: b.eu, row: b.row };
}

// Which of the three a delivery address falls into. EU membership as of 2026,
// and anything not listed is rest of world, which is the conservative answer:
// a seller is never left short on a destination we failed to anticipate.
const EU_CC = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','PL','PT','RO','SK','SI','ES','SE'];
function zoneForCountry(cc){
  const c = String(cc || '').toUpperCase();
  if (c === 'NL') return 'nl';
  return EU_CC.includes(c) ? 'eu' : 'row';
}
