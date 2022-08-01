// @ts-check

import path from 'path';
import assert from 'assert';
import { read_csv } from './csv.mjs';

process.nextTick(async () => {
  const __cwd = process.cwd();
  const __csv = path.join(__cwd, '/3166.csv');
  const emitter = read_csv(__csv, 64 * 1024);
  let rows_count = 0;
  emitter.on('rows', async (rows) => {
    assert(rows instanceof Array);
    rows.forEach((row) => {
      assert(row instanceof Object);
      assert(typeof row.value === 'string');
      assert(row.columns instanceof Array);
      assert(row.columns.length === 5);
    });
    rows_count += rows.length;
    console.log('rows', { rows_count });
    emitter.emit('resume');
  });
  emitter.on('end', () => {
    assert(rows_count === 250);
    console.log('end', { rows_count });
  });
});