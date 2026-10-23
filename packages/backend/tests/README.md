# How does testing works
It has been added a "test" voice in ./backend/package.json which specifies to use .env.test fr the db configuration.

./backend/bunfig.toml specifies the preload for every test, which runs ./backend/tests/setup.ts before running the test.

setup.ts checks if the database name ends with "_test", if that is not true it stops the test, otherwise it launches ./backend/scripts/db-setup-ts

To run a test use `bun run test`
