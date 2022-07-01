// @ts-check


import postgres from 'postgres';
import luxon from 'luxon';
import { assert } from './assert.mjs';

/**
 * @param {string} host
 * @param {number} port
 * @param {string} username
 * @param {string} password
 * @param {string} database
 */
export const connect = (host, port, username, password, database) => {
  assert(typeof host === 'string');
  assert(typeof port === 'number');
  assert(typeof username === 'string');
  assert(typeof password === 'string');
  assert(typeof database === 'string');
  const config = {
    host,
    port,
    username,
    password,
    database,
    max: 16,
    idle_timeout: 0,
    types: { // https://github.com/porsager/postgres/issues/161#issuecomment-801031062
      date: {
        to: 1184,
        from: [1082, 1083, 1114, 1184],
        serialize: (value) => value,
        parse: (value) => luxon.DateTime.fromSQL(value).toISO(),
      },
    },
  };
  const pg = postgres(config);
  const pg_encode = pg;
  const pg_encode_array = pg.array;
  return { pg, pg_encode, pg_encode_array };
};

