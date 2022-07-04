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
 * @type {import('./postgres').drop_table<any>}
 */
const drop_table = async (sql, table) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  await sql`DROP TABLE IF EXISTS ${sql(table.name)} CASCADE;`;
};

/**
 * @type {import('./postgres').create_table<any>}
 */
const create_table = async (sql, table) => {
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
    if (typeof column.references === 'string') {
      parameters.push(`REFERENCES ${encode_name(column.references)}`);
    }
    return parameters.join(' ');
  }).join(', ');
  await sql.unsafe(`CREATE TABLE ${encode_name(table.name)} (${columns});`);
};

/**
 * @type {import('./postgres').validate_item<any>}
 */
const validate_item = (table, item, creating) => {
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
            if (creating === true) {
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
 * @type {import('./postgres').create_items<any>}
 */
const create_items = async (sql, table, items) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(items instanceof Array);
  items.forEach((item) => {
    validate_item(table, item, true);
  });
  const column_names = table.columns.filter((column) => column.type !== 'serial').map((column) => column.name);
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
 * @type {import('./postgres').read_items<any>}
 */
const read_items = async (sql, table, limit, offset) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof limit === 'number');
  assert(typeof offset === 'number');
  const items = await sql`SELECT * FROM ${sql(table.name)} LIMIT ${limit} OFFSET ${offset};`;
  return items;
};

/**
 * @type {import('./postgres').read_items_where<any>}
 */
const read_items_where = async (sql, table, name, operator, value, limit, offset) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof name === 'string');
  assert(typeof operator === 'string');
  assert(typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number' || value === null);
  assert(typeof limit === 'number');
  assert(typeof offset === 'number');
  const existing = table.columns.find((column) => column.name === name);
  assert(existing instanceof Object);
  assert(table.operators.has(operator) === true);
  if (value === null) {
    assert(operator === 'IS' || operator === 'IS NOT');
  }

  /**
   * @type {postgres.RowList<postgres.Row[]>}
   */
  let items = null;

  switch (operator) {
    case 'IS': {
      assert(typeof value === 'boolean' || value === null);
      switch (value) {
        case true: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS TRUE')} LIMIT ${limit} OFFSET ${offset};`;
          break;
        }
        case false: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS FALSE')} LIMIT ${limit} OFFSET ${offset};`;
          break;
        }
        case null: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NULL')} LIMIT ${limit} OFFSET ${offset};`;
          break;
        }
        default: {
          break;
        }
      }
      break;
    }
    case 'IS NOT': {
      assert(typeof value === 'boolean' || value === null);
      switch (value) {
        case true: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NOT TRUE')} LIMIT ${limit} OFFSET ${offset};`;
          break;
        }
        case false: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NOT FALSE')} LIMIT ${limit} OFFSET ${offset};`;
          break;
        }
        case null: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NOT NULL')} LIMIT ${limit} OFFSET ${offset};`;
          break;
        }
        default: {
          break;
        }
      }
      break;
    }
    default: {
      items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get(operator)} ${value} LIMIT ${limit} OFFSET ${offset};`;
      break;
    }
  }

  return items;
};

/**
 * @type {import('./postgres').read_item<any>}
 */
const read_item = async (sql, table, id) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof id === 'number');
  const items = await sql`SELECT * FROM ${sql(table.name)} WHERE "id" = ${id} LIMIT 1;`;
  assert(items instanceof Array);
  const [item] = items;
  if (item instanceof Object) {
    return item;
  }
  return null;
};

/**
 * @type {import('./postgres').read_item_where<any>}
 */
const read_item_where = async (sql, table, name, operator, value) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof name === 'string');
  assert(typeof operator === 'string');
  assert(typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number' || value === null);
  const existing = table.columns.find((column) => column.name === name);
  assert(existing instanceof Object);
  assert(table.operators.has(operator) === true);
  if (value === null) {
    assert(operator === 'IS' || operator === 'IS NOT');
  }

  /**
   * @type {postgres.RowList<postgres.Row[]>}
   */
  let items = null;

  switch (operator) {
    case 'IS': {
      assert(typeof value === 'boolean' || value === null);
      switch (value) {
        case true: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS TRUE')} LIMIT 1;`;
          break;
        }
        case false: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS FALSE')} LIMIT 1;`;
          break;
        }
        case null: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NULL')} LIMIT 1;`;
          break;
        }
        default: {
          break;
        }
      }
      break;
    }
    case 'IS NOT': {
      assert(typeof value === 'boolean' || value === null);
      switch (value) {
        case true: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NOT TRUE')} LIMIT 1;`;
          break;
        }
        case false: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NOT FALSE')} LIMIT 1;`;
          break;
        }
        case null: {
          items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get('IS NOT NULL')} LIMIT 1;`;
          break;
        }
        default: {
          break;
        }
      }
      break;
    }
    default: {
      items = await sql`SELECT * FROM ${sql(table.name)} WHERE ${sql(name)} ${table.operators.get(operator)} ${value} LIMIT 1;`;
      break;
    }
  }

  assert(items instanceof Array);
  const [item] = items;
  if (item instanceof Object) {
    return item;
  }
  return null;
};

/**
 * @type {import('./postgres').update_item<any>}
 */
const update_item = async (sql, table, item) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  validate_item(table, item, false);
  const column_names = table.columns.filter((column) => column.type !== 'serial').map((column) => column.name);
  const updated_items = await sql`UPDATE ${sql(table.name)} SET ${sql(item, ...column_names)} WHERE "id" = ${item.id} RETURNING *`;
  assert(updated_items instanceof Array);
  assert(updated_items.length === 1);
  const [updated_item] = updated_items;
  validate_item(table, updated_item, false);
  Object.assign(item, updated_item);
  return item;
};

/**
 * @type {import('./postgres').delete_item<any>}
 */
const delete_item = async (sql, table, id) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof id === 'number');
  await sql`DELETE FROM ${sql(table.name)} WHERE "id" = ${id};`;
  return null;
};

/**
 * @type {import('./postgres').assign_table_methods<any>}
 */
export const assign_table_methods = (sql, table) => {

  // https://www.postgresql.org/docs/14/functions-comparison.html
  const operators = new Map([
    ['<', sql`<`],
    ['>', sql`>`],
    ['<=', sql`<=`],
    ['>=', sql`>=`],
    ['=', sql`=`],
    ['<>', sql`<>`],
    ['!=', sql`!=`],
    ['IS', sql`IS`],
    ['IS TRUE', sql`IS TRUE`],
    ['IS FALSE', sql`IS FALSE`],
    ['IS NULL', sql`IS NULL`],
    ['IS NOT', sql`IS NOT`],
    ['IS NOT TRUE', sql`IS NOT TRUE`],
    ['IS NOT FALSE', sql`IS NOT FALSE`],
    ['IS NOT NULL', sql`IS NOT NULL`],
  ]);

  /**
   * @type {import('./postgres').properties}
   */
  const properties = {
    operators,
    sql,
  };
  Object.assign(table, properties);

  /**
   * @type {import('./postgres').methods<any>}
   */
  const methods = {
    drop_table: () => drop_table(sql, table),
    create_table: () => create_table(sql, table),
    create_items: (items) => create_items(sql, table, items),
    read_items: (limit, offset) => read_items(sql, table, limit, offset),
    read_items_where: (name, operator, value, limit, offset) => read_items_where(sql, table, name, operator, value, limit, offset),
    read_item: (id) => read_item(sql, table, id),
    read_item_where: (name, operator, value) => read_item_where(sql, table, name, operator, value),
    update_item: (item) => update_item(sql, table, item),
    delete_item: (id) => delete_item(sql, table, id),
  };

  Object.assign(table, methods);

};

/**
 * @type {import('./postgres').connect}
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