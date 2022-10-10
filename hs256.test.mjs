// @ts-check

import assert from 'assert';
import crypto from 'crypto';
import * as hs256 from './hs256.mjs';

const secret = crypto.randomBytes(32).toString('base64');
console.log({ secret });

const header = { alg: 'HS256', typ: 'JWT' };
console.log({ header });

const payload = { role: 'anon' };
console.log({ payload });

const token = hs256.create_token(header, payload, secret);
console.log({ token });

const verified_token = hs256.verify_token(token, secret);
console.log({ verified_token });