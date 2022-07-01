// @ts-check

import * as postgres from './postgres.mjs';

process.nextTick(async () => {
  const { pg } = postgres.connect('localhost', 5432, 'postgres', 'postgres', 'postgres');
  const test = await pg`
    SELECT * FROM information_schema.tables;
  `;
  console.log({ test });
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});
