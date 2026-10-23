import { $ } from 'bun';
import { afterAll } from 'bun:test';
import { connection } from '../db';

// If the database name does not end with _test it stops the test
if (!process.env.DB_NAME?.endsWith('_test')) {
  throw new Error(`Refusing to run tests on database "${process.env.DB_NAME}"`);
}

await $`bun run scripts/db-setup.ts`;

afterAll(async () => {
  await connection.close(); // once, after every test file has finished
});
