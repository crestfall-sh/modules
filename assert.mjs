// @ts-check

/**
 * @type {import('./assert').AssertionError}
 */
export class AssertionError extends Error {
  constructor (code, message) {
    if (typeof code !== 'string') {
      throw new TypeError('new AssertionError(code, message?), "code" must be a string.');
    }
    if (typeof message !== 'string') {
      throw new TypeError('new AssertionError(code, message?), "message" must be a string.');
    }
    super(message);
    this.name = 'AssertionError';
    this.code = code;
    if (Error.captureStackTrace instanceof Function) {
      Error.captureStackTrace(this, AssertionError);
    }
  }
  toJSON () {
    const json = { name: this.name, code: this.code, message: this.message, stack: this.stack };
    return json;
  }
}

/**
 * @type {import('./assert').assert}
 */
export const assert = (value, code, message) => {
  if (typeof value !== 'boolean') {
    throw new TypeError('assert(value, code?, message?), "value" must be a boolean.');
  }
  if (code !== undefined && typeof code !== 'string') {
    throw new TypeError('assert(value, code?, message?), "code" must be a string.');
  }
  if (message !== undefined && typeof message !== 'string') {
    throw new TypeError('assert(value, code?, message?), "message" must be a string.');
  }
  if (value === false) {
    throw new AssertionError(code || 'ERR_ASSERTION_ERROR', message || 'Assertion error.');
  }
};