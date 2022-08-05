// @ts-check

import os from 'os';
import fs from 'fs';
import url from 'url';
import path from 'path';
import * as uwu from './uwu.mjs';
import { assert } from 'console';

const __cwd = process.cwd();
const __file = path.join(__cwd, 'dog.png');
assert(fs.existsSync(__file) === true);

process.nextTick(async () => {

  const port = 8080;
  const origin = `http://localhost:${port}`;
  const app = uwu.uws.App({});

  app.get('/test-stream', uwu.use_middlewares(async (response) => {
    response.stream = fs.createReadStream(__file);
    response.file_path = __file;
  }));

  const token = await uwu.serve_http(app, uwu.port_access_types.SHARED, port);

  // uwu.uws.us_listen_socket_close(token);

});