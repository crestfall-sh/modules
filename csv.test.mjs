// @ts-check

import path from 'path';
import assert from 'assert';
import { read_csv } from './csv.mjs';

/**
 * @param {string} file_path
 * @param {number} total_rows_count
 */
const test = (file_path, total_rows_count) => {

  assert(typeof file_path === 'string');
  assert(typeof total_rows_count === 'number');

  const emitter = read_csv(file_path, 64 * 1024);

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
    assert(rows_count === total_rows_count);
    console.log('end', { rows_count });
  });

  return emitter;

};

process.nextTick(async () => {

  const __cwd = process.cwd();

  // test enclosed columns
  const __csv_3166 = path.join(__cwd, '/3166.csv');
  const __csv_3166_emitter = test(__csv_3166, 250);
  await new Promise((resolve) => __csv_3166_emitter.once('end', resolve));

  // test unenclosed columns
  const __csv_3166_2 = path.join(__cwd, '/3166-2.csv');
  const __csv_3166_2_emitter = test(__csv_3166_2, 3);
  await new Promise((resolve) => __csv_3166_2_emitter.once('end', resolve));

  // test empty columns
  const __csv_3166_3 = path.join(__cwd, '/3166-3.csv');
  const __csv_3166_3_emitter = test(__csv_3166_3, 5);
  await new Promise((resolve) => __csv_3166_3_emitter.once('end', resolve));

});