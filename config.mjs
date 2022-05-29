// @ts-check

import fs from 'fs';
import path from 'path';

const app_config_path = path.join(process.cwd(), 'config.json');

/**
 * @type {import('./config').config}
 */
export const config = JSON.parse(fs.readFileSync(app_config_path, { encoding: 'utf-8' }));