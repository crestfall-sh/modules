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
    await users_table.insert([user]);
    assert(user instanceof Object);
    assert(typeof user.id === 'number');
    console.log({ user });
    user_id = user.id;
    console.log('-- insert OK');
  }

  {
    const users = await users_table.select({});
    assert(users.length === 1);
    console.log('-- select OK');
  }
  {
    const [user] = await users_table.select({});
    assert(user instanceof Object);
    console.log('-- select OK');
  }
  {
    const users = await users_table.select({ limit: 100, offset: 0 });
    assert(users.length === 1);
    console.log('-- select LIMIT OFFSET OK');
  }
  {
    const users = await users_table.select({ descend: 'created' });
    assert(users.length === 1);
    console.log('-- select DESCEND OK');
  }
  {
    const users = await users_table.select({ where: 'email', eq: 'joshxyzhimself@gmail.com' });
    assert(users.length === 1);
    console.log('-- select WHERE eq OK');
  }
  {
    const users = await users_table.select({ where: 'email', neq: 'joshxyzhimself@gmail.com' });
    assert(users.length === 0);
    console.log('-- select WHERE neq OK');
  }
  {
    const users = await users_table.select({ where: 'email_code', is: null });
    assert(users.length === 1);
    console.log('-- select WHERE neq OK');
  }

  {
    const [user] = await users_table.select({ where: 'id', eq: 1 });
    assert(user instanceof Object);
    const email_code = crypto.randomBytes(32).toString('hex');
    user.email_code = email_code;
    await users_table.update(user);
    assert(user.email_code === email_code);
    console.log('-- update OK');
  }

  {
    const user = await users_table.select({ where: 'email_code', is_not: null });
    assert(user instanceof Object);
    console.log({ user });
    console.log('-- select OK');
  }

  {
    await users_table.remove(user_id);
    const users = await users_table.select({});
    assert(users.length === 0);
    console.log('-- remove OK');
  }

  const select_information_schema_tables = await sql`
    SELECT * FROM information_schema.tables WHERE table_schema = 'public';
  `;
  assert(select_information_schema_tables instanceof Array);

  await sql.end();

  process.exit(0);

});
