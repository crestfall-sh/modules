// @ts-check

import os from 'os';
import fs from 'fs';
import url from 'url';
import path from 'path';
import worker_threads from 'worker_threads';
import fetch from 'node-fetch';
import { assert } from './assert.mjs';
import { __dirname } from './constants.mjs';
import * as uwu from './uwu.mjs';
import * as proc from './proc.mjs';

const test_html = `
  <html>
    <body>
      <h4>Hello world!</h4>
    </body>
  </html>
`;

const __filename = url.fileURLToPath(import.meta.url);
const test_file = fs.readFileSync(__filename, { encoding: 'utf-8' });

const test = async () => {
  const port = 8080;
  const origin = `http://localhost:${port}`;
  const app = uwu.uws.App({});


  uwu.create_static_handler(app, '/test-static/', path.join(__dirname, '/'), { file_cache: false });
  uwu.create_static_handler(app, '/test-cached-static/', path.join(__dirname, '/'), { file_cache: true });


  app.get('/test-html', uwu.create_handler(async (response) => {
    response.html = test_html;
  }));
  app.get('/test-headers', uwu.create_handler(async (response, request) => {
    response.json = request;
  }));
  app.post('/test-json-post', uwu.create_handler(async (response, request) => {
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
  console.log('response OK');


  const response2 = await fetch(`${origin}/test-static/uwu.test.mjs`, {
    method: 'GET',
  });
  assert(response2.status === 200);
  assert(response2.headers.get('content-encoding') === null);
  const body2 = await response2.text();
  assert(body2 === test_file);
  console.log('response2 OK');


  const response3 = await fetch(`${origin}/test-cached-static/uwu.test.mjs`, {
    method: 'GET',
  });
  assert(response3.status === 200);
  assert(response3.headers.get('content-encoding') === null);
  const body3 = await response3.text();
  assert(body3 === test_file);
  console.log('response3 OK');


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
  console.log('response4 OK');


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
  console.log('response5 OK');

  // avoid dropping requests from other threads
  await proc.sleep(500);

  uwu.uws.us_listen_socket_close(token);
};

if (worker_threads.isMainThread === true) {
  process.nextTick(async () => {

    // single-thread test
    await test();

    // multi-thread test
    os.cpus().forEach(() => {
      new worker_threads.Worker(__filename);
    });

  });
} else {
  process.nextTick(test);
}