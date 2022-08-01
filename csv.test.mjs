// @ts-check

import path from 'path';
import { read_csv } from './csv.mjs';

process.nextTick(async () => {
  const __cwd = process.cwd();
  const __csv = path.join(__cwd, '/3166.csv');
  const emitter = read_csv(__csv, 64 * 1024);
  emitter.on('rows', async (rows) => {
    console.log(`rows: ${rows.length}`);
    console.log(`last row: ${rows[rows.length - 1].value}`);
    emitter.emit('resume');
  });
});