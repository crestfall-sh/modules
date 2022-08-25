// @ts-check

// uWebSocket.js Utilities

import fs from 'fs';
import path from 'path';
import stream from 'stream';
import mime_types from 'mime-types';
import { default as uws } from 'uWebSockets.js';
import { assert } from './assert.mjs';

/**
 * @type {import('./uwu').InternalHeaders}
 * @description complies with RFC 7230 case-insensitive headers
 * @description https://www.rfc-editor.org/rfc/rfc7230#section-3.2
 * @description also allows JSON-encoding of our request.header and response.header
 */
export class InternalHeaders extends Map {
  has (key) {
    return super.has(key.toLowerCase());
  }
  get (key) {
    return super.get(key.toLowerCase());
  }
  set (key, value) {
    return super.set(key.toLowerCase(), String(value));
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
 * @type {import('./uwu').apply_middlewares}
 */
const apply_middlewares = async (res, middlewares, response, request) => {
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
 * @type {import('./uwu').use_middlewares}
 */
export const use_middlewares = (options, ...middlewares) => {

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
      pathname_params: [],
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

    if (options instanceof Object) {
      if (typeof options.pathname_parameters === 'number') {
        assert(Number.isFinite(options.pathname_parameters) === true);
        assert(Number.isInteger(options.pathname_parameters) === true);
        assert(options.pathname_parameters > 0);
        for (let i = 0, l = options.pathname_parameters; i < l; i += 1) {
          request.pathname_params.push(req.getParameter(i));
        }
      }
    }

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
    request.buffer = Buffer.from([]);
    res.onData((chunk_arraybuffer, is_last) => {
      const chunk_buffer = Buffer.from(chunk_arraybuffer.slice(0));
      request.buffer = Buffer.concat([request.buffer, chunk_buffer]);
      if (is_last === true) {
        try {
          if (request.buffer.length > 0) {
            if (request.headers.get('Content-Type').includes('application/json') === true) {
              request.json = JSON.parse(request.buffer.toString());
            }
            if (request.headers.get('Content-Type').includes('multipart/form-data') === true) {
              request.parts = uws.getParts(request.buffer, request.headers.get('Content-Type'));
            }
          }
        } catch (e) {
          request.error = e;
          console.error(e);
        }
        process.nextTick(apply_middlewares, res, middlewares, response, request);
      }
    });
    res.onAborted(() => {
      response.aborted = true;
    });
  };
  return uws_handler;
};

/**
 * @type {import('./uwu').use_middleware}
 */
export const use_middleware = (middleware, options) => {
  return use_middlewares(options, middleware);
};


/**
 * @type {import('./uwu').use_static_middleware}
 */
export const use_static_middleware = (app, url_pathname, local_pathname, static_response) => {
  assert(app instanceof Object);
  assert(app.get instanceof Function);

  assert(typeof url_pathname === 'string');
  assert(url_pathname.substring(0, 1) === '/');
  assert(url_pathname.substring(url_pathname.length - 1, url_pathname.length) === '/');

  assert(typeof local_pathname === 'string');
  assert(local_pathname.substring(local_pathname.length - 1, local_pathname.length) === path.sep);
  assert(fs.existsSync(local_pathname) === true);
  assert(path.isAbsolute(local_pathname) === true);

  assert(static_response === undefined || static_response instanceof Object);

  const core_static_middleware = use_middleware(async (response, request) => {
    response.file_path = request.url.replace(url_pathname, local_pathname);
    if (static_response instanceof Object) {
      Object.assign(response, static_response);
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
    core_static_middleware(res, req);
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