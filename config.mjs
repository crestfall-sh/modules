// @ts-check

import fs from 'fs';
import path from 'path';
import { assert } from './assert.mjs';

const app_config_path = path.join(process.cwd(), 'config.json');

/**
 * @type {import('./config').config}
 */
export const config = JSON.parse(fs.readFileSync(app_config_path, { encoding: 'utf-8' }));

assert(typeof config.http_hostname === 'string');
assert(typeof config.http_port === 'number');