// @ts-check

import postgres from 'postgres';
import luxon from 'luxon';
import { assert } from './assert.mjs';

/**
 * @type {[RegExp, string]}
 */
const rx_single_quote = [/'/g, '\''];

/**
  * @type {[RegExp, string]}
  */
const rx_double_quote = [/"/g, '\\"'];

/**
  * @type {[RegExp, string]}
  */
const rx_backslash = [/\\/g, '\\\\'];

/**
  * @param {string} value
  */
const escape = (value) => {
  assert(typeof value === 'string');
  return value.replace(rx_single_quote[0], rx_single_quote[1])
    .replace(rx_double_quote[0], rx_double_quote[1])
    .replace(rx_backslash[0], rx_backslash[1]);
};

/**
  * @param {string} value
  */
const encode_name = (value) => {
  assert(typeof value === 'string');
  return `"${escape(value)}"`;
};

/**
  * @param {boolean|string|number} value
  */
const encode_value = (value) => {
  assert(typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number');
  switch (typeof value) {
    case 'boolean': {
      return value;
    }
    case 'string': {
      return `'${escape(value)}'`;
    }
    case 'number': {
      return value;
    }
    default: {
      break;
    }
  }
  return null;
};

/**
 * @type {import('./postgres').drop_table}
 */
export const drop_table = async (sql, table) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  await sql.unsafe(`DROP TABLE IF EXISTS ${encode_name(table.name)} CASCADE;`);
};

/**
 * @type {import('./postgres').create_table}
 */
export const create_table = async (sql, table) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  const columns = table.columns.map((column) => {
    assert(column instanceof Object);
    assert(typeof column.name === 'string');
    assert(typeof column.type === 'string');
    assert(typeof column.primary === 'boolean' || typeof column.primary === 'undefined');
    assert(typeof column.unique === 'boolean' || typeof column.unique === 'undefined');
    assert(typeof column.nullable === 'boolean' || typeof column.nullable === 'undefined');
    assert(typeof column.default === 'string' || typeof column.default === 'undefined');
    assert(typeof column.references === 'string' || typeof column.references === 'undefined');
    const parameters = [encode_name(column.name), column.type];
    if (typeof column.primary === 'boolean' && column.primary === true) {
      parameters.push('PRIMARY KEY');
    }
    if (typeof column.unique === 'boolean' && column.unique === true) {
      parameters.push('UNIQUE');
    }
    if (typeof column.nullable === 'boolean' && column.nullable === true) {
      parameters.push('NULL');
    } else {
      parameters.push('NOT NULL');
    }
    if (typeof column.default === 'string') {
      parameters.push(`DEFAULT ${column.default}`);
    }
    if (typeof column.references === 'string') {
      parameters.push(`REFERENCES ${encode_name(column.references)}`);
    }
    return parameters.join(' ');
  }).join(', ');
  await sql.unsafe(`CREATE TABLE ${encode_name(table.name)} (${columns});`);
};

/**
 * @type {import('./postgres').validate_item}
 */
const validate_item = (table, item, null_id) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(item instanceof Object);
  table.columns.forEach((column) => {
    assert(column instanceof Object);
    assert(typeof column.name === 'string');
    assert(typeof column.type === 'string');
    let nulled = false;
    if (column.nullable === true) {
      if (item[column.name] === null) {
        nulled = true;
      }
    }
    if (nulled === false) {
      switch (column.type) {
        case 'boolean': {
          assert(typeof item[column.name] === 'boolean');
          break;
        }
        case 'uuid': {
          assert(typeof item[column.name] === 'string');
          break;
        }
        case 'text': {
          assert(typeof item[column.name] === 'string');
          break;
        }
        case 'text[]': {
          assert(item[column.name] instanceof Array);
          Array.from(item[column.name]).forEach((value) => {
            assert(typeof value === 'string');
          });
          break;
        }
        case 'smallserial':
        case 'serial': {
          if (column.name === 'id') {
            if (null_id === true) {
              assert(item[column.name] === null);
            } else {
              assert(typeof item[column.name] === 'number');
            }
            break;
          }
          assert(typeof item[column.name] === 'number');
          break;
        }
        case 'smallint':
        case 'integer': {
          assert(typeof item[column.name] === 'number');
          break;
        }
        case 'timestamp': {
          assert(typeof item[column.name] === 'string');
          assert(luxon.DateTime.fromISO(item[column.name]).isValid === true);
          break;
        }
        default: {
          throw new Error(`Unhandled type: ${column.type}`);
        }
      }
    }
  });
};

/**
 * @type {import('./postgres').create_items}
 */
export const create_items = async (sql, table, items) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(items instanceof Array);
  items.forEach((item) => {
    validate_item(table, item, true);
  });
  const column_names = table.columns.filter((column) => column.name !== 'id' && column.type !== 'uuid').map((column) => column.name);
  const created_items = await sql`INSERT INTO ${sql(table.name)} ${sql(items, ...column_names)} RETURNING *`;
  assert(created_items instanceof Array);
  assert(items.length === created_items.length);
  items.forEach((item, index) => {
    const created_item = created_items[index];
    validate_item(table, created_item, false);
    Object.assign(item, created_item);
  });
  return items;
};

/**
 * @type {import('./postgres').read_items}
 */
export const read_items = async (sql, table, limit, offset) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof limit === 'number');
  assert(typeof offset === 'number');
  const items = await sql.unsafe(`SELECT * FROM ${encode_name(table.name)} LIMIT ${limit} OFFSET ${offset};`);
  return items;
};

/**
 * @type {import('./postgres').read_items_where}
 */
export const read_items_where = async (sql, table, name, operator, value, limit, offset) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof name === 'string');
  assert(typeof operator === 'string');
  assert(typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number');
  assert(typeof limit === 'number');
  assert(typeof offset === 'number');
  const items = await sql.unsafe(`SELECT * FROM ${encode_name(table.name)} WHERE ${encode_name(name)} ${operator} ${encode_value(value)} LIMIT ${limit} OFFSET ${offset};`);
  return items;
};

/**
 * @type {import('./postgres').read_item}
 */
export const read_item = async (sql, table, id) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof id === 'number');
  const items = await sql.unsafe(`SELECT * FROM ${encode_name(table.name)} WHERE "id" = ${encode_value(id)} LIMIT 1;`);
  assert(items instanceof Array);
  const [item] = items;
  if (item instanceof Object) {
    return item;
  }
  return null;
};

/**
 * @type {import('./postgres').update_item}
 */
export const update_item = async (sql, table, item) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  validate_item(table, item, false);
  const column_names = table.columns.filter((column) => column.name !== 'id' && column.type !== 'uuid').map((column) => column.name);
  const updated_items = await sql`UPDATE ${sql(table.name)} SET ${sql(item, ...column_names)} WHERE "id" = ${item.id} RETURNING *`;
  assert(updated_items instanceof Array);
  assert(updated_items.length === 1);
  const [updated_item] = updated_items;
  validate_item(table, updated_item, false);
  Object.assign(item, updated_item);
  return item;
};

/**
 * @type {import('./postgres').delete_item}
 */
export const delete_item = async (sql, table, id) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof id === 'number');
  await sql.unsafe(`DELETE FROM ${encode_name(table.name)} WHERE "id" = ${encode_value(id)};`);
  return null;
};

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
        serialize: (value) => luxon.DateTime.fromISO(value).toSQL(),
        parse: (value) => luxon.DateTime.fromSQL(value).toISO(),
      },
    },
  };

  const sql = postgres(config);

  return sql;
};

