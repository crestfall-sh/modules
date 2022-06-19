
// @ts-check

import { assert } from './assert.mjs';
import { simple_casefold, full_casefold, special_casefold } from './casefold.mjs';

console.log(simple_casefold('\u0041 \u00DF \u0130'));
console.log(full_casefold('\u0041 \u00DF \u0130'));
console.log(special_casefold('\u0041 \u00DF \u0130'));
console.log(`MASSE === Maße: ${full_casefold('MASSE') === full_casefold('Maße')}`);
assert(full_casefold('MASSE') === full_casefold('Maße'));