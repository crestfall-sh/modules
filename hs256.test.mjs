// @ts-check

import assert from 'console';
import crypto from 'crypto';
import * as luxon from 'luxon';
import * as hs256 from './hs256.mjs';

{
  const secret = crypto.randomBytes(32).toString('base64');
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iat: luxon.DateTime.now().toSeconds(),
    nbf: luxon.DateTime.now().toSeconds(),
    exp: luxon.DateTime.now().plus({ hours: 6 }).toSeconds(),
    role: 'anon',
  };
  const token = hs256.create_token(header, payload, secret);
  const verified_token = hs256.verify_token(token, secret);
  assert(verified_token instanceof Object);
  console.log('hs256.verify_token OK');
}
{
  try {
    const secret = crypto.randomBytes(32).toString('base64');
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iat: luxon.DateTime.now().toSeconds(),
      nbf: luxon.DateTime.now().plus({ hours: 1 }).toSeconds(),
      exp: luxon.DateTime.now().plus({ hours: 6 }).toSeconds(),
      role: 'anon',
    };
    const token = hs256.create_token(header, payload, secret);
    hs256.verify_token(token, secret);
    throw new Error('Unexpected token verification.');
  } catch (e) {
    if (e.message !== 'ERR_INVALID_TOKEN_NOT_BEFORE_TIME') {
      throw e;
    }
    console.log('ERR_INVALID_TOKEN_NOT_BEFORE_TIME OK');
  }
}
{
  try {
    const secret = crypto.randomBytes(32).toString('base64');
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iat: luxon.DateTime.now().toSeconds(),
      nbf: luxon.DateTime.now().toSeconds(),
      exp: luxon.DateTime.now().minus({ hours: 6 }).toSeconds(),
      role: 'anon',
    };
    const token = hs256.create_token(header, payload, secret);
    hs256.verify_token(token, secret);
    throw new Error('Unexpected token verification.');
  } catch (e) {
    if (e.message !== 'ERR_INVALID_TOKEN_EXPIRATION_TIME') {
      throw e;
    }
    console.log('ERR_INVALID_TOKEN_EXPIRATION_TIME OK');
  }
}