// @ts-check

// References:
// - https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md
// - https://redis.io/docs/reference/protocol-spec/
// - https://redis.io/docs/manual/pubsub/
// - https://redis.io/docs/manual/client-side-caching/
// - https://redis.io/commands/client-tracking/
// - https://github.com/joshxyzhimself/endpoint/blob/master/core/bytearray.js

/**
 * @typedef {import('./redis').client} client
 * @typedef {import('./redis').record} record
 */

import net from 'net';
import { EventEmitter } from 'events';
import { assert } from './assert.mjs';

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
 * @param {client} client
 * @param {string} command
 * @param  {string[]} parameters
 * @returns {Promise<any>}
 */
export const exec = (client, command, ...parameters) => new Promise((resolve, reject) => {
  assert(typeof command === 'string');
  parameters.forEach((parameter) => {
    assert(typeof parameter === 'string');
  });
  client.connection.write(encode([command, ...parameters]));
  client.records.push({ resolve, reject, command, parameters });
});

/**
 * @param {client} client
 */
const hello = (client) => new Promise((resolve, reject) => {
  client.connection.write('HELLO 3\r\n');
  client.records.push({ resolve, reject });
});

const char_codes = {
  cr: '\r'.charCodeAt(0),
  lf: '\n'.charCodeAt(0),
  simple_string: '+'.charCodeAt(0),
  simple_error: '-'.charCodeAt(0),
  binary_safe_string: '$'.charCodeAt(0),
  binary_safe_error: '!'.charCodeAt(0),
  integer: ':'.charCodeAt(0),
  array: '*'.charCodeAt(0),
  map: '%'.charCodeAt(0),
  set: '~'.charCodeAt(0),
  null: '_'.charCodeAt(0),
  push: '>'.charCodeAt(0),
};

const offset = Symbol('offset');
const push = Symbol('offset');

/**
 * @param {Buffer} buffer
 */
const decode = (buffer) => {

  if (buffer[offset] === undefined) {
    buffer[offset] = -1;
  }

  buffer[offset] += 1;

  const type_char_code = buffer[buffer[offset]];

  switch (type_char_code) {
    case char_codes.binary_safe_string: {
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      buffer[offset] += 2;
      const value = buffer.subarray(buffer[offset], buffer[offset] += length).toString();
      buffer[offset] += 1;
      return value;
    }
    case char_codes.binary_safe_error: {
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      buffer[offset] += 2;
      const value = new Error(buffer.subarray(buffer[offset], buffer[offset] += length).toString());
      buffer[offset] += 1;
      return value;
    }
    case char_codes.simple_string: {
      const value_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const value = buffer.subarray(value_offset, buffer[offset]).toString();
      buffer[offset] += 1;
      return value;
    }
    case char_codes.simple_error: {
      const value_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const value = new Error(buffer.subarray(value_offset, buffer[offset]).toString());
      buffer[offset] += 1;
      return value;
    }
    case char_codes.integer: {
      const value_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const value = Number(buffer.subarray(value_offset, buffer[offset]).toString());
      buffer[offset] += 1;
      return value;
    }
    case char_codes.map: {
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      buffer[offset] += 1;
      const value = {};
      for (let i = 0, l = length; i < l; i += 1) {
        const k = decode(buffer);
        const v = decode(buffer);
        value[k] = v;
      }
      return value;
    }
    case char_codes.array: {
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      buffer[offset] += 1;
      const value = new Array(length);
      for (let i = 0, l = length; i < l; i += 1) {
        const v = decode(buffer);
        value[i] = v;
      }
      return value;
    }
    case char_codes.set: {
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      buffer[offset] += 1;
      const value = new Array(length);
      for (let i = 0, l = length; i < l; i += 1) {
        const v = decode(buffer);
        value[i] = v;
      }
      return value;
    }
    case char_codes.null: {
      buffer[offset] += 2;
      return null;
    }
    case char_codes.push: {
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      buffer[offset] += 1;
      const value = new Array(length);
      for (let i = 0, l = length; i < l; i += 1) {
        const v = decode(buffer);
        value[i] = v;
      }
      value[push] = true;
      return value;
    }
    default: {
      throw new Error(`Unhandled type; code ${type_char_code}; char ${String.fromCharCode(type_char_code)}.`);
    }
  }

};

/**
 * @param {string} host
 * @param {number} port
 */
export const connect = (host, port) => {

  const connection = net.createConnection(port, host);
  const events = new EventEmitter();

  /**
   * @type {record[]}
   */
  const records = [];

  /**
   * @type {import('./redis').client}
   */
  const client = { connection, events, records };

  connection.setNoDelay(true)
    .setKeepAlive(true)
    .on('connect', async () => {
      await hello(client);
    })
    .on('data', (data) => {

      const response = decode(data);

      if (response instanceof Object) {
        if (response['server'] === 'redis' && response['proto'] === 3) {
          events.emit('ready', response);
        }
      }

      if (response instanceof Array) {
        if (response[push] === true) {
          const event = response[0];
          switch (event) {
            case 'message': {
              const event_channel = response[1];
              const event_data = response[2];
              events.emit(event, event_channel, event_data);
              return;
            }
            case 'invalidate': {
              const event_key = response[1];
              events.emit(event, event_key);
              return;
            }
            default: {
              break;
            }
          }
        }
      }

      assert(records.length > 0);

      const { resolve, reject } = records.shift();
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

  return client;
};
