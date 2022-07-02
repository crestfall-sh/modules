// @ts-check

import { assert } from './assert.mjs';
import * as postgres from './postgres.mjs';

process.nextTick(async () => {
  const sql = postgres.connect('localhost', 5432, 'postgres', 'postgres', 'postgres');

  const select_version = await sql`
    SELECT version();
  `;
  console.log({ select_version });

  const users_table = {
    name: 'users',
    columns: [
      { name: 'id', type: 'serial', parameters: 'PRIMARY KEY' },
      { name: 'name', type: 'text', parameters: 'NOT NULL' },
      { name: 'email', type: 'text', parameters: 'NOT NULL UNIQUE' },
      { name: 'email_code', type: 'text', parameters: 'NOT NULL' },
      { name: 'email_verified', type: 'boolean', parameters: 'NOT NULL' },
      { name: 'phone', type: 'text', parameters: 'NOT NULL' },
      { name: 'phone_code', type: 'text', parameters: 'NOT NULL' },
      { name: 'phone_verified', type: 'boolean', parameters: 'NOT NULL' },
      { name: 'password_salt', type: 'text', parameters: 'NOT NULL' },
      { name: 'password_key', type: 'text', parameters: 'NOT NULL' },
      { name: 'recovery_code', type: 'text', parameters: 'NOT NULL' },
      { name: 'created', type: 'double precision', parameters: 'DEFAULT round(extract(epoch from current_timestamp) * 1000) NOT NULL' },
    ],
  };
  await postgres.drop_table(sql, users_table);
  await postgres.create_table(sql, users_table);

  /**
   * @type {string}
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
      created: Date.now(),
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
    console.log('-- update_item(table, item)');
    const user = await postgres.read_item(sql, users_table, user_id);
    assert(user instanceof Object);
    const new_name = '"the quick brown \\"fox" \'';
    user.name = new_name;
    await postgres.update_item(sql, users_table, user);
    assert(user.name === new_name);
    console.log('-- update_item(table, item) OK');
  }

  {
    console.log('-- delete_item(table, id)');
    await postgres.delete_item(sql, users_table, user_id);
    const users = await postgres.read_items_where(sql, users_table, 'name', '=', 'test', 100, 0);
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
