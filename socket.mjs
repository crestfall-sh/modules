// @ts-check

/**
 * WebSocket Client
 * - with Exponential Back-off Reconnect.
 * - uses Sets of listener functions for reusability.
 */

import assert from './assert.mjs';

export class Socket {

  /**
   * @type {string}
   */
  #url = null;

  /**
   * @type {WebSocket}
   */
  #socket = null;

  /**
   * @type {number}
   */
  #timeout = 125;

  /**
   * @type {Set<(timeout: number) => void>}
   */
  onbackoff = new Set();

  /**
   * @type {Set<() => void>}
   */
  onopening = new Set();

  /**
   * @type {Set<() => void>}
   */
  onopen = new Set();

  /**
   * @type {Set<(data: Record<string, any>|ArrayBuffer) => void>}
   */
  onmessage = new Set();

  /**
   * @type {Set<() => void>}
   */
  onerror = new Set();

  /**
   * @type {Set<(code: number, reason: string) => void>}
   */
  onclose = new Set();

  /**
   * @param {string} url
   */
  constructor (url) {
    assert(typeof url === 'string', 'Invalid url.');
    this.#url = url;
  }

  /**
   * 125, 250, 500, 1000, 2000, 4000, 8000
   */
  async backoff () {
    this.#timeout *= 2;
    if (this.#timeout === 16000) {
      this.#timeout = 125;
    }
    assert(this.onbackoff instanceof Set);
    this.onbackoff.forEach((fn) => {
      fn(this.#timeout);
    });
    await new Promise((resolve) => setTimeout(resolve, this.#timeout));
  }

  open () {
    assert(this.onopening instanceof Set);
    this.onopening.forEach((fn) => {
      fn();
    });
    this.#socket = new WebSocket(this.#url);
    this.#socket.addEventListener('open', () => {
      if (this.#socket.readyState === 1) {
        assert(this.onopen instanceof Set);
        this.onopen.forEach((fn) => {
          fn();
        });
      }
    });
    this.#socket.addEventListener('message', (event) => {
      assert(this.onmessage instanceof Set);
      this.onmessage.forEach((fn) => {
        if (this.#socket.binaryType === 'arraybuffer') {
          if (event.data instanceof ArrayBuffer) {
            fn(event.data);
            return;
          }
        }
        if (this.#socket.binaryType === 'blob') {
          if (typeof event.data === 'string') {
            fn(JSON.parse(event.data));
            return;
          }
        }
      });
    });
    this.#socket.addEventListener('error', () => {
      assert(this.onerror instanceof Set);
      this.onerror.forEach((fn) => {
        fn();
      });
    });
    this.#socket.addEventListener('close', async (event) => {
      assert(this.onclose instanceof Set);
      this.onclose.forEach((fn) => {
        fn(event.code, event.reason);
      });
      this.#socket = null;
      if (event.code === 1000) {
        return;
      }
      await this.backoff();
      this.open();
    });
  }

  /**
   * @param {ArrayBuffer|Record<string, any>} data
   */
  send (data) {
    assert(data instanceof ArrayBuffer || data instanceof Object, 'Invalid message, cannot send.');
    assert(this.#socket instanceof WebSocket, 'WebSocket is disconnected, cannot send.');
    assert(this.#socket.readyState === 1, 'WebSocket is disconnected, cannot send.');
    if (data instanceof ArrayBuffer) {
      this.#socket.send(data);
      return;
    }
    if (data instanceof Object) {
      this.#socket.send(JSON.stringify(data));
      return;
    }
  }

  close () {
    if (this.#socket instanceof WebSocket) {
      if (this.#socket.readyState === 1) {
        this.#socket.close(1000);
      }
    }
  }

  get state () {
    if (this.#socket instanceof WebSocket) {
      return this.#socket.readyState;
    }
    return null;
  }

  get connected () {
    if (this.#socket instanceof WebSocket) {
      return this.#socket.readyState === 1;
    }
    return false;
  }

}

export default Socket;

