// @ts-check

import os from 'os';
import url from 'url';
import path from 'path';
import worker_threads from 'worker_threads';
import assert from 'assert';
import * as web from './web.mjs';
import { InternalHeaders } from './web.mjs';

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

const text_file_contents = 'The quick brown fox jumped over the lazy dog.';

const test = async () => {
  try {

    /**
     * @type {import('./web').InternalHeaders}
     */
    const headers = new InternalHeaders([['Cache-Control', 'no-store']]);
    {
      const entries = Array.from(headers.entries());
      assert(entries.length === 1);
      const entry = entries[0];
      assert(entry instanceof Array);
      const [key, value] = entry;
      assert(key === 'cache-control');
      assert(value === 'no-store');
      console.log({ key, value });
    }
    {
      headers.forEach((value, key) => {
        assert(key === 'cache-control');
        assert(value === 'no-store');
        console.log({ key, value });
      });
    }

    console.log({ __filename, __dirname, __cwd, pid: process.pid, wid: worker_threads.threadId });

    const ip = '0.0.0.0';
    const port = 8080;
    const origin = `http://${ip}:${port}`;

    const app = web.uws.App({});

    app.get('/test-html', web.use(async (response) => {
      response.html = test_html;
    }));
    app.get('/test-query', web.use(async (response, request) => {
      response.json = request;
    }));
    app.get('/test-headers', web.use(async (response, request) => {
      response.json = request;
    }));
    app.post('/test-json-post', web.use(async (response, request) => {
      response.json = request;
    }));

    web.serve({
      app,
      include: [{ url: '/', directory: process.cwd(), use_cache: true }],
      exclude: ['/api/'],
      debug: false,
    });

    const token = await web.http(app, web.port_access_types.SHARED, port);

    await new Promise((resolve) => setTimeout(resolve, 100));

    {
      console.log('Test # 1: Start');
      const response = await fetch(`${origin}/test-html`, {
        method: 'GET',
      });
      assert(response.status === 200);
      assert(response.headers.get('Content-Encoding') === null);
      const body = await response.text();
      assert(body === test_html);
      console.log('Test # 1: OK.');
    }

    {
      console.log('Test # 2: Start');
      const response = await fetch(`${origin}/example.txt`, {
        method: 'GET',
      });
      assert(response.status === 200);
      assert(response.headers.get('Content-Encoding') === 'gzip');
      const body = await response.text();
      assert(body === text_file_contents);
      console.log('Test # 2: OK.');
    }

    {
      console.log('Test # 3: Start');
      const response = await fetch(`${origin}/test-query?foo=bar`, {
        method: 'GET',
      });
      assert(response.status === 200);
      /**
       * @type {any}
       */
      const body = await response.json();
      assert(body instanceof Object);
      assert(body.method === 'get');
      assert(body.search_params instanceof Object);
      assert(body.search_params.foo === 'bar');
      console.log('Test # 3: OK.');
    }

    {
      console.log('Test # 4: Start');
      const response = await fetch(`${origin}/test-headers`, {
        method: 'GET',
      });
      assert(response.status === 200);
      /**
       * @type {any}
       */
      const body = await response.json();
      assert(body instanceof Object);
      assert(body.method === 'get');
      assert(body.headers instanceof Object);
      console.log('Test # 4: OK.');
    }
    {
      console.log('Test # 5: Start');
      const response = await fetch(`${origin}/test-json-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      assert(response.status === 200);
      console.log('Test # 5: OK.');
    }
    {
      console.log('Test # 6: Start');
      const response = await fetch(`${origin}/test-json-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foo: 'bar' }),
      });
      /**
       * @type {any}
       */
      const body = await response.json();
      assert(response.status === 200);
      assert(body instanceof Object);
      assert(body.method === 'post');
      assert(body.json instanceof Object);
      assert(body.json.foo === 'bar');
      console.log('Test # 6: OK.');
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    web.uws.us_listen_socket_close(token);

  } catch (e) {
    console.error(e);
    throw e;
  }

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