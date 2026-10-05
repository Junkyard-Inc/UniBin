import { $ } from "bun";
import path from "node:path";

const COMPOSE_FILE = path.resolve(import.meta.dir, "../docker/dev.db.docker-compose.yml");
const ENV_FILE = path.resolve(import.meta.dir, "../../../.env");

const compose = ["docker", "compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE];

const DB_NAME = process.env.DB_NAME ?? "unibin_db_dev";
const DB_USER = process.env.DB_USER ?? "dev";
const DB_PORT = process.env.DB_PORT ?? "5432";
const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";

// Starts the container (if already started does nothing)
console.log("Starting Postgres container...");
await $`${compose} up -d db`;

// Waits for postgres to be ready (max 30s)
console.log("Waiting for Postgres...");
let ready = false;
for (let i = 0; i < 30; i++) {
  const r = await $`${compose} exec -T db pg_isready -U ${DB_USER}`
    .quiet()
    .nothrow();
  if (r.exitCode === 0) {
    ready = true;
    break;
  }
  await Bun.sleep(1000);
}
if (!ready) {
  console.error("Postgres timeout.");
  process.exit(1);
}

// Checks if the db already exists
const check = `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`;
const exists =
  (
    await $`${compose} exec -T db psql -U ${DB_USER} -d postgres -tAc ${check}`.text()
  ).trim() === "1";

// If db is missing it gets created
if (exists) {
  console.log(`Database "${DB_NAME}" already exists.`);
} else {
  console.log(`Creating database "${DB_NAME}"...`);
  await $`${compose} exec -T db psql -U ${DB_USER} -d postgres -c ${`CREATE DATABASE "${DB_NAME}"`}`;
  console.log("Database created.");
}

console.log(
  `\nReady: postgres://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}`
);
