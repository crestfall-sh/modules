// @ts-check

// uWebSocket.js Utilities

import fs from 'fs';
import path from 'path';
import stream from 'stream';
import mime_types from 'mime-types';
import { default as uws } from 'uWebSockets.js';
import assert from './assert.mjs';

/**
 * @type {import('./uwu').InternalHeaders}
 * @description complies with RFC 7230 case-insensitive headers
 * @description https://www.rfc-editor.org/rfc/rfc7230#section-3.2
 * @description also allows JSON-encoding of our request.header and response.header
 */
export class InternalHeaders extends Map {
  has (key) {
    assert(typeof key === 'string');
    return super.has(key.toLowerCase());
  }
  get (key) {
    assert(typeof key === 'string');
    return super.get(key.toLowerCase());
  }
  set (key, value) {
    assert(typeof key === 'string');
    assert(typeof value === 'string');
    return super.set(key.toLowerCase(), value);
  }
  toJSON () {
    const json = {};
    super.forEach((value, key) => {
      json[key] = value;
    });
    return json;
  }
}

/**
 * @type {import('./uwu').InternalURLSearchParams}
 * @description also allows JSON-encoding of our request.query
 */
export class InternalURLSearchParams extends URLSearchParams {
  toJSON () {
    const json = {};
    super.forEach((value, key) => {
      json[key] = value;
    });
    return json;
  }
}

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
const file_cache = new Map();


/**
 * @type {import('./uwu').apply}
 */
const apply = async (res, middlewares, response, request) => {
  try {
    assert(res instanceof Object);
    assert(res.writeStatus instanceof Function);
    assert(res.writeHeader instanceof Function);
    assert(res.end instanceof Function);
    middlewares.forEach((middleware) => {
      assert(middleware instanceof Function);
    });
    assert(response instanceof Object);
    assert(request instanceof Object);
    for (let i = 0, l = middlewares.length; i < l; i += 1) {
      const middleware = middlewares[i];
      await middleware(response, request);
      assert(typeof response.ended === 'boolean');
      if (response.ended === true) {
        break;
      }
    }
    assert(typeof response.aborted === 'boolean');
    if (response.aborted === true) {
      return;
    }
    assert(typeof response.file_cache === 'boolean');
    assert(typeof response.file_cache_max_age_ms === 'number');
    assert(typeof response.status === 'number');
    assert(response.headers instanceof InternalHeaders);
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
          if (file_cache.has(response.file_path) === true) {
            const cached_file = file_cache.get(response.file_path);
            if (Date.now() - cached_file.timestamp > response.file_cache_max_age_ms) {
              file_cache.delete(response.file_path);
            }
          }
          if (file_cache.has(response.file_path) === false) {
            const file_name = path.basename(response.file_path);
            const file_content_type = mime_types.contentType(file_name) || null;
            const buffer = fs.readFileSync(response.file_path);
            const timestamp = Date.now();
            /**
             * @type {import('./uwu').cached_file}
             */
            const cached_file = { file_name, file_content_type, buffer, timestamp };
            file_cache.set(response.file_path, cached_file);
          }
          const cached_file = file_cache.get(response.file_path);
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
          response.headers.set('Content-Type', response.file_content_type);
        }
      }
    } else if (typeof response.text === 'string') {
      response.headers.set('Content-Type', 'text/plain');
      response.buffer = Buffer.from(response.text);
    } else if (typeof response.html === 'string') {
      response.headers.set('Content-Type', 'text/html');
      response.buffer = Buffer.from(response.html);
    } else if (response.json instanceof Object) {
      response.headers.set('Content-Type', 'application/json');
      response.buffer = Buffer.from(JSON.stringify(response.json));
    } else if (response.buffer instanceof Buffer) {
      if (response.headers.has('Content-Type') === false) {
        response.headers.set('Content-Type', 'application/octet-stream');
      }
    }
    if (typeof response.file_name === 'string' && response.file_dispose === true) {
      if (response.headers.has('Content-Disposition') === false) {
        response.headers.set('Content-Disposition', `attachment; filename="${response.file_name}"`);
      }
    }
    res.writeStatus(String(response.status));
    response.headers.forEach((value, key) => {
      res.writeHeader(key, value);
    });

    assert(response.buffer instanceof Buffer || response.buffer === null);

    if (response.status === 304) {
      res.end();
      return;
    }

    // unstable, untested
    if (response.stream instanceof stream.Readable) {
      response.stream.on('data', (chunk) => {
        /**
         * @type {Buffer}
         */
        const buffer = chunk;
        const write_response = res.write(buffer);
        if (write_response === false) {
          response.stream.pause();
        }
      });
      response.stream.on('end', () => {
        res.end();
      });
      res.onWritable(() => {
        response.stream.resume();
        return true;
      });
      return;
    }

    if (response.buffer instanceof Buffer) {
      res.write(response.buffer);
    }

    res.end();

  } catch (e) {
    response.error = e;
    if (response.aborted === false) {
      res.writeStatus('500');
      res.end();
    }
    console.error(e);
  }
};

/**
 * @type {import('./uwu').use}
 */
export const use = (...middlewares) => {

  middlewares.forEach((middleware) => {
    assert(middleware instanceof Function);
  });

  /**
   * @type {import('./uwu').uws_handler}
   */
  const uws_handler = (res, req) => {

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
      headers: new InternalHeaders(),
      pathname_params: null,
      search_params: new InternalURLSearchParams(req.getQuery()),
      ip_address: Buffer.from(res.getRemoteAddressAsText()).toString(),
      buffer: null,
      json: null,
      parts: null,
      error: null,
    };

    // https://unetworking.github.io/uWebSockets.js/generated/interfaces/HttpRequest.html#forEach
    req.forEach((key, value) => {
      request.headers.set(key, value);
    });

    /**
     * @type {import('./uwu').response}
     */
    const response = {

      aborted: false,
      ended: false,
      error: null,

      status: 200,
      headers: new InternalHeaders([['Cache-Control', cache_control_types.no_store]]),

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
      stream: null,

    };
    switch (request.method) {
      case 'post':
      case 'put':
      case 'patch': {
        res.onData((chunk_arraybuffer, is_last) => {
          if (request.buffer === null) {
            request.buffer = Buffer.from(chunk_arraybuffer.slice(0));
          } else {
            request.buffer = Buffer.concat([request.buffer, Buffer.from(chunk_arraybuffer.slice(0))]);
          }
          if (is_last === true) {
            if (request.buffer.length > 0) {
              try {
                if (request.headers.get('Content-Type').includes('application/json') === true) {
                  request.json = JSON.parse(request.buffer.toString());
                }
                if (request.headers.get('Content-Type').includes('multipart/form-data') === true) {
                  request.parts = uws.getParts(request.buffer, request.headers.get('Content-Type'));
                }
              } catch (e) {
                request.error = e;
                console.error(e);
              }
            }
            process.nextTick(apply, res, middlewares, response, request);
          }
        });
        res.onAborted(() => {
          response.aborted = true;
        });
        break;
      }
      default: {
        process.nextTick(apply, res, middlewares, response, request);
        break;
      }
    }
  };
  return uws_handler;
};

export const cors = (app) => {
  app.options('/*', use(async (response, request) => {
    response.status = 204;
    const access_control_request_method = request.headers.get('access-control-request-method');
    const origin = request.headers.get('origin');
    const access_control_allow_headers = ['content-type'];
    if (request.headers.has('access-control-request-headers') === true) {
      const access_control_request_headers = request.headers.get('access-control-request-headers').split(',');
      access_control_allow_headers.push(...access_control_request_headers);
    }
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', access_control_request_method);
    response.headers.set('Access-Control-Allow-Headers', access_control_allow_headers.join(','));
    response.headers.set('Access-Control-Max-Age', '300');
  }));
};

/**
 * @type {import('./uwu').serve}
 */
export const serve = (app, base_directory, serve_transform) => {
  assert(app instanceof Object);
  assert(typeof base_directory === 'string');
  assert(fs.existsSync(base_directory) === true);
  assert(path.isAbsolute(base_directory) === true);
  assert(serve_transform instanceof Function);
  app.get('/*', (res, req) => {
    let url_pathname = req.getUrl();
    if (url_pathname === '/') {
      url_pathname = '/index.html';
    }
    if (path.extname(url_pathname) === '') {
      req.setYield(true);
      return;
    }
    const file_path = path.join(base_directory, url_pathname);
    if (fs.existsSync(file_path) === true) {
      const file_stat = fs.statSync(file_path);
      if (file_stat.isFile() === true) {
        const file_name = path.basename(url_pathname);
        const file_content_type = mime_types.contentType(file_name) || null;
        if (typeof file_content_type === 'string') {
          res.writeStatus('200');
          res.writeHeader('Content-Type', file_content_type);
          res.write(serve_transform(fs.readFileSync(file_path)));
          res.end();
          return;
        }
        res.writeStatus('200');
        res.writeHeader('Content-Type', 'application/octet-stream');
        res.write(serve_transform(fs.readFileSync(file_path)));
        res.end();
        return;
      }
    }
    res.writeStatus('404');
    res.writeHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write('404 Not Found');
    res.end();
    return;
  });
};

/**
 * @type {import('./uwu').http}
 */
export const http = (app, port_access_type, port) => new Promise((resolve, reject) => {
  assert(app instanceof Object);
  assert(app.listen instanceof Function);
  assert(typeof port_access_type === 'number');
  assert(typeof port === 'number');
  app.listen(port, port_access_type, (token) => {
    if (token) {
      resolve(token);
    } else {
      reject(new Error('uWebSockets.js: app.listen failed, invalid token'));
    }
  });
});

export { default as uws } from 'uWebSockets.js';