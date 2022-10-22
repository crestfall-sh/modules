// @ts-check

import assert from './assert.mjs';
import * as base32 from './base32.mjs';


/**
 * @param {string} algorithm
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>}
 */
export const hash = async (algorithm, data) => {
  assert(typeof algorithm === 'string');
  assert(data instanceof Uint8Array);
  const arraybuffer = await window.crypto.subtle.digest(algorithm, data.buffer);
  const response = new Uint8Array(arraybuffer);
  return response;
};


/**
 * @param {string} algorithm
 * @param {Uint8Array} key
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>}
 */
export const hmac = async (algorithm, key, data) => {
  assert(typeof algorithm === 'string');
  assert(key instanceof Uint8Array);
  assert(data instanceof Uint8Array);
  const crypto_key = await window.crypto.subtle.importKey(
    'raw',
    key.buffer,
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign'],
  );
  const arraybuffer = await window.crypto.subtle.sign(
    { name: 'HMAC' },
    crypto_key,
    data.buffer,
  );
  const response = new Uint8Array(arraybuffer);
  return response;
};


/**
 * @param {number} length
 * @returns {Uint8Array}
 */
export const random_bytes = (length) => {
  assert(typeof length === 'number');
  const response = window.crypto.getRandomValues(new Uint8Array(length));
  return response;
};


/**
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @param {number} value
 */
export const write_uint32be = (buffer, offset, value) => {
  assert(buffer instanceof Uint8Array);
  assert(typeof offset === 'number');
  assert(typeof value === 'number');
  let value2 = value;
  buffer[offset + 3] = value2;
  value2 = value2 >>> 8;
  buffer[offset + 2] = value2;
  value2 = value2 >>> 8;
  buffer[offset + 1] = value2;
  value2 = value2 >>> 8;
  buffer[offset + 0] = value2;
};


/**
 * @param {Uint8Array} buffer
 * @param {number} offset
 */
export const read_uint32be = (buffer, offset) => {
  assert(buffer instanceof Uint8Array);
  assert(typeof offset === 'number');
  const value = (buffer[offset + 0] * (2 ** 24))
    + (buffer[offset + 1] * (2 ** 16))
    + (buffer[offset + 2] * (2 ** 8))
    + (buffer[offset + 3]);
  return value;
};


/**
 * @param {string} key
 * @param {string} algorithm
 * @param {number} digits
 * @param {number} counter
 * @returns {Promise<string>}
 */
export const hotp_code = async (key, algorithm, digits, counter) => {
  assert(typeof key === 'string');
  assert(typeof algorithm === 'string');
  assert(typeof digits === 'number');
  assert(typeof counter === 'number');

  const key_buffer = base32.decode(key.replace(/=/g, ''));

  const counter_buffer = new Uint8Array(8);
  write_uint32be(counter_buffer, 4, counter);

  const signature_buffer = await hmac(algorithm, key_buffer, counter_buffer);

  const offset = signature_buffer[signature_buffer.byteLength - 1] & 0xf;

  const truncated_buffer = signature_buffer.slice(offset, offset + 4);
  truncated_buffer[0] &= 0x7f;

  const truncated_value = read_uint32be(truncated_buffer, 0);

  const code = String(truncated_value % (10 ** digits)).padStart(digits, '0');

  return code;
};


/**
 * @param {number} period
 * @return {number}
 */
export const totp_counter = (period) => {
  const counter = Math.floor(Math.round(Date.now() / 1000) / period);
  return counter;
};


/**
 * @param {number} period
 * @return {number}
 */
export const totp_progress = (period) => {
  const progress = (Math.round(Date.now() / 1000) % period) / period;
  return progress;
};


/**
 * @param {string} key
 * @param {string} algorithm
 * @param {number} digits
 * @param {number} period
 * @param {number} look_ahead
 * @returns {Promise<string>}
 */
export const totp_code = async (key, algorithm, digits, period, look_ahead) => {
  assert(typeof key === 'string');
  assert(typeof algorithm === 'string');
  assert(typeof digits === 'number');
  assert(typeof period === 'number');
  assert(typeof look_ahead === 'number');
  const counter = totp_counter(period) + look_ahead;
  const code = await hotp_code(key, algorithm, digits, counter);
  return code;
};


/**
 * @param {string} issuer
 * @param {string} account
 * @param {string} secret
 * @param {string} algorithm
 * @param {number} digits
 * @param {number} counter
 * @returns {string}
 */
export const hotp_uri = (issuer, account, secret, algorithm, digits, counter) => {
  assert(typeof issuer === 'string');
  assert(typeof account === 'string');
  assert(typeof secret === 'string');
  assert(typeof algorithm === 'string');
  assert(typeof digits === 'number');
  assert(typeof counter === 'number');
  let response = `otpauth://hotp/${encodeURIComponent(`${issuer}:${account}`)}`;
  response += `?issuer=${encodeURIComponent(issuer)}`;
  response += `&account=${encodeURIComponent(account)}`;
  response += `&secret=${encodeURIComponent(secret)}`;
  response += `&algorithm=${encodeURIComponent(algorithm)}`;
  response += `&digits=${encodeURIComponent(digits)}`;
  response += `&counter=${encodeURIComponent(counter)}`;
  return response;
};


/**
 * @param {string} issuer
 * @param {string} account
 * @param {string} secret
 * @param {string} algorithm
 * @param {number} digits
 * @param {number} period
 * @returns {string}
 */
export const totp_uri = (issuer, account, secret, algorithm, digits, period) => {
  assert(typeof issuer === 'string');
  assert(typeof account === 'string');
  assert(typeof secret === 'string');
  assert(typeof algorithm === 'string');
  assert(typeof digits === 'number');
  assert(typeof period === 'number');
  let response = `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}`;
  response += `?issuer=${encodeURIComponent(issuer)}`;
  response += `&account=${encodeURIComponent(account)}`;
  response += `&secret=${encodeURIComponent(secret)}`;
  response += `&algorithm=${encodeURIComponent(algorithm)}`;
  response += `&digits=${encodeURIComponent(digits)}`;
  response += `&period=${encodeURIComponent(period)}`;
  return response;
};


export const test_totp_code = () => {
  const key = 'WZELRRFMHGY7UZY2GS4OEOTHKG6FK7M2';
  const algorithm = 'SHA-1';
  console.log({ key });

  setInterval(async () => {
    const code = await totp_code(key, algorithm, 6, 30, 0);
    console.log({ code });
    const code2 = await totp_code(key, algorithm, 8, 30, 0);
    console.log({ code2 });
  }, 1000);
};