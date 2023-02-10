// @ts-check

// hs256.mjs works for browser and node environments.

/**
 * @typedef {import('./hs256').header} header
 * @typedef {import('./hs256').payload} payload
 * @typedef {import('./hs256').token_data} token_data
 */

import assert from './assert.mjs';
import * as hmac from '@stablelib/hmac';
import * as utf8 from '@stablelib/utf8';
import * as sha256 from '@stablelib/sha256';
import * as base64 from '@stablelib/base64';
import * as luxon from 'luxon';

/**
 * @param {Uint8Array} key
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export const hmac_sha256 = (key, data) => hmac.hmac(sha256.SHA256, key, data);

/**
 * @param {header} header
 * @param {payload} payload
 * @param {string} secret
 * @returns {string}
 */
export const create_token = (header, payload, secret) => {
  assert(header instanceof Object);
  assert(header.alg === 'HS256');
  assert(header.typ === 'JWT');
  assert(payload instanceof Object);
  assert(typeof secret === 'string');
  const secret_buffer = base64.decode(secret);
  const header_b64ue = base64.encodeURLSafe(utf8.encode(JSON.stringify(header))).replace(/=/g, '');
  const payload_b64ue = base64.encodeURLSafe(utf8.encode(JSON.stringify(payload))).replace(/=/g, '');
  const signature_data = utf8.encode(`${header_b64ue}.${payload_b64ue}`);
  const signature_buffer = hmac_sha256(secret_buffer, signature_data);
  const signature_b64ue = base64.encodeURLSafe(signature_buffer).replace(/=/g, '');
  const token = [header_b64ue, payload_b64ue, signature_b64ue].join('.');
  return token;
};

/**
 * Note: read_token does not verify the token, use verify_token instead.
 * @param {string} token
 * @returns {{ header: header, payload: payload }}
 */
export const read_token = (token) => {
  assert(typeof token === 'string');
  const [header_b64ue, payload_b64ue, signature_b64ue] = token.split('.');
  assert(typeof header_b64ue === 'string');
  assert(typeof payload_b64ue === 'string');
  assert(typeof signature_b64ue === 'string');
  const header_buffer = base64.decodeURLSafe(header_b64ue);
  /**
  * @type {header}
  */
  const header = JSON.parse(utf8.decode(header_buffer));
  assert(header instanceof Object);
  assert(header.alg === 'HS256');
  assert(header.typ === 'JWT');
  const payload_buffer = base64.decodeURLSafe(payload_b64ue);
  /**
  * @type {payload}
  */
  const payload = JSON.parse(utf8.decode(payload_buffer));
  assert(payload instanceof Object);
  return { header, payload };
};

/**
 * @param  {Uint8Array[]} parts
 */
export const merge = (...parts) => {
  assert(parts instanceof Array);
  parts.forEach((part) => {
    assert(part instanceof Uint8Array);
  });
  const merged_length = parts.reduce((previous, current) => previous + current.byteLength, 0);
  const merged = new Uint8Array(merged_length);
  let offset = 0;
  parts.forEach((part) => {
    merged.set(part, offset);
    offset += part.byteLength;
  });
  return merged;
};

/**
 * @param {string} token
 * @returns {token_data}
 */
export const verify_nbf_exp = (token) => {
  assert(typeof token === 'string');
  const [header_b64ue, payload_b64ue, signature_b64ue] = token.split('.');
  assert(typeof header_b64ue === 'string');
  assert(typeof payload_b64ue === 'string');
  assert(typeof signature_b64ue === 'string');
  const header_buffer = base64.decodeURLSafe(header_b64ue);
  /**
   * @type {header}
   */
  const header = JSON.parse(utf8.decode(header_buffer));
  assert(header instanceof Object);
  assert(header.alg === 'HS256');
  assert(header.typ === 'JWT');
  const payload_buffer = base64.decodeURLSafe(payload_b64ue);
  /**
   * @type {payload}
   */
  const payload = JSON.parse(utf8.decode(payload_buffer));
  assert(payload instanceof Object);
  if (typeof payload.nbf === 'number') {
    const nbf = luxon.DateTime.fromSeconds(payload.nbf);
    assert(nbf.isValid === true);
    const now = luxon.DateTime.now();
    assert(nbf <= now, 'ERR_INVALID_TOKEN_NOT_BEFORE_TIME');
  }
  if (typeof payload.exp === 'number') {
    const exp = luxon.DateTime.fromSeconds(payload.exp);
    assert(exp.isValid === true);
    const now = luxon.DateTime.now();
    assert(now < exp, 'ERR_INVALID_TOKEN_EXPIRATION_TIME');
  }
  return { header, payload };
};

/**
 * @param {string} token
 * @param {string} secret
 * @returns {token_data}
 */
export const verify_sig = (token, secret) => {
  assert(typeof token === 'string');
  assert(typeof secret === 'string');
  const secret_buffer = base64.decode(secret);
  const [header_b64ue, payload_b64ue, signature_b64ue] = token.split('.');
  assert(typeof header_b64ue === 'string');
  assert(typeof payload_b64ue === 'string');
  assert(typeof signature_b64ue === 'string');
  const { header, payload } = verify_nbf_exp(token);
  const verification_signature_buffer = hmac_sha256(secret_buffer, merge(utf8.encode(header_b64ue), utf8.encode('.'), utf8.encode(payload_b64ue)));
  const signature_buffer = base64.decodeURLSafe(signature_b64ue);
  assert(verification_signature_buffer.length === signature_buffer.length);
  for (let i = 0, l = verification_signature_buffer.length; i < l; i += 1) {
    assert(verification_signature_buffer[i] === signature_buffer[i], 'ERR_INVALID_TOKEN_SIGNATURE');
  }
  return { header, payload };
};