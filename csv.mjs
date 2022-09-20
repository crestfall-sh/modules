// @ts-check

// RFC 4180: Common Format and MIME Type for Comma-Separated Values (CSV) Files
// - https://datatracker.ietf.org/doc/html/rfc4180

// Implementation notes:
// - the last row emits last when the csv does not end with CRLF and we append it for parsing, this is OK.

import fs from 'fs';
import assert from 'assert';
import { EventEmitter } from 'events';

const cr = '\r'.charCodeAt(0);
const lf = '\n'.charCodeAt(0);
const double_quote = '"'.charCodeAt(0);
const comma_char_code = ','.charCodeAt(0);

/**
 * @param {string} file_path - csv absolute file path
 * @param {number} high_water_mark - amount of bytes to buffer
 * @param {string} [delimiter] defaults to comma
 * @return {import('./csv').emitter & EventEmitter}
 */
export const read_csv = (file_path, high_water_mark, delimiter) => {
  assert(typeof file_path === 'string');
  assert(typeof high_water_mark === 'number');
  if (typeof delimiter === 'string') {
    assert(delimiter.length === 1);
  }
  assert(fs.existsSync(file_path) === true);

  const delimiter_char_code = typeof delimiter === 'string' ? delimiter.charCodeAt(0) : comma_char_code;

  const emitter = new EventEmitter();

  // low highWaterMark lets us simulate a large csv
  const stream = fs.createReadStream(file_path, { highWaterMark: high_water_mark });

  /**
   * @type {Buffer}
   */
  let leftover = null;

  /**
   * @type {import('./csv').row[]}
   */
  let rows = [];

  /**
   * @param {Buffer} data
   */
  const parse = (data) => {

    assert(data instanceof Buffer);

    /**
     * @type {number}
     */
    let row_start = null;

    /**
      * @type {number}
      */
    let column_start = null;

    /**
     * @type {string[]}
     */
    let columns = [];

    let inside_double_quotes = false;

    let column_enclosed = false;

    for (let i = 0, l = data.length; i < l; i += 1) {

      if (row_start === null) {
        row_start = i;
      }

      if (column_start === null) {
        column_start = i;
      }

      const char_code = data[i];

      if (char_code === double_quote) {
        if (inside_double_quotes === true) {
          inside_double_quotes = false;
          column_enclosed = true;
        } else {
          if (column_start === i) {
            inside_double_quotes = true;
          }
        }
      }

      if (inside_double_quotes === false) {
        if (char_code === delimiter_char_code) {
          if (column_enclosed === true) {
            column_start += 1;
          }
          const column_end = column_enclosed === true ? i - 1 : i;
          const column_value = data.subarray(column_start, column_end).toString();
          columns.push(column_value);
          column_start = null;
          column_enclosed = false;
        }
        if (char_code === cr) {
          const next_char_code = data[i + 1];
          if (next_char_code === lf) {
            if (column_enclosed === true) {
              column_start += 1;
            }
            const column_end = column_enclosed === true ? i - 1 : i;
            const column_value = data.subarray(column_start, column_end).toString();
            columns.push(column_value);
            column_start = null;
            column_enclosed = false;
            const row_end = i;
            const row_value = data.subarray(row_start, row_end).toString();
            const row = { value: row_value, columns };
            rows.push(row);
            row_start = null;
            columns = [];
            i += 1;
          }
        }
      }

    }

    if (typeof row_start === 'number') {
      leftover = data.subarray(row_start);
      row_start = null;
    } else {
      leftover = null;
    }

    if (stream.readableEnded === false) {
      stream.pause();
    }
  };

  stream.on('pause', () => {
    emitter.emit('rows', rows);
    rows = [];
  });

  stream.on('data', (chunk) => {
    if (typeof chunk === 'string') {
      return;
    }
    const data = leftover instanceof Buffer ? Buffer.concat([leftover, chunk]) : chunk;
    parse(data);
  });

  stream.on('end', () => {
    if (leftover instanceof Buffer) {
      if (leftover[leftover.length - 2] === cr && leftover[leftover.length - 1] === lf) {
        parse(leftover);
      } else {
        parse(Buffer.concat([leftover, Buffer.from([cr, lf])]));
      }
      leftover = null;
    }
    if (rows.length > 0) {
      emitter.emit('rows', rows);
    }
    emitter.emit('end');
  });

  emitter.on('resume', () => {
    if (stream.readableEnded === false) {
      stream.resume();
    }
  });

  emitter.on('destroy', () => {
    stream.destroy();
  });

  return emitter;

};