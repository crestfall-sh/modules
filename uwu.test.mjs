// @ts-check

import os from 'os';
import fs from 'fs';
import url from 'url';
import path from 'path';
import worker_threads from 'worker_threads';
import fetch from 'node-fetch';
import { assert } from './assert.mjs';
import * as uwu from './uwu.mjs';
import * as proc from './proc.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __cwd = process.cwd();
console.log({ __filename, __dirname, __cwd });

const test_html = `
  <html>
    <body>
      <h4>Hello world!</h4>
    </body>
  </html>
`;

const test_file = fs.readFileSync(__filename, { encoding: 'utf-8' });

const test = async () => {

  console.log(`process id ${process.pid}; thread id ${worker_threads.threadId}`);

  const port = 8080;
  const origin = `http://localhost:${port}`;
  const app = uwu.uws.App({});

  uwu.use_static_middleware(app, '/test-static/', path.join(__dirname, '/'), { file_cache: false });
  uwu.use_static_middleware(app, '/test-cached-static/', path.join(__dirname, '/'), { file_cache: true });
  app.get('/test-html', uwu.use_middlewares(async (response) => {
    response.html = test_html;
  }));
  app.get('/test-headers', uwu.use_middlewares(async (response, request) => {
    response.json = request;
  }));
  app.post('/test-json-post', uwu.use_middlewares(async (response, request) => {
    response.json = request;
  }));

  const token = await uwu.serve_http(app, uwu.port_access_types.SHARED, port);

  const response = await fetch(`${origin}/test-html`, {
    method: 'GET',
  });
  assert(response.status === 200);
  assert(response.headers.get('content-encoding') === null);
  const body = await response.text();
  assert(body === test_html);

  const response2 = await fetch(`${origin}/test-static/uwu.test.mjs`, {
    method: 'GET',
  });
  assert(response2.status === 200);
  assert(response2.headers.get('content-encoding') === null);
  const body2 = await response2.text();
  assert(body2 === test_file);

  const response3 = await fetch(`${origin}/test-cached-static/uwu.test.mjs`, {
    method: 'GET',
  });
  assert(response3.status === 200);
  assert(response3.headers.get('content-encoding') === null);
  const body3 = await response3.text();
  assert(body3 === test_file);

  const response4 = await fetch(`${origin}/test-headers`, {
    method: 'GET',
  });
  assert(response4.status === 200);
  /**
   * @type {any}
   */
  const body4 = await response4.json();
  assert(body4 instanceof Object);
  assert(body4.method === 'get');
  assert(body4.headers instanceof Object);
  assert(body4.headers.host === 'localhost:8080');

  const response5 = await fetch(`${origin}/test-json-post`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ foo: 'bar' }),
  });
  /**
   * @type {any}
   */
  const body5 = await response5.json();
  assert(response5.status === 200);
  assert(body5 instanceof Object);
  assert(body5.method === 'post');
  assert(body5.body.json instanceof Object);
  assert(body5.body.json.foo === 'bar');

  // avoid dropping requests from other threads
  await proc.sleep(500);

  uwu.uws.us_listen_socket_close(token);
};

process.nextTick(async () => {
  try {
    if (worker_threads.isMainThread === true) {
      console.log('single-thread test:');
      await test();
      console.log('multi-thread test:');
      os.cpus().forEach(() => {
        new worker_threads.Worker(__filename);
      });
    } else {
      await test();
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});