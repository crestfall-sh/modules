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
  const query = `DROP TABLE IF EXISTS "${table.name}" CASCADE;`;
  await sql.unsafe(query);
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
    assert(typeof column.parameters === 'string');
    return `"${column.name}" ${column.type} ${column.parameters}`;
  }).join(', ');
  const query = `CREATE TABLE "${table.name}" (${columns});`;
  await sql.unsafe(query);
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
    switch (column.type) {
      case 'boolean': {
        assert(typeof item[column.name] === 'boolean');
        break;
      }
      case 'uuid': {
        if (column.name === 'id') {
          if (null_id === true) {
            assert(item[column.name] === null);
          } else {
            assert(typeof item[column.name] === 'string');
          }
          break;
        }
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
      case 'double precision': {
        assert(typeof item[column.name] === 'number');
        break;
      }
      default: {
        throw new Error(`Unhandled type: ${column.type}`);
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
  assert(typeof id === 'string');
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
  assert(typeof id === 'string');
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
        serialize: (value) => value,
        parse: (value) => luxon.DateTime.fromSQL(value).toISO(),
      },
    },
  };

  const sql = postgres(config);

  return sql;
};

