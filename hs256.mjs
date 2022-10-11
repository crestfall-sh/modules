// @ts-check

/**
 * References
 * - cookies and jwt are both bearer tokens.
 * - cookies does not include claims; lookups are needed.
 * - jwt includes exp, iat, and the hmac signature; no lookups on claims needed, just verify the signature.
 * - jwt hs256 is server-provided hmac payload and isgnature only meant to be verifiable by the server itself
 * - if the server verifies the signature, the server msut acknowledge its claims, making it useful for microservices
 * - Cookies vs. Tokens: The Definitive Guide
 *   - https://dzone.com/articles/cookies-vs-tokens-the-definitive-guide
 * - Cryptographic Right Answers
 *   - https://latacora.singles/2018/04/03/cryptographic-right-answers.html
 * - How (not) to sign a JSON object
 *   - https://latacora.micro.blog/2019/07/24/how-not-to.html
 * - A Child’s Garden of Inter-Service Authentication Schemes
 *   - https://latacora.micro.blog/2018/06/12/a-childs-garden.html
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
 * - https://nodejs.org/api/crypto.html
 * - https://gist.github.com/kepawni/45c9b37dd64a4327ff7806147b1368df#file-simplejwt-php-L96
 */

/**
 * @typedef {import('./hs256').header} header
 * @typedef {import('./hs256').payload} payload
 */

import assert from 'assert';
import crypto from 'crypto';
import * as luxon from 'luxon';

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