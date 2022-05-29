// @ts-check


import postgres from 'postgres';
import luxon from 'luxon';
import { assert } from './assert.mjs';
import { config } from './config.mjs';

assert(typeof config.postgresql_host === 'string');
assert(typeof config.postgresql_port === 'number');
assert(typeof config.postgresql_username === 'string');
assert(typeof config.postgresql_password === 'string');
assert(typeof config.postgresql_database === 'string');

export const pg_config = {
  host: config.postgresql_host,
  port: config.postgresql_port,
  username: config.postgresql_username,
  password: config.postgresql_password,
  database: config.postgresql_database,
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

export const pg = postgres(pg_config);
export const pg_escape = pg;
export const pg_array = pg.array;