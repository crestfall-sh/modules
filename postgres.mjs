// @ts-check

// https://www.postgresql.org/docs/14/functions-comparison.html

import postgres from 'postgres';
import * as luxon from 'luxon';
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
 * @type {import('./postgres').insert<any>}
 */
const insert = async (sql, table, items, options) => {
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
  for (let i = 0, l = items.length; i < l; i += 1) {
    const item = items[i];
    const created_item = created_items[i];
    validate_item(table, created_item, false);
    Object.assign(item, created_item);
    if (options instanceof Object) {
      if (options.hydrate === true) {
        if (table.hydrate instanceof Function) {
          await table.hydrate(item);
        }
      }
      if (options.cleanup === true) {
        if (table.cleanup instanceof Function) {
          await table.cleanup(item);
        }
      }
    }
  }
  if (table.on_insert instanceof Function) {
    process.nextTick(table.on_insert, items);
  }
  return items;
};

/**
 * @type {import('./postgres').select<any>}
 */
const select = async (sql, table, options) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(options instanceof Object);
  if (typeof options.where === 'string') {
    // left-hand operand, column, must exist.
    const existing = table.columns.find((column) => column.name === options.where);
    assert(existing instanceof Object);
    // right-hand operand must only be one value, not zero, not more than one.
    const operands = [options.eq, options.neq, options.gt, options.gte, options.lt, options.lte, options.is, options.is_not];
    assert(operands.filter((value) => typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number' || value === null).length === 1);
  }
  if (typeof options.ascend === 'string') {
    // descend must not co-exist with ascend.
    assert(typeof options.descend === 'undefined');
  }
  if (typeof options.descend === 'string') {
    // ascend must not co-exist with descend.
    assert(typeof options.ascend === 'undefined');
  }
  const none = sql``;
  const filter = sql`
    ${ typeof options.where === 'string' ? sql` WHERE ${sql(options.where)} 
      ${ typeof options.eq === 'boolean' || typeof options.eq === 'string' || typeof options.eq === 'number' ? sql` = ${options.eq}` : none }
      ${ typeof options.neq === 'boolean' || typeof options.neq === 'string' || typeof options.neq === 'number' ? sql` != ${options.neq}` : none }
      ${ typeof options.gt === 'number' ? sql` < ${options.gt}` : none }
      ${ typeof options.gte === 'number' ? sql` <= ${options.gte}` : none }
      ${ typeof options.lt === 'number' ? sql` > ${options.lt}` : none }
      ${ typeof options.lte === 'number' ? sql` >= ${options.lte}` : none }
      ${ options.is === true ? sql` IS TRUE` : none }
      ${ options.is === false ? sql` IS FALSE` : none }
      ${ options.is === null ? sql` IS NULL` : none }
      ${ options.is_not === true ? sql` IS NOT TRUE` : none }
      ${ options.is_not === false ? sql` IS NOT FALSE` : none }
      ${ options.is_not === null ? sql` IS NOT NULL` : none }
    ` : none }
  `;
  const sort = sql`
    ${ typeof options.ascend === 'string' ? sql` ORDER BY ${sql(options.ascend)} ASC` : none }
    ${ typeof options.descend === 'string' ? sql` ORDER BY ${sql(options.descend)} DESC` : none }
  `;
  const pagination = sql`
    ${ typeof options.limit === 'number' ? sql` LIMIT ${options.limit}` : none }
    ${ typeof options.offset === 'number' ? sql` OFFSET ${options.offset}` : none }
  `;

  const items = await sql`
    SELECT * FROM ${sql(table.name)} ${filter} ${sort} ${pagination};
  `;
  assert(items instanceof Array);
  for (let i = 0, l = items.length; i < l; i += 1) {
    const item = items[i];
    validate_item(table, item, false);
    // optional hydration of items
    if (options.hydrate === true) {
      if (table.hydrate instanceof Function) {
        await table.hydrate(item);
      }
    }
    // optional cleanup of items
    if (options.cleanup === true) {
      if (table.cleanup instanceof Function) {
        await table.cleanup(item);
      }
    }
  }

  const select_response = { items, count: null, explain: null };

  if (options.count === true) {
    const count_rows = await sql`
      SELECT COUNT(*) FROM ${sql(table.name)} ${filter};
    `;
    assert(count_rows instanceof Array);
    const count_row = count_rows[0];
    assert(count_row instanceof Object);
    assert(typeof count_row.count === 'string');
    const items_count = Number(count_row.count);
    assert(typeof items_count === 'number');
    assert(Number.isFinite(items_count) === true);
    select_response.count = items_count;
  }

  if (options.explain === true) {
    const explain = await sql`
      EXPLAIN SELECT * FROM ${sql(table.name)} ${filter} ${sort} ${pagination};
    `;
    assert(explain instanceof Array);
    select_response.explain = explain;
  }

  return select_response;
};

/**
 * @type {import('./postgres').first<any>}
 */
const first = async (sql, table, options) => {
  const { items } = await select(sql, table, { limit: 1, ...options });
  assert(items instanceof Array);
  const [item] = items;
  if (item instanceof Object) {
    validate_item(table, item, false);
    return item;
  }
  return null;
};

/**
 * @type {import('./postgres').update<any>}
 */
const update = async (sql, table, item, options) => {
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
  if (options instanceof Object) {
    if (options.hydrate === true) {
      if (table.hydrate instanceof Function) {
        await table.hydrate(item);
      }
    }
    if (options.cleanup === true) {
      if (table.cleanup instanceof Function) {
        await table.cleanup(item);
      }
    }
  }
  if (table.on_update instanceof Function) {
    process.nextTick(table.on_update, item);
  }
  return item;
};

/**
 * @type {import('./postgres').remove<any>}
 */
const remove = async (sql, table, id) => {
  assert(table instanceof Object);
  assert(typeof table.name === 'string');
  assert(table.columns instanceof Array);
  assert(typeof id === 'number');
  await sql`DELETE FROM ${sql(table.name)} WHERE "id" = ${id};`;
  if (table.on_remove instanceof Function) {
    process.nextTick(table.on_remove, id);
  }
  return null;
};

/**
 * @type {import('./postgres').assign_table_methods}
 */
export const assign_table_methods = (sql, table) => {

  /**
   * @type {import('./postgres').properties}
   */
  const properties = { sql };
  Object.assign(table, properties);

  /**
   * @type {import('./postgres').methods<any>}
   */
  const methods = {
    drop_table: () => drop_table(sql, table),
    create_table: () => create_table(sql, table),
    insert: (items, options) => insert(sql, table, items, options),
    select: (options) => select(sql, table, options),
    first: (options) => first(sql, table, options),
    update: (item, options) => update(sql, table, item, options),
    remove: (id) => remove(sql, table, id),
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