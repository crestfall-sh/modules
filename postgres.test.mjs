// @ts-check

/**
 * @typedef {import('./postgresql.test').user} user
 */

import * as crypto from 'crypto';
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
      { name: 'email', type: 'text' },
      { name: 'email_code', type: 'text', nullable: true },
      { name: 'email_verified', type: 'boolean' },
      { name: 'created', type: 'timestamp' },
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
    /**
     * @type {user}
     */
    const user = {
      id: null,
      email: 'joshxyzhimself@gmail.com',
      email_code: null,
      email_verified: false,
      created: luxon.DateTime.now().toISO(),
    };
    await users_table.create_items([user]);
    assert(user instanceof Object);
    assert(typeof user.id === 'number');
    console.log({ user });
    user_id = user.id;
    console.log('-- create_items OK');
  }

  {
    const users = await users_table.read_items(100, 0);
    assert(users.length === 1);
    console.log('-- read_items OK');
  }

  {
    const users = await users_table.read_items_where('email', '=', 'joshxyzhimself@gmail.com', 100, 0);
    assert(users.length === 1);
    console.log('-- read_items_where OK');
  }

  {
    const users = await users_table.read_items_where('email_code', 'IS', null, 100, 0);
    assert(users.length === 1);
    console.log('-- read_items_where OK');
  }

  {
    const user = await users_table.read_item(user_id);
    assert(user instanceof Object);
    console.log('-- read_item OK');
  }

  {
    const user = await users_table.read_item_where('email', '=', 'joshxyzhimself@gmail.com');
    assert(user instanceof Object);
    console.log('-- read_item_where OK');
  }

  {
    const user = await users_table.read_item_where('email', '!=', 'joshxyzhimself@gmail.com');
    assert(user === null);
    console.log('-- read_item_where OK');
  }

  {
    const user = await users_table.read_item_where('email_code', 'IS', null);
    assert(user instanceof Object);
    console.log('-- read_item_where OK');
  }

  {
    const user = await users_table.read_item(user_id);
    assert(user instanceof Object);
    const email_code = crypto.randomBytes(32).toString('hex');
    user.email_code = email_code;
    await users_table.update_item(user);
    assert(user.email_code === email_code);
    console.log('-- update_item OK');
  }

  {
    const user = await users_table.read_item_where('email_code', 'IS NOT', null);
    assert(user instanceof Object);
    console.log({ user });
    console.log('-- read_item_where OK');
  }

  {
    await users_table.delete_item(user_id);
    const users = await users_table.read_items(100, 0);
    assert(users.length === 0);
    console.log('-- delete_item OK');
  }

  const select_information_schema_tables = await sql`
    SELECT * FROM information_schema.tables WHERE table_schema = 'public';
  `;
  console.log({ select_information_schema_tables });

  await sql.end();

  process.exit(0);

});
