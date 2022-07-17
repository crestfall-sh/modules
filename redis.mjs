// @ts-check

// References:
// - https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md
// - https://redis.io/docs/reference/protocol-spec/
// - https://redis.io/docs/manual/pubsub/
// - https://redis.io/docs/manual/client-side-caching/
// - https://redis.io/commands/client-tracking/
// - https://github.com/joshxyzhimself/endpoint/blob/master/core/bytearray.js

import net from 'net';
import { EventEmitter } from 'events';
import { assert } from './assert.mjs';

const history = [];

/**
 * @param {string|any[]} value
 */
const encode = (value) => {
  if (value instanceof Array) {
    let encoded = `*${value.length}\r\n`;
    const items = value;
    items.forEach((item) => {
      encoded += encode(item);
    });
    return encoded;
  }
  assert(typeof value === 'string');
  const encoded = `$${value.length}\r\n${value}\r\n`;
  return encoded;
};

/**
 * @param {net.Socket} connection
 * @param {string} key
 * @param {string} value
 * @param {(string)[]} parameters
 */
export const set = (connection, key, value, ...parameters) => new Promise((resolve, reject) => {
  connection.write(encode(['SET', key, value, ...parameters]));
  history.push([resolve, reject, key, value]);
});

/**
 * @param {net.Socket} connection
 * @param {string} key
 */
export const get = (connection, key) => new Promise((resolve, reject) => {
  connection.write(encode(['GET', key]));
  history.push([resolve, reject, key]);
});

/**
 * @param {net.Socket} connection
 */
const hello = (connection) => new Promise((resolve, reject) => {
  connection.write('HELLO 3\r\n');
  history.push([resolve, reject]);
});

const char_codes = {
  cr: '\r'.charCodeAt(0),
  lf: '\n'.charCodeAt(0),
  simple_string: '+'.charCodeAt(0),
  simple_error: '-'.charCodeAt(0),
  bulk_string: '$'.charCodeAt(0),
  integer: ':'.charCodeAt(0),
  array: '*'.charCodeAt(0),
  map: '%'.charCodeAt(0),
  map_key: '+'.charCodeAt(0),
  null: '_'.charCodeAt(0),
};

const offset = Symbol('offset');

/**
 * @param {Buffer} buffer
 */
const decode = (buffer) => {

  if (buffer[offset] === undefined) {
    buffer[offset] = -1;
  }

  buffer[offset] += 1;
  // console.log(`decode: ${buffer[offset]}`);
  // console.log('next preview:');
  // console.log(buffer.subarray(buffer[offset]).toString());

  const type_char_code = buffer[buffer[offset]];
  // console.log({ type_char_code });

  switch (type_char_code) {
    case char_codes.bulk_string: {
      // console.log('type: bulk_string');
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      // console.log({ length });
      buffer[offset] += 2;
      const value = buffer.subarray(buffer[offset], buffer[offset] += length).toString();
      // console.log({ value });
      buffer[offset] += 1;
      return value;
    }
    case char_codes.simple_string: {
      // console.log('type: simple_string');
      const value_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const value = buffer.subarray(value_offset, buffer[offset]).toString();
      // console.log({ value });
      buffer[offset] += 1;
      return value;
    }
    case char_codes.simple_error: {
      // console.log('type: simple_error');
      const value_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const value = new Error(buffer.subarray(value_offset, buffer[offset]).toString());
      // console.log({ value });
      buffer[offset] += 1;
      return value;
    }
    case char_codes.integer: {
      // console.log('type: integer');
      const value_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const value = Number(buffer.subarray(value_offset, buffer[offset]).toString());
      // console.log({ value });
      buffer[offset] += 1;
      return value;
    }
    case char_codes.map: {
      // console.log('type: map');
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      // console.log({ length });
      buffer[offset] += 1;
      const value = {};
      for (let i = 0, l = length; i < l; i += 1) {
        const k = decode(buffer);
        const v = decode(buffer);
        // console.log({ i, k, v });
        value[k] = v;
      }
      return value;
    }
    case char_codes.array: {
      // console.log('type: array');
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      // console.log({ length });
      buffer[offset] += 1;
      const value = new Array(length);
      for (let i = 0, l = length; i < l; i += 1) {
        const v = decode(buffer);
        // console.log({ i, v });
        value[i] = v;
      }
      return value;
    }
    case char_codes.null: {
      buffer[offset] += 2;
      return null;
    }
    default: {
      console.log(`unhandled type ${type_char_code} ${String.fromCharCode(type_char_code)}`);
      return null;
    }
  }

};

/**
 * @param {string} host
 * @param {number} port
 */
export const connect = (host, port) => {

  const events = new EventEmitter();

  const connection = net.createConnection(port, host)
    .setNoDelay(true)
    .setKeepAlive(true)
    .on('connect', async () => {
      events.emit('connected');
      await hello(connection);
    })
    .on('data', (data) => {

      const response = decode(data);

      if (response instanceof Object) {
        if (response['server'] === 'redis' && response['proto'] === 3) {
          events.emit('ready', response);
        }
      }

      assert(history.length > 0);

      const [resolve, reject] = history.shift();
      if (response instanceof Error) {
        reject(response);
      } else {
        resolve(response);
      }

    })
    .on('close', (had_error) => {
      events.emit('close', had_error);
    })
    .on('error', (error) => {
      events.emit('error', error);
    })
    .on('end', () => {
      events.emit('end');
    });

  const client = { connection, events };

  return client;
};
