import { $ } from "bun";
import path from "node:path";
import { SQL } from 'bun';

const COMPOSE_FILE = path.resolve(import.meta.dir, "../docker/dev.db.docker-compose.yml");
const ENV_FILE = path.resolve(import.meta.dir, "../../../.env");

const compose = ["docker", "compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE];

const DB_NAME = process.env.DB_NAME ?? "unibin_db_dev";
const DB_USER = process.env.DB_USER ?? "dev";
const DB_PORT = process.env.DB_PORT ?? "5432";
const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";

const binTypes: readonly string[] = ["General Waste", "Food Waste", "Plastic", "Paper", "Glass", "Clothing", "Green Waste", "Stale Oil", "Batteries", "Cigarette Butts"];
const binStates: readonly string[] = ["Full", "Empty", "Broken", "Removed", "Aflame"];
const userRanks: readonly string[] = ["Re Dei Monnezzari", "Monnezzaro", "Monnezzaro Jr", "Troll Delle Discariche", "Rifiuto Della Società"]
const userRoles: readonly string[] = ["Admin", "Registered User"]

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
  console.log(`Database '${DB_NAME}' already exists.`);
} else {
  console.log(`Creating database '${DB_NAME}'...`);
  await $`${compose} exec -T db psql -U ${DB_USER} -d postgres -c ${`CREATE DATABASE "${DB_NAME}"`}`;
  console.log("Database created.");
}

const schema = `
  CREATE EXTENSION IF NOT EXISTS postgis;

  CREATE TABLE IF NOT EXISTS user_role(
    role_id SERIAL PRIMARY KEY,
    role  TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS user_rank(
    rank_id SERIAL PRIMARY KEY,
    rank_name TEXT NOT NULL UNIQUE,
    daily_new_bins_report SMALLINT NOT NULL,
    daily_bins_report SMALLINT NOT NULL,
    daily_users_review  SMALLINT NOT NULL
  );

  -- user is a reserved word in Postgresql, so this table won't be called just user
  CREATE TABLE IF NOT EXISTS trash_user(
    user_id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    username  TEXT NOT NULL,
    password  TEXT NOT NULL,
    profile_picture TEXT,
    rank  INT NOT NULL,
    role  INT NOT NULL,
    new_bins_reported_today SMALLINT NOT NULL DEFAULT 0,
    bins_reported_today SMALLINT NOT NULL DEFAULT 0,
    users_reviewed_today SMALLINT NOT NULL DEFAULT 0,
    date_of_activation  DATE,

    FOREIGN KEY (rank) REFERENCES user_rank(rank_id),
    FOREIGN KEY (role) REFERENCES user_role(role_id)
  );

  CREATE TABLE IF NOT EXISTS user_review(
    user_rev_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body  TEXT NOT NULL,
    vote  NUMERIC(5, 4) NOT NULL, -- Stores a percent value (e.g. 15.50% -> 0.1550)
    date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), -- Stores the timestamp (date + time) with the timezone with automatic daylight saving time conversion
    reviewed_user INT NOT NULL,
    reviewing_user  INT NOT NULL,

    FOREIGN KEY (reviewed_user) REFERENCES trash_user(user_id),
    FOREIGN KEY (reviewing_user) REFERENCES trash_user(user_id)
  );

  CREATE TABLE IF NOT EXISTS bin_type(
    type_id SERIAL PRIMARY KEY,
    type  TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS bin_state(
    state_id  SERIAL PRIMARY KEY,
    state TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS trashbin(
    bin_id SERIAL PRIMARY KEY,
    location  GEOGRAPHY(Point, 4326) NOT NULL, -- First longitude then latitude
    type INT NOT NULL,
    state INT NOT NULL,
    reporting_user INT NOT NULL,
    general_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    FOREIGN KEY (type) REFERENCES bin_type(type_id),
    FOREIGN KEY (state) REFERENCES bin_state(state_id),
    FOREIGN KEY (reporting_user) REFERENCES trash_user(user_id)
  );

  CREATE TABLE IF NOT EXISTS bin_review(
    bin_rev_id  SERIAL PRIMARY KEY,
    reviewed_bin  INT NOT NULL,
    reviewing_user  INT NOT NULL,
    reported_state  INT NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    FOREIGN KEY (reviewed_bin) REFERENCES trashbin(bin_id),
    FOREIGN KEY (reviewing_user) REFERENCES trash_user(user_id),
    FOREIGN KEY (reported_state) REFERENCES bin_state(state_id)
  );
  `;
console.log("Applying schema and filling with needed data...");
await $`${compose} exec -T db psql -U ${DB_USER} -d ${DB_NAME} -v ON_ERROR_STOP=1 -c ${schema}`;
console.log("Schema applied.");

console.log("Seeding data...");
const connection = new SQL(process.env.DATABASE_URL!);

// ON CONFLICT can only be used when the field is unique
for (const value of binTypes) {
  await connection`
    INSERT INTO bin_type (type)
    VALUES (${value})
    ON CONFLICT (type) DO NOTHING
    `;
}

for (const value of binStates) {
  await connection`
    INSERT INTO bin_state (state)
    VALUES (${value})
    ON CONFLICT (state) DO NOTHING
    `;
}

let dailyNewBinsReport: number = 25;
let dailyBinsReport: number = 25;
let dailyUsersReview: number = 25;

for (const value of userRanks) {
  await connection`
    INSERT INTO user_rank (rank_name, daily_new_bins_report, daily_bins_report, daily_users_review)
    VALUES (${value}, ${dailyNewBinsReport}, ${dailyBinsReport}, ${dailyUsersReview})
    ON CONFLICT (rank_name) DO NOTHING
    `;
  dailyNewBinsReport -= 5;
  dailyBinsReport -= 5;
  dailyUsersReview -= 5;
}

for (const value of userRoles) {
  await connection`
    INSERT INTO user_role (role)
    VALUES (${value})
    ON CONFLICT (role) DO NOTHING
    `;
}

await connection.close();
console.log("Data seeded.");

console.log(
  `\nReady: postgres://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}`
);
