// @ts-check

/**
 * References
 * - cookies and jwt are both bearer tokens.
 * - cookies does not include claims; lookups are needed.
 * - jwt includes exp, iat, and the hmac signature; no lookups on claims needed, just verify the signature.
 * - jwt hs256 is server-provided hmac payload and isgnature only meant to be verifiable by the server itself
 * - if the server verifies the signature, the server msut acknowledge its claims, making it useful for microservices
 * - Cookies vs. Tokens: The Definitive Guide: https://dzone.com/articles/cookies-vs-tokens-the-definitive-guide
 * - Cryptographic Right Answers: https://latacora.singles/2018/04/03/cryptographic-right-answers.html
 * - How (not) to sign a JSON object: https://latacora.micro.blog/2019/07/24/how-not-to.html
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
 * - https://nodejs.org/api/crypto.html
 */

import assert from 'assert';
import crypto from 'crypto';

const hashes = crypto.getHashes();
const algorithm = 'sha256';
assert(hashes.includes(algorithm) === true);

/**
 * @returns {Buffer}
 */
export const create_secret = () => crypto.randomBytes(32);

/**
 * @param {any} data
 * @returns {string}
 */
export const encode = (data) => encodeURIComponent(Buffer.from(JSON.stringify(data)).toString('base64'));

/**
 * @param {string} data
 * @returns any
 */
export const decode = (data) => JSON.parse(Buffer.from(decodeURIComponent(data), 'base64').toString());

/**
 *
 * @param {Buffer} secret
 * @param {string} data
 * @returns {Buffer}
 */
export const sign = (secret, data) => {
  const signature_buffer = crypto.createHmac(algorithm, secret).update(data).digest();
  return signature_buffer;
};

/**
 * @param {Buffer} secret
 * @param {any} data
 * @returns {string}
 */
export const create_token = (secret, data) => {
  const encoded = encode(data);
  const signature_buffer = sign(secret, encoded);
  const signature = encodeURIComponent(signature_buffer.toString('base64'));
  const token = `${encoded}.${signature}`;
  return token;
};

/**
 * @param {Buffer} secret
 * @param {string} token
 * @returns {any}
 */
export const verify_token = (secret, token) => {
  const [encoded, signature] = token.split('.');
  const token_signature_buffer = Buffer.from(decodeURIComponent(signature), 'base64');
  const signature_buffer = sign(secret, encoded);
  crypto.timingSafeEqual(signature_buffer, token_signature_buffer);
  const data = decode(encoded);
  return data;
};
