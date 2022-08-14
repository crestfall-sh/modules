// @ts-check

/**
 * @typedef {import('./postgresql.test').user} user
 * @typedef {import('./postgresql.test').role} role
 * @typedef {import('./postgresql.test').user_role} user_role
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
    name_alt: 'users',
    columns: [
      { name: 'id', type: 'serial', primary: true },
      { name: 'email', type: 'text' },
      { name: 'email_code', type: 'text', nullable: true },
      { name: 'email_verified', type: 'boolean' },
      { name: 'created', type: 'timestamp' },
    ],
  };

  /**
   * @type {import('./postgres').table<role>}
   */
  const roles_table = {
    name: 'roles',
    name_alt: 'roles',
    columns: [
      { name: 'id', type: 'serial', primary: true },
      { name: 'name', type: 'text', unique: true },
      { name: 'permissions', type: 'text[]' },
    ],
  };

  /**
   * @type {import('./postgres').table<user_role>}
   */
  const user_roles_table = {
    name: 'user_roles',
    name_alt: 'user_roles',
    columns: [
      { name: 'id', type: 'serial', primary: true },
      { name: 'user_id', type: 'integer', references: 'users' },
      { name: 'role_id', type: 'integer', references: 'roles' },
    ],
  };

  const list = [users_table, roles_table, user_roles_table];

  for (let i = 0, l = list.length; i < l; i += 1) {
    const table = list[i];
    postgres.assign_table_methods(sql, table);
    await table.drop_table();
    await table.create_table();
  }

  // LEFT JOIN TEST
  {
    /**
     * @type {user}
     */
    const alice = {
      id: null,
      email: 'alice@example.com',
      email_code: null,
      email_verified: false,
      created: luxon.DateTime.now().toISO(),
    };
    /**
     * @type {user}
     */
    const bob = {
      id: null,
      email: 'bob@example.com',
      email_code: null,
      email_verified: false,
      created: luxon.DateTime.now().toISO(),
    };
    await users_table.insert([alice, bob]);
    /**
     * @type {role}
     */
    const admin = {
      id: null,
      name: 'admin',
      permissions: ['users:read,write'],
    };
    /**
     * @type {role}
     */
    const supervisor = {
      id: null,
      name: 'supervisor',
      permissions: ['report-assignments:read,write'],
    };
    await roles_table.insert([admin, supervisor]);
    /**
     * @type {user_role}
     */
    const alice_user_role = {
      id: null,
      user_id: alice.id,
      role_id: admin.id,
    };
    /**
     * @type {user_role}
     */
    const bob_user_role = {
      id: null,
      user_id: bob.id,
      role_id: supervisor.id,
    };
    await user_roles_table.insert([alice_user_role, bob_user_role]);
    const items = await sql`
      SELECT * FROM 
        (
          SELECT * FROM "user_roles" WHERE "user_id" = ${alice.id}
        ) as user_role
      LEFT OUTER JOIN
        (
          SELECT * FROM "roles"
        ) as role
      ON user_role."id" = role."id";
    `;
    console.log({ items });
  }

  // count test
  {
    const { items, count } = await users_table.select({ count: true });
    console.log({ items, count });
    assert(items.length === count);
  }

  for (let i = 0, l = list.length; i < l; i += 1) {
    const table = list[i];
    await table.drop_table();
    await table.create_table();
  }

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
    const { items } = await users_table.select({});
    assert(items.length === 1);
    console.log('-- select OK');
  }
  {
    const user = await users_table.first({});
    assert(user instanceof Object);
    console.log('-- select OK');
  }
  {
    const { items } = await users_table.select({ limit: 100, offset: 0 });
    assert(items.length === 1);
    console.log('-- select LIMIT OFFSET OK');
  }
  {
    const { items } = await users_table.select({ descend: 'created' });
    assert(items.length === 1);
    console.log('-- select DESCEND OK');
  }
  {
    const { items } = await users_table.select({ where: 'email', eq: 'joshxyzhimself@gmail.com' });
    assert(items.length === 1);
    console.log('-- select WHERE eq OK');
  }
  {
    const { items } = await users_table.select({ where: 'email', neq: 'joshxyzhimself@gmail.com' });
    assert(items.length === 0);
    console.log('-- select WHERE neq OK');
  }
  {
    const { items } = await users_table.select({ where: 'email_code', is: null });
    assert(items.length === 1);
    console.log('-- select WHERE neq OK');
  }

  {
    const user = await users_table.first({ where: 'id', eq: 1 });
    assert(user instanceof Object);
    const email_code = crypto.randomBytes(32).toString('hex');
    user.email_code = email_code;
    await users_table.update(user);
    assert(user.email_code === email_code);
    console.log('-- update OK');
  }

  {
    const user = await users_table.first({ where: 'email_code', is_not: null });
    assert(user instanceof Object);
    console.log('-- first OK');
  }

  {
    await users_table.remove(user_id);
    const { items } = await users_table.select({});
    assert(items.length === 0);
    console.log('-- remove OK');
  }

  {
    const user = await users_table.first({});
    assert(user === null);
    console.log('-- first OK');
  }

  const select_information_schema_tables = await sql`
    SELECT * FROM information_schema.tables WHERE table_schema = 'public';
  `;
  assert(select_information_schema_tables instanceof Array);

  await sql.end();

  process.exit(0);

});
