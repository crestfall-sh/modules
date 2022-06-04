// @ts-check

// uWebSocket.js Utilities

import fs from 'fs';
import path from 'path';
import mime_types from 'mime-types';
import { default as uws } from 'uWebSockets.js';
import { assert } from './assert.mjs';

/**
 * @type {import('./uwu').cache_control_types}
 */
export const cache_control_types = {
  // prevent caching:
  no_store: 'no-store, max-age=0',
  // allow caching, must revalidate:
  no_cache: 'no-cache',
  // allow private caching, no revalidate, one hour:
  private_cache: 'private, max-age=3600, s-maxage=3600',
  // allow public caching, no revalidate, one day:
  public_cache: 'public, max-age=86400, s-maxage=86400',
};


/**
 * @type {import('./uwu').port_access_types}
 */
export const port_access_types = { SHARED: 0, EXCLUSIVE: 1 };


/**
 * @type {Map<string, import('./uwu').cached_file>}
 */
const cached_files = new Map();


/**
 * @type {import('./uwu').internal_handler}
 */
const internal_handler = async (res, handler, response, request) => {
  try {
    assert(res instanceof Object);
    assert(res.writeStatus instanceof Function);
    assert(res.writeHeader instanceof Function);
    assert(res.end instanceof Function);
    assert(handler instanceof Function);
    assert(response instanceof Object);
    assert(request instanceof Object);
    await handler(response, request);
    assert(typeof response.aborted === 'boolean');
    if (response.aborted === true) {
      return;
    }
    assert(typeof response.ended === 'boolean');
    assert(response.ended === false);
    assert(typeof response.file_cache === 'boolean');
    assert(typeof response.file_cache_max_age_ms === 'number');
    assert(typeof response.status === 'number');
    assert(response.headers instanceof Object);
    if (typeof response.file_path === 'string') {
      assert(path.isAbsolute(response.file_path) === true);
      try {
        fs.accessSync(response.file_path);
      } catch (e) {
        if (fs.existsSync(response.file_path) === false) {
          response.status = 404;
        } else {
          response.status = 500;
        }
      }
      if (response.status === 200) {
        if (response.file_cache === true) {
          if (cached_files.has(response.file_path) === true) {
            const cached_file = cached_files.get(response.file_path);
            if (Date.now() - cached_file.timestamp > response.file_cache_max_age_ms) {
              cached_files.delete(response.file_path);
            }
          }
          if (cached_files.has(response.file_path) === false) {
            const file_name = path.basename(response.file_path);
            const file_content_type = mime_types.contentType(file_name) || null;
            const buffer = fs.readFileSync(response.file_path);
            const timestamp = Date.now();

            /**
             * @type {import('./uwu').cached_file}
             */
            const cached_file = {
              file_name,
              file_content_type,
              buffer,
              timestamp,
            };

            cached_files.set(response.file_path, cached_file);
          }
          const cached_file = cached_files.get(response.file_path);
          response.file_name = cached_file.file_name;
          response.file_content_type = cached_file.file_content_type;
          response.buffer = cached_file.buffer;
        } else {
          const file_name = path.basename(response.file_path);
          const file_content_type = mime_types.contentType(file_name) || null;
          const buffer = fs.readFileSync(response.file_path);
          response.file_name = file_name;
          response.file_content_type = file_content_type;
          response.buffer = buffer;
        }
        if (typeof response.file_content_type === 'string') {
          response.headers['Content-Type'] = response.file_content_type;
        }
      }
    } else if (typeof response.text === 'string') {
      response.headers['Content-Type'] = 'text/plain';
      response.buffer = Buffer.from(response.text);
    } else if (typeof response.html === 'string') {
      response.headers['Content-Type'] = 'text/html';
      response.buffer = Buffer.from(response.html);
    } else if (response.json instanceof Object) {
      response.headers['Content-Type'] = 'application/json';
      response.buffer = Buffer.from(JSON.stringify(response.json));
    } else if (response.buffer instanceof Buffer) {
      if (response.headers['Content-Type'] === undefined) {
        response.headers['Content-Type'] = 'application/octet-stream';
      }
    }
    if (typeof response.file_name === 'string' && response.file_dispose === true) {
      if (response.headers['Content-Disposition'] === undefined) {
        response.headers['Content-Disposition'] = `attachment; filename="${response.file_name}"`;
      }
    }
    res.writeStatus(String(response.status));
    Object.entries(response.headers).forEach((entry) => {
      const [key, value] = entry;
      assert(typeof key === 'string');
      assert(typeof value === 'string');
      res.writeHeader(key, value);
    });
    assert(response.buffer === null || response.buffer instanceof Buffer);
    if (response.status === 304 || response.buffer === null) {
      res.end();
    } else {
      res.end(response.buffer);
    }
    response.ended = true;
    response.end = Date.now();
    response.took = response.end - response.start;
  } catch (e) {
    response.error = e;
    if (response.aborted === false) {
      if (response.ended === false) {
        res.writeStatus('500');
        res.end();
        response.ended = true;
      }
    }
    console.error(e);
  }
};


/**
 * @type {import('./uwu').create_handler}
 */
export const create_handler = (handler) => {
  assert(handler instanceof Function);

  /**
   * @type {import('./uwu').initial_handler}
   */
  const initial_handler = (res, req) => {
    assert(res instanceof Object);
    assert(res.onData instanceof Function);
    assert(res.onAborted instanceof Function);
    assert(req instanceof Object);
    assert(req.getUrl instanceof Function);
    assert(req.getQuery instanceof Function);
    assert(req.getHeader instanceof Function);

    /**
     * @type {import('./uwu').request}
     */
    const request = {
      url: req.getUrl(),
      method: req.getMethod(),
      headers: {
        host: req.getHeader('host'),
        origin: req.getHeader('origin'),
        accept: req.getHeader('accept'),
        accept_encoding: req.getHeader('accept-encoding'),
        content_type: req.getHeader('content-type'),
        user_agent: req.getHeader('user-agent'),
        cookie: req.getHeader('cookie'),
        x_forwarded_proto: req.getHeader('x-forwarded-proto'),
        x_forwarded_host: req.getHeader('x-forwarded-host'),
        x_forwarded_for: req.getHeader('x-forwarded-for'),
      },
      query: new URLSearchParams(req.getQuery()),
      body: {
        buffer: null,
        json: null,
        parts: null,
      },
      ip_address: Buffer.from(res.getRemoteAddressAsText()).toString(),
    };

    /**
     * @type {import('./uwu').response}
     */
    const response = {

      aborted: false,
      ended: false,
      error: null,

      status: 200,
      headers: { 'Cache-Control': cache_control_types.no_store },

      file_path: null,
      file_name: null,
      file_content_type: null,
      file_dispose: false,
      file_cache: false,
      file_cache_max_age_ms: Infinity,

      text: null,
      html: null,
      json: null,
      buffer: null,

      start: Date.now(),
      end: null,
      took: null,
    };
    request.body.buffer = Buffer.from([]);
    res.onData((chunk_arraybuffer, is_last) => {
      // previous : const chunk_buffer = Buffer.from(chunk_arraybuffer.slice(0));
      // current  : const chunk_buffer = Buffer.from(chunk_arraybuffer);
      // https://github.com/uNetworking/uWebSockets.js/issues/602#issuecomment-903296476
      const chunk_buffer = Buffer.from(chunk_arraybuffer);
      request.body.buffer = Buffer.concat([request.body.buffer, chunk_buffer]);
      if (is_last === true) {
        try {
          if (request.body.buffer.length > 0) {
            if (request.headers.content_type.includes('application/json') === true) {
              request.body.json = JSON.parse(request.body.buffer.toString());
            }
            if (request.headers.content_type.includes('multipart/form-data') === true) {
              request.body.parts = uws.getParts(request.body.buffer, request.headers.content_type);
            }
          }
        } catch (e) {
          request.error = e;
          console.error(e);
        }
        process.nextTick(internal_handler, res, handler, response, request);
      }
    });
    res.onAborted(() => {
      response.aborted = true;
    });
  };
  return initial_handler;
};


/**
 * @type {import('./uwu').create_static_handler}
 */
export const create_static_handler = (app, url_pathname, local_directory, response_override) => {
  assert(app instanceof Object);
  assert(app.get instanceof Function);

  assert(typeof url_pathname === 'string');
  assert(url_pathname.substring(0, 1) === '/');
  assert(url_pathname.substring(url_pathname.length - 1, url_pathname.length) === '/');

  assert(typeof local_directory === 'string');
  assert(local_directory.substring(local_directory.length - 1, local_directory.length) === path.sep);
  assert(fs.existsSync(local_directory) === true);
  assert(path.isAbsolute(local_directory) === true);

  assert(response_override === undefined || response_override instanceof Object);

  const core_static_handler = create_handler(async (response, request) => {
    response.file_path = request.url.replace(url_pathname, local_directory);
    if (response_override instanceof Object) {
      Object.assign(response, response_override);
    }
  });

  app.get(url_pathname.concat('*'), (res, req) => {
    assert(req instanceof Object);
    assert(req.getUrl instanceof Function);
    const request_url = req.getUrl();
    const request_url_extname = path.extname(request_url);
    if (request_url_extname === '') {
      req.setYield(true);
      return;
    }
    core_static_handler(res, req);
  });
};


/**
 * @type {import('./uwu').serve_http}
 */
export const serve_http = (app, port_access_type, port) => new Promise((resolve, reject) => {
  assert(app instanceof Object);
  assert(app.listen instanceof Function);
  assert(typeof port_access_type === 'number');
  assert(typeof port === 'number');
  app.listen(port, port_access_type, (token) => {
    if (token) {
      resolve(token);
    } else {
      reject(new Error('uws :: app.listen failed, invalid token'));
    }
  });
});

export { default as uws } from 'uWebSockets.js';