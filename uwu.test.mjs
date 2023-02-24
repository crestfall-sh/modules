// @ts-check

import os from 'os';
import fs from 'fs';
import url from 'url';
import path from 'path';
import worker_threads from 'worker_threads';
import fetch from 'node-fetch';
import assert from './assert.mjs';
import * as uwu from './uwu.mjs';
import * as proc from './proc.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __cwd = process.cwd();

const test_html = `
  <html>
    <body>
      <h4>Hello world!</h4>
    </body>
  </html>
`;

const test_file = fs.readFileSync(__filename, { encoding: 'utf-8' });

const test = async () => {

  console.log({ __filename, __dirname, __cwd, pid: process.pid, wid: worker_threads.threadId });

  const port = 8080;
  const origin = `http://localhost:${port}`;
  const app = uwu.uws.App({});

  uwu.serve({
    app,
    include: [{ url: '/', directory: process.cwd() }],
    exclude: [],
    debug: true,
  });
  app.get('/test-html', uwu.use(async (response) => {
    response.html = test_html;
  }));
  app.get('/test-query', uwu.use(async (response, request) => {
    response.json = request;
  }));
  app.get('/test-headers', uwu.use(async (response, request) => {
    response.json = request;
  }));
  app.post('/test-json-post', uwu.use(async (response, request) => {
    response.json = request;
  }));

  const token = await uwu.http(app, uwu.port_access_types.SHARED, port);


  const response = await fetch(`${origin}/test-html`, {
    method: 'GET',
  });
  assert(response.status === 200);
  assert(response.headers.get('Content-Encoding') === null);
  const body = await response.text();
  assert(body === test_html);

  const response2 = await fetch(`${origin}/uwu.test.mjs`, {
    method: 'GET',
  });
  assert(response2.status === 200);
  assert(response2.headers.get('Content-Encoding') === 'gzip');
  const body2 = await response2.text();
  assert(body2 === test_file);

  const response4 = await fetch(`${origin}/test-query?foo=bar`, {
    method: 'GET',
  });
  assert(response4.status === 200);
  /**
   * @type {any}
   */
  const body4 = await response4.json();
  assert(body4 instanceof Object);
  assert(body4.method === 'get');
  assert(body4.search_params instanceof Object);
  assert(body4.search_params.foo === 'bar');

  const response5 = await fetch(`${origin}/test-headers`, {
    method: 'GET',
  });
  assert(response5.status === 200);
  /**
   * @type {any}
   */
  const body5 = await response5.json();
  assert(body5 instanceof Object);
  assert(body5.method === 'get');
  assert(body5.headers instanceof Object);
  assert(body5.headers.host === 'localhost:8080');

  const response6 = await fetch(`${origin}/test-json-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert(response6.status === 200);

  const response7 = await fetch(`${origin}/test-json-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foo: 'bar' }),
  });
  /**
   * @type {any}
   */
  const body7 = await response7.json();
  assert(response7.status === 200);
  assert(body7 instanceof Object);
  assert(body7.method === 'post');
  assert(body7.json instanceof Object);
  assert(body7.json.foo === 'bar');

  // avoid dropping requests from other threads
  await proc.sleep(500);

  console.log('TEST OK');

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