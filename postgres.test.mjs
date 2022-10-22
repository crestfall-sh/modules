// @ts-check

/**
 * @typedef {import('./postgresql.test').user} user
 * @typedef {import('./postgresql.test').role} role
 * @typedef {import('./postgresql.test').user_role} user_role
 */

import * as crypto from 'crypto';
import * as luxon from 'luxon';
import assert from './assert.mjs';
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
    columns: {
      id: { name: 'id', type: 'serial', primary: true },
      email: { name: 'email', type: 'text' },
      email_code: { name: 'email_code', type: 'text', nullable: true },
      email_verified: { name: 'email_verified', type: 'boolean' },
      created: { name: 'created', type: 'timestamp' },
    },
    hydrate: async (item) => {
      console.log('hydrate', item);
      const { items: user_roles } = await user_roles_table.select({ where: 'user_id', eq: item.id });
      item.user_roles = user_roles;
      return item;
    },
    cleanup: async (item) => {
      console.log('cleanup', item);
      item.email_code = null;
      return item;
    },
    on_insert: async (items) => {
      console.log('on_insert', items);
    },
    on_update: async (item) => {
      console.log('on_update', item);
    },
    on_remove: async (id) => {
      console.log('on_remove', id);
    },
  };

  /**
   * @type {import('./postgres').table<role>}
   */
  const roles_table = {
    name: 'roles',
    name_alt: 'roles',
    columns: {
      id: { name: 'id', type: 'serial', primary: true },
      name: { name: 'name', type: 'text', unique: true },
      permissions: { name: 'permissions', type: 'text[]' },
    },
  };

  /**
   * @type {import('./postgres').table<user_role>}
   */
  const user_roles_table = {
    name: 'user_roles',
    name_alt: 'user_roles',
    columns: {
      id: { name: 'id', type: 'serial', primary: true },
      user_id: { name: 'user_id', type: 'integer', references: 'users' },
      role_id: { name: 'role_id', type: 'integer', references: 'roles' },
    },
  };

  const list = [users_table, roles_table, user_roles_table];

  for (let i = 0, l = list.length; i < l; i += 1) {
    const table = list[i];
    postgres.bind_methods(sql, table);
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
      email_code: crypto.randomBytes(32).toString('hex'),
      email_verified: false,
      created: luxon.DateTime.now().toISO(),
    };
    /**
     * @type {user}
     */
    const bob = {
      id: null,
      email: 'bob@example.com',
      email_code: crypto.randomBytes(32).toString('hex'),
      email_verified: false,
      created: luxon.DateTime.now().toISO(),
    };
    await users_table.insert([alice, bob], { hydrate: true, cleanup: true });
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

  // count exceed test
  {
    const { items, count } = await users_table.select({ limit: 10, offset: 10, count: true });
    console.log({ items, count });
    assert(items.length === 0); // items in this query with pagination
    assert(count === 2); // total items in this query without pagination
  }

  // explain test
  {
    const { items, explain } = await users_table.select({ explain: true });
    console.log({ items, explain });
    assert(explain instanceof Array);
    assert(explain.length === 1);
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
    console.log('-- removing');
    await users_table.remove(user_id);
    console.log('-- removed');
    console.log('-- selecting');
    const { items } = await users_table.select({});
    console.log('-- selected');
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
