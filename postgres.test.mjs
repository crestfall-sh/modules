// @ts-check

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
   * @type {import('./postgres').table}
   */
  const users_table = {
    name: 'users',
    columns: [
      { name: 'id', type: 'serial', primary: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text', unique: true },
      { name: 'email_code', type: 'text' },
      { name: 'email_verified', type: 'boolean' },
      { name: 'phone', type: 'text' },
      { name: 'phone_code', type: 'text' },
      { name: 'phone_verified', type: 'boolean' },
      { name: 'password_salt', type: 'text' },
      { name: 'password_key', type: 'text' },
      { name: 'recovery_code', type: 'text' },
      { name: 'created', type: 'timestamp', default: 'NOW()', nullable: true },
    ],
  };
  await postgres.drop_table(sql, users_table);
  await postgres.create_table(sql, users_table);

  /**
   * @type {number}
   */
  let user_id = null;

  {
    console.log('-- create_items(table, items)');
    const user = {
      id: null,
      name: 'test',
      email: 'joshxyzhimself@gmail.com',
      email_code: 'test',
      email_verified: false,
      phone: '',
      phone_code: 'test',
      phone_verified: false,
      password_salt: 'test',
      password_key: 'test',
      recovery_code: 'test',
      created: null,
    };
    await postgres.create_items(sql, users_table, [user]);
    assert(user instanceof Object);
    assert(typeof user.id === 'number');
    console.log({ user });
    user_id = user.id;
    console.log('-- create_items(table, items) OK');
  }

  {
    console.log('-- read_items(table, limit, offset)');
    const users = await postgres.read_items(sql, users_table, 100, 0);
    assert(users.length === 1);
    console.log('-- read_items OK');
  }

  {
    console.log('-- read_items_where(table, name, operator, value, limit, offset)');
    const users = await postgres.read_items_where(sql, users_table, 'email', '=', 'joshxyzhimself@gmail.com', 100, 0);
    assert(users.length === 1);
    console.log('-- read_items_where(table, name, operator, value, limit, offset) OK');
  }

  {
    console.log('-- read_item(table, id)');
    const user = await postgres.read_item(sql, users_table, user_id);
    assert(user instanceof Object);
    console.log('-- read_item(table, id) OK');
  }

  {
    console.log('-- read_item_where(table, name, operator, value, limit, offset)');
    const user = await postgres.read_item_where(sql, users_table, 'email', '=', 'joshxyzhimself@gmail.com', 100, 0);
    assert(user instanceof Object);
    console.log('-- read_item_where(table, name, operator, value, limit, offset) OK');
  }

  {
    console.log('-- update_item(table, item)');
    const user = await postgres.read_item(sql, users_table, user_id);
    assert(user instanceof Object);
    const name = '"the quick brown \\"fox" \'';
    const created = luxon.DateTime.now().toISO();
    user.name = name;
    user.created = created;
    await postgres.update_item(sql, users_table, user);
    assert(user.name === name);
    assert(user.created === created);
    console.log({ user });
    console.log('-- update_item(table, item) OK');
  }

  {
    console.log('-- delete_item(table, id)');
    await postgres.delete_item(sql, users_table, user_id);
    const users = await postgres.read_items(sql, users_table, 100, 0);
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
