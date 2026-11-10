import { beforeEach } from "bun:test";
import { connection } from "../db";

// Empties the data tables before every test. Lookup tables (bin_type, bin_state,
// bin_status, user_rank, user_role) are only referenced, so they stay seeded.
export function useCleanDb() {
  if (process.env.KEEP_DATA) return; // KEEP_DATA=1 bun run test -t "one test" to inspect data
  beforeEach(async () => {
    await connection`
      TRUNCATE trash_user, user_review, trashbin, bin_review RESTART IDENTITY CASCADE
    `;
  });
}

type UserOpts = {
  newBins?: number; // new_bins_reported_today
  binReviews?: number; // bins_reported_today
  userReviews?: number; // users_reviewed_today
  password?: string;
  yearsActive?: number; // moves date_of_activation back in time
};

// Inserts a user with raw SQL. Daily counters default to 5 (not 0),
// because 0 means "daily limit reached" in your functions.
export async function createUser(
  username = "tester",
  opts: UserOpts = {},
): Promise<number> {
  const hash = await Bun.password.hash(opts.password ?? "Passw0rd!");
  const [u] = await connection`
    INSERT INTO trash_user (
      email, username, password, rank, role,
      new_bins_reported_today, bins_reported_today, users_reviewed_today,
      date_of_activation
    )
    SELECT
      ${username + "@test.com"}::text,
      ${username}::text,
      ${hash}::text,
      (SELECT rank_id FROM user_rank WHERE rank_name = 'Rifiuto Della Società'),
      (SELECT role_id FROM user_role WHERE role = 'Registered User'),
      ${opts.newBins ?? 5}::int,
      ${opts.binReviews ?? 5}::int,
      ${opts.userReviews ?? 5}::int,
      (CURRENT_DATE - make_interval(years => ${opts.yearsActive ?? 0}::int))::date
    RETURNING user_id
  `;
  return u!.user_id;
}

export async function createBin(
  userId: number,
  lng = 9.1919,
  lat = 45.4641,
  type = "Plastic",
  status = "Active",
): Promise<number> {
  const [b] = await connection`
    INSERT INTO trashbin (location, type, status, reporting_user)
    SELECT
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      (SELECT type_id FROM bin_type WHERE type = ${type}),
      (SELECT status_id FROM bin_status WHERE status = ${status}),
      ${userId}::int
    RETURNING bin_id
  `;
  return b!.bin_id;
}

// daysAgo creates old reviews without waiting.
// votes sets the useful / not_useful counters (default 1 / 1, like the schema).
export async function createReview(
  binId: number,
  userId: number,
  state: string,
  daysAgo = 0,
  votes: { useful: number; notUseful: number } = { useful: 1, notUseful: 1 },
): Promise<void> {
  await connection`
    INSERT INTO bin_review (reviewed_bin, reviewing_user, reported_state, reviewed_at, useful, not_useful)
    SELECT ${binId}::int, ${userId}::int, state_id,
           now() - make_interval(days => ${daysAgo}::int),
           ${votes.useful}::int, ${votes.notUseful}::int
    FROM bin_state WHERE state = ${state}
  `;
}

export async function counters(username: string) {
  const [r] = await connection`
    SELECT new_bins_reported_today AS new_bins,
           bins_reported_today     AS bin_reviews,
           users_reviewed_today    AS user_reviews
    FROM trash_user WHERE username = ${username}
  `;
  return r!;
}

export async function binCount(): Promise<number> {
  const [r] = await connection`SELECT COUNT(*)::int AS total FROM trashbin`;
  return r!.total;
}

export async function reviewCount(): Promise<number> {
  const [r] = await connection`SELECT COUNT(*)::int AS total FROM bin_review`;
  return r!.total;
}
