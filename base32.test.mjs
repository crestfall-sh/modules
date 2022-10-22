// @ts-check

//
// https://datatracker.ietf.org/doc/html/rfc4226
//
// The algorithm MUST use a strong shared secret.  The length of
// the shared secret MUST be at least 128 bits.  This document
// RECOMMENDs a shared secret length of 160 bits.
//
// 20 bytes = 160 bits
//

import assert from './assert.mjs';
import * as base32 from './base32.mjs';

process.nextTick(async () => {
  const test_cases = [
    { utf8: '', base32: '' },
    { utf8: 'f', base32: 'MY======' },
    { utf8: 'fo', base32: 'MZXQ====' },
    { utf8: 'foo', base32: 'MZXW6===' },
    { utf8: 'foob', base32: 'MZXW6YQ=' },
    { utf8: 'fooba', base32: 'MZXW6YTB' },
    { utf8: 'foobar', base32: 'MZXW6YTBOI======' },
  ];
  test_cases.forEach((test_case) => {
    try {
      assert(base32.encode(Buffer.from(test_case.utf8, 'utf-8')) === test_case.base32);
    } catch (e) {
      console.error({ test_case });
      throw e;
    }
  });
});