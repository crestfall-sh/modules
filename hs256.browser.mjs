// @ts-check

/**
 * @typedef {import('./hs256').header} header
 * @typedef {import('./hs256').payload} payload
 */

import assert from './assert.mjs';
import * as luxon from 'luxon';

const text_encoder = new TextEncoder();
const text_decoder = new TextDecoder();

/**
 * @param {string} value
 * @returns {string}
 */
export const url_encode = (value) => {
  assert(typeof value === 'string');
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * @param {string} value
 * @returns {string}
 */
export const url_decode = (value) => {
  assert(typeof value === 'string');
  return value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + (value.length % 4), '=');
};

/**
 * @param {Buffer} data
 * @returns {string}
 */
export const base64_url_encode = (data) => url_encode(data.toString('base64'));

/**
 * @param {string} data
 * @returns {Buffer}
 */
export const base64_url_decode = (data) => Buffer.from(url_decode(data), 'base64');

/**
 * @param {string} data
 * @returns {Uint8Array}
 */
export const base64_url_encode2 = (data) => text_encoder.encode(url_encode(window.atob(data)));

/**
 * @param {Uint8Array} data
 * @returns {string}
 */
export const base64_url_decode2 = (data) => window.btoa(url_decode(text_decoder.decode(data)));

// secret_buffer = window.crypto.getRandomValues(new Uint8Array(32));
// console.log({ secret_buffer });
// secret_key = await window.crypto.subtle.importKey('raw', secret_buffer, { name: "HMAC", hash: {name: "SHA-256"} }, false, ["sign", "verify"]);
// console.log({ secret_key });
// data_buffer = window.crypto.getRandomValues(new Uint8Array(32));
// console.log({ data_buffer });
// signature_arraybuffer = await window.crypto.subtle.sign({ name: 'HMAC' }, secret_key, data_buffer)
// console.log({ signature_arraybuffer });
// signature_buffer = new Uint8Array(signature_arraybuffer);
// console.log({ signature_buffer });

/**
 * @param {Uint8Array} data
 */
export const hmac = (data_buffer) => {
};

/**
 * @param {Buffer} secret_buffer
 * @param {Buffer} data_buffer
 * @returns {Buffer}
 */
export const hs256_hmac = (secret_buffer, data_buffer) => crypto.createHmac('sha256', secret_buffer).update(data_buffer).digest();

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
  const secret_buffer = Buffer.from(secret, 'base64');
  const header_base64_url_encoded = base64_url_encode(Buffer.from(JSON.stringify(header)));
  const payload_base64_url_encoded = base64_url_encode(Buffer.from(JSON.stringify(payload)));
  const signature_buffer = hs256_hmac(secret_buffer, Buffer.concat([Buffer.from(header_base64_url_encoded), Buffer.from('.'), Buffer.from(payload_base64_url_encoded)]));
  const signature_base64_url_encoded = base64_url_encode(signature_buffer);
  const token = [header_base64_url_encoded, payload_base64_url_encoded, signature_base64_url_encoded].join('.');
  return token;
};

/**
 * Note: read_token does not verify the token, use verify_token instead.
 * @param {string} token
 * @returns {{ header: header, payload: payload }}
 */
export const read_token = (token) => {
  assert(typeof token === 'string');
  const [header_base64_url_encoded, payload_base64_url_encoded, signature_base64_url_encoded] = token.split('.');
  assert(typeof header_base64_url_encoded === 'string');
  assert(typeof payload_base64_url_encoded === 'string');
  assert(typeof signature_base64_url_encoded === 'string');
  const header_buffer = base64_url_decode(header_base64_url_encoded);
  /**
  * @type {header}
  */
  const header = JSON.parse(header_buffer.toString());
  assert(header instanceof Object);
  assert(header.alg === 'HS256');
  assert(header.typ === 'JWT');
  const payload_buffer = base64_url_decode(payload_base64_url_encoded);
  /**
  * @type {payload}
  */
  const payload = JSON.parse(payload_buffer.toString());
  assert(payload instanceof Object);
  return { header, payload };
};

/**
 * @param {string} token
 * @param {string} secret
 * @returns {{ header: header, payload: payload }}
 */
export const verify_token = (token, secret) => {
  assert(typeof token === 'string');
  assert(typeof secret === 'string');
  const secret_buffer = Buffer.from(secret, 'base64');
  const [header_base64_url_encoded, payload_base64_url_encoded, signature_base64_url_encoded] = token.split('.');
  assert(typeof header_base64_url_encoded === 'string');
  assert(typeof payload_base64_url_encoded === 'string');
  assert(typeof signature_base64_url_encoded === 'string');
  const header_buffer = base64_url_decode(header_base64_url_encoded);
  /**
   * @type {header}
   */
  const header = JSON.parse(header_buffer.toString());
  assert(header instanceof Object);
  assert(header.alg === 'HS256');
  assert(header.typ === 'JWT');
  const payload_buffer = base64_url_decode(payload_base64_url_encoded);
  /**
   * @type {payload}
   */
  const payload = JSON.parse(payload_buffer.toString());
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
  const verification_signature_buffer = hs256_hmac(secret_buffer, Buffer.concat([Buffer.from(header_base64_url_encoded), Buffer.from('.'), Buffer.from(payload_base64_url_encoded)]));
  const signature_buffer = base64_url_decode(signature_base64_url_encoded);
  assert(crypto.timingSafeEqual(verification_signature_buffer, signature_buffer) === true, 'ERR_INVALID_TOKEN_SIGNATURE');
  return { header, payload };
};