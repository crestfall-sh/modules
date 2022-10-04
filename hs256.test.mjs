// @ts-check

import assert from 'assert';
import * as hs256 from './hs256.mjs';

const secret = hs256.create_secret();
console.log(secret.toString('hex'));

const data = { foo: 'bar' };
console.log(data);

const token = hs256.create_token(secret, data);
console.log(token);

const token_data = hs256.verify_token(secret, token);
console.log(token_data);

assert.deepEqual(data, token_data);