// @ts-check

// request.mjs
// For options.id, defaults to null.
// For options.method, defaults to GET.
// For options.headers, defaults to empty.
// For options.query, defaults to empty.
// For options.data, uses application/json.
// For options.files, uses multipart/form-data.
// For options.files + options.data, uses multipart/form-data.

import { assert } from './assert.mjs';

/**
 * @type {Map<string|number, AbortController>}
 */
const controllers = new Map();

const methods = ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const methods_with_body = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * @type {import('./request').request}
 */
export const request = async (url, options) => {

  try {

    assert(typeof url === 'string', 'ERR_INVALID_URL', 'Invalid url.');
    assert(url.includes('?') === false, 'ERR_INVALID_URL', 'Invalid url.');
    assert(options instanceof Object, 'ERR_INVALID_OPTIONS', 'Invalid options.');
    assert(options.headers === undefined || options.headers instanceof Object, 'ERR_INVALID_HEADERS', 'Invalid headers.');
    assert(options.query === undefined || options.query instanceof Object, 'ERR_INVALID_QUERY', 'Invalid query.');
    assert(options.files === undefined || options.files instanceof Array, 'ERR_INVALID_FILES', 'Invalid files.');
    assert(options.data === undefined || options.data instanceof Object, 'ERR_INVALID_DATA', 'Invalid data.');

    const id = options.id || null;
    assert(id === null || typeof id === 'string', 'ERR_INVALID_ID', 'Invalid id.');

    if (typeof id === 'string') {
      if (controllers.has(id) === true) {
        controllers.get(id).abort();
        controllers.delete(id);
      }
      controllers.set(id, new AbortController());
    }

    const method = options.method || 'GET';
    assert(typeof method === 'string', 'ERR_INVALID_METHOD', 'Invalid method.');
    assert(methods.includes(method) === true, 'ERR_INVALID_METHOD', 'Invalid method.');

    const headers = new Headers(options.headers);

    let body;

    if (methods_with_body.includes(method) === true) {
      if (options.files instanceof Array) {
        assert(headers.has('content-type') === false, 'ERR_INVALID_HEADERS', 'Invalid headers.');
        body = new FormData();
        options.files.forEach((file) => {
          assert(file instanceof File);
          body.append('files', file);
        });
        if (options.data instanceof Object) {
          body.append('data', new Blob([JSON.stringify(options.data)], { type: 'application/json' }));
        }
      } else {
        if (options.data instanceof Object) {
          assert(headers.has('content-type') === false, 'ERR_INVALID_HEADERS', 'Invalid headers.');
          headers.set('content-type', 'application/json');
          body = JSON.stringify(options.data);
        }
      }
    }

    const query = new URLSearchParams(options.query);
    const url_with_query = `${url}?${query.toString()}`;
    const signal = controllers.has(id) ? controllers.get(id).signal : undefined;
    const response = await fetch(url_with_query, { method, headers, body, signal });

    if (response.headers.has('content-type') === true) {
      if (response.headers.get('content-type').includes('application/json') === true) {
        const response_json = await response.json();
        return response_json;
      }
    }

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(error);
      alert(error.message);
    }
  } finally {
    const id = options.id || null;
    if (controllers.has(id) === true) {
      controllers.delete(id);
    }
  }

  return null;
};
