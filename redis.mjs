// @ts-check

// References:
// - https://redis.io/docs/reference/protocol-spec/
// - https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md

import net from 'net';
import events from 'events';
import { assert } from './assert.mjs';

export const settings = {
  username: null,
  password: null,
};

/**
 * @type {net.Socket}
 */
let connection = null;

const emitter = new events();

const history = [];

const execute = (command, ...parameters) => new Promise((resolve, reject) => {
  connection.write(command);
  history.push([resolve, reject, command, ...parameters]);
});

const hello = async () => {
  let command = 'HELLO 3';
  if (typeof settings.username === 'string' && typeof settings.password === 'string') {
    command += ` AUTH ${settings.username} ${settings.password}`;
  }
  command += '\r\n';
  await execute(command);
};

const get_char_code = (s) => s.charCodeAt(0);

const asd = {
  simpleString: get_char_code('+'),
  simpleError: get_char_code('-'),
  blobString: get_char_code('$'),
  blobError: get_char_code('!'),
  double: get_char_code(','),
  number: get_char_code(':'),
  null: get_char_code('_'),
  boolean: get_char_code('#'),
  true: get_char_code('t'),
  false: get_char_code('f'),
  array: get_char_code('*'),
  push: get_char_code('>'),
  map: get_char_code('%'),
  mapkey: get_char_code('+'),
};

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
  console.log(`decode: ${buffer[offset]}`);
  console.log('next preview:');
  console.log(buffer.subarray(buffer[offset]).toString());
  const type_char_code = buffer[buffer[offset]];

  console.log({ type_char_code });

  switch (type_char_code) {
    case char_codes.bulk_string: {
      console.log('type: bulk_string');
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      console.log({ length });
      buffer[offset] += 2;
      const value = buffer.subarray(buffer[offset], buffer[offset] += length).toString();
      console.log({ value });
      buffer[offset] += 1;
      return value;
    }
    case char_codes.integer: {
      console.log('type: integer');
      const value_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const value = Number(buffer.subarray(value_offset, buffer[offset]).toString());
      console.log({ value });
      buffer[offset] += 1;
      return value;
    }
    case char_codes.map: {
      console.log('type: map');
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      console.log({ length });
      buffer[offset] += 1;
      const value = {};
      for (let i = 0, l = length; i < l; i += 1) {
        const k = decode(buffer);
        const v = decode(buffer);
        console.log({ i, k, v });
        value[k] = v;
      }
      return value;
    }
    case char_codes.array: {
      console.log('type: array');
      const length_offset = buffer[offset] += 1;
      while (buffer[buffer[offset]] !== char_codes.cr && buffer[buffer[offset]] !== char_codes.lf) {
        buffer[offset] += 1;
      }
      const length = Number(buffer.subarray(length_offset, buffer[offset]).toString());
      console.log({ length });
      buffer[offset] += 1;
      const value = new Array(length);
      for (let i = 0, l = length; i < l; i += 1) {
        const v = decode(buffer);
        console.log({ i, v });
        value[i] = v;
      }
      return value;
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
const connect = (host, port) => {

  connection = net.createConnection(port, host)
    .setNoDelay(true)
    .setKeepAlive(true)
    .on('connect', async () => {
      emitter.emit('connect');
      const response = await hello();
      emitter.emit('ready', response);
    })
    .on('data', (data) => {
      console.log('> > > > data:');
      console.log(data.toString());
      const response = decode(data);
      console.log({ response });
    })
    .on('close', (...parameters) => {
      console.log('UNHANDLED EVENT CLOSE', parameters);
    })
    .on('error', (error) => {
      console.log('UNHANDLED EVENT ERROR', error);
    })
    .on('end', (...parameters) => {
      console.log('UNHANDLED EVENT END', parameters);
    });
};

process.nextTick(async () => {
  connect('localhost', 6379);
});