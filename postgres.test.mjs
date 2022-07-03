// @ts-check

/**
 * @typedef {import('./postgresql.test').user} user
 */

import * as luxon from 'luxon';
import { assert } from './assert.mjs';
import * as postgres from './postgres.mjs';

process.nextTick(async () => {

  const sql = postgres.connect('localhost', 5432, 'postgres', 'postgres', 'postgres');

  const select_version = await sql`
    SELECT version();
  `;
  console.log({ select_version });

  /**
   * @type {import('./postgres').table<user>}
   */
  const users_table = {
    name: 'users',
    columns: [
      { name: 'id', type: 'serial', primary: true },
      { name: 'name', type: 'text' },
      { name: 'created', type: 'timestamp', default: 'NOW()', nullable: true },
    ],
  };

  postgres.assign_table_methods(sql, users_table);

  await users_table.drop_table();
  await users_table.create_table();

  /**
   * @type {number}
   */
  let user_id = null;

  {
    console.log('-- create_items(table, items)');
    /**
     * @type {user}
     */
    const user = {
      id: null,
      name: 'test',
      created: null,
    };
    await users_table.create_items([user]);
    assert(user instanceof Object);
    assert(typeof user.id === 'number');
    console.log({ user });
    user_id = user.id;
    console.log('-- create_items(table, items) OK');
  }

  {
    console.log('-- read_items(table, limit, offset)');
    const users = await users_table.read_items(100, 0);
    assert(users.length === 1);
    console.log('-- read_items OK');
  }

  {
    console.log('-- read_items_where(table, name, operator, value, limit, offset)');
    const users = await users_table.read_items_where('name', '=', 'test', 100, 0);
    assert(users.length === 1);
    console.log('-- read_items_where(table, name, operator, value, limit, offset) OK');
  }

  {
    console.log('-- read_item(table, id)');
    const user = await users_table.read_item(user_id);
    assert(user instanceof Object);
    console.log('-- read_item(table, id) OK');
  }

  {
    console.log('-- read_item_where(table, name, operator, value, limit, offset)');
    const user = await users_table.read_item_where('name', '=', 'test');
    assert(user instanceof Object);
    console.log('-- read_item_where(table, name, operator, value, limit, offset) OK');
  }

  {
    console.log('-- update_item(table, item)');
    const user = await users_table.read_item(user_id);
    assert(user instanceof Object);
    const name = '"the quick brown \\"fox" \'';
    const created = luxon.DateTime.now().toISO();
    user.name = name;
    user.created = created;
    await users_table.update_item(user);
    assert(user.name === name);
    assert(user.created === created);
    console.log({ user });
    console.log('-- update_item(table, item) OK');
  }

  {
    console.log('-- delete_item(table, id)');
    await users_table.delete_item(user_id);
    const users = await users_table.read_items(100, 0);
    assert(users.length === 0);
    console.log('-- delete_item(table, id) OK');
  }

  const select_information_schema_tables = await sql`
    SELECT * FROM information_schema.tables WHERE table_schema = 'public';
  `;
  console.log({ select_information_schema_tables });

  await sql.end();

  process.exit(0);

});
