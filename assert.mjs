// @ts-check

/**
 * @type {import('./assert').AssertionError}
 */
export class AssertionError extends Error {
  constructor (message) {
    if (typeof message !== 'string') {
      throw new TypeError('new AssertionError(message?), "message" must be a string.');
    }
    super(message);
    this.name = 'AssertionError';
    if (Error.captureStackTrace instanceof Function) {
      Error.captureStackTrace(this, AssertionError);
    }
  }
  toJSON () {
    const json = { name: this.name, message: this.message, stack: this.stack };
    return json;
  }
}

/**
 * @type {import('./assert').assert}
 */
export const assert = (value, message) => {
  if (typeof value !== 'boolean') {
    throw new TypeError('assert(value, message?), "value" must be a boolean.');
  }
  if (message !== undefined && typeof message !== 'string') {
    throw new TypeError('assert(value, message?), "message" must be a string.');
  }
  if (value === false) {
    throw new AssertionError(message || 'ERR_ASSERTION_ERROR');
  }
};

export default assert;