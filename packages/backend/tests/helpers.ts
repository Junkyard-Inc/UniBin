import { beforeEach } from 'bun:test';
import { connection } from '../db';

export function useCleanDb() {
  beforeEach(async () => {
    await connection`
      TRUNCATE trash_user, user_review, trashbin, bin_review RESTART IDENTITY CASCADE
    `;
  });
}

// Every async function implicitally wraps its return value in a Promise<...> object
export async function createUser(username = 'tester'): Promise<number> {
  const [u] = await connection`
    INSERT INTO trash_user (email, username, password, rank, role)
    SELECT ${username + '@test.com'}, ${username}, 'x',
           (SELECT rank_id FROM user_rank LIMIT 1),
           (SELECT role_id FROM user_role LIMIT 1)
    RETURNING user_id
  `;
  return u.user_id;
}

export async function createBin(
  userId: number,
  lng = 9.1919,
  lat = 45.4641,
  type = 'Plastic',
): Promise<number> {
  const [b] = await connection`
    INSERT INTO trashbin (location, type, state, reporting_user)
    SELECT ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
           (SELECT type_id FROM bin_type WHERE type = ${type}),
           (SELECT state_id FROM bin_state WHERE state = 'Empty'),
           ${userId}::int
    RETURNING bin_id
  `;
  return b.bin_id;
}

export async function createReview(
  binId: number,
  userId: number,
  state: string,
  daysAgo = 0,
) {
  await connection`
    INSERT INTO bin_review (reviewed_bin, reviewing_user, reported_state, reviewed_at)
    SELECT ${binId}::int, ${userId}::int, state_id,
           now() - make_interval(days => ${daysAgo}::int)
    FROM bin_state WHERE state = ${state}
  `;
}
