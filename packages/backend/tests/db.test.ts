import { test, expect, describe, beforeEach } from 'bun:test';
import { useCleanDb, createUser, createBin, createReview, counters, binCount, reviewCount } from './helpers';
import { connection, reportNewBin, reviewBin, reviewUser, getNearBinsPosition, removeBin, registerNewUser, userLogin, computeUserRank, } from '../db';

useCleanDb();

const DUOMO = { lng: 9.1919, lat: 45.4641 };
const ROME = { lng: 12.4964, lat: 41.9028 };

// ---------------------------------------------------------------------------
describe("reportNewBin", () => {
  test("inserts an Active bin, a first review, and spends one of each counter", async () => {
    await createUser("alice");

    // signature: (longitude, latitude, state, type, reporting_user)
    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(res).toBe("New trashbin added successfully!");

    expect(await binCount()).toBe(1);
    expect(await reviewCount()).toBe(1);

    const [bin] = await connection`
      SELECT bs.status
      FROM trashbin b JOIN bin_status bs ON bs.status_id = b.status
    `;
    expect(bin!.status).toBe("Active");

    const c = await counters("alice");
    expect(c.new_bins).toBe(4);
    expect(c.bin_reviews).toBe(4);
  });

  test("stores longitude and latitude in the right order", async () => {
    await createUser("alice");
    await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");

    const [row] = await connection`
      SELECT ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
      FROM trashbin
    `;
    expect(row!.lng).toBeCloseTo(DUOMO.lng, 4);
    expect(row!.lat).toBeCloseTo(DUOMO.lat, 4);
  });

  test("refuses when the daily limit is reached", async () => {
    await createUser("alice", { newBins: 0 });

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(res).toBe("Your reached your daily limit for new bins report");
    expect(await binCount()).toBe(0);
  });

  test("fails for an unknown bin type and changes nothing", async () => {
    await createUser("alice");

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "DoesNotExist", "alice");
    expect(res).toBe("Something went wrong");
    expect(await binCount()).toBe(0);
    expect((await counters("alice")).new_bins).toBe(5);
  });

  test("does not leave a bin behind when the first review fails", async () => {
    await createUser("alice");

    // 'NotAState' makes the review insert fail after the bin insert succeeded
    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "NotAState", "Plastic", "alice");
    expect(res).toBe("Something went wrong");
    expect(await binCount()).toBe(0); // needs a transaction (connection.begin)
  });

  // Casting "as any" needed as a workaroud for bun-types in which bun test.todo inherts bun test signature
  (test.todo as any)("returns a clear message for an unknown username");
});

// ---------------------------------------------------------------------------
describe("reviewBin", () => {
  test("inserts a review with the reported state and spends one counter", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic");

    // signature: (bin_long, bin_lat, type, reviewing_user, reported_state)
    const res = await reviewBin(DUOMO.lng, DUOMO.lat, "Plastic", "alice", "Broken");
    expect(res).toBe("Trashbin reviewed successfully!");

    const [row] = await connection`
      SELECT s.state FROM bin_review r JOIN bin_state s ON s.state_id = r.reported_state
    `;
    expect(row!.state).toBe("Broken");
    expect((await counters("alice")).bin_reviews).toBe(4);
  });

  test("refuses when the daily limit is reached", async () => {
    const u = await createUser("alice", { binReviews: 0 });
    await createBin(u);

    const res = await reviewBin(DUOMO.lng, DUOMO.lat, "Plastic", "alice", "Full");
    expect(res).toBe("Your reached your daily limit for bins reviews");
    expect(await reviewCount()).toBe(0);
  });

  test("fails when no bin exists at that position", async () => {
    await createUser("alice");

    const res = await reviewBin(ROME.lng, ROME.lat, "Plastic", "alice", "Full");
    expect(res).toBe("Something went wrong");
    expect(await reviewCount()).toBe(0);
  });

  test("picks the bin of the requested type when two share a position", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic");
    const glass = await createBin(u, DUOMO.lng, DUOMO.lat, "Glass");

    await reviewBin(DUOMO.lng, DUOMO.lat, "Glass", "alice", "Full");

    const [row] = await connection`SELECT reviewed_bin FROM bin_review`;
    expect(row!.reviewed_bin).toBe(glass);
  });
});

// ---------------------------------------------------------------------------
describe("reviewUser", () => {
  test("stores the vote as a fraction and spends one counter", async () => {
    await createUser("alice");
    await createUser("bob");

    // vote is passed as 0-100
    const res = await reviewUser("Great", "Very helpful", 75, "bob", "alice");
    expect(res).toBe("User reviewed successfully!");

    const [row] = await connection`SELECT vote::float AS vote FROM user_review`;
    expect(row!.vote).toBeCloseTo(0.75, 4);
    expect((await counters("alice")).user_reviews).toBe(4);
  });

  test("accepts the maximum vote of 100", async () => {
    await createUser("alice");
    await createUser("bob");

    const res = await reviewUser("Perfect", "10/10", 100, "bob", "alice");
    expect(res).toBe("User reviewed successfully!");
  });

  test("refuses when the daily limit is reached", async () => {
    await createUser("alice", { userReviews: 0 });
    await createUser("bob");

    const res = await reviewUser("x", "y", 50, "bob", "alice");
    expect(res).toBe("Your reached your daily limit for users reviews");

    const [r] = await connection`SELECT COUNT(*)::int AS total FROM user_review`;
    expect(r!.total).toBe(0);
  });

  test("fails when the reviewed user does not exist", async () => {
    await createUser("alice");

    const res = await reviewUser("x", "y", 50, "ghost", "alice");
    expect(res).toBe("Something went wrong");
  });
});

// ---------------------------------------------------------------------------
describe("getNearBinsPosition", () => {
  test("returns only bins inside the radius", async () => {
    const u = await createUser();
    await createBin(u, DUOMO.lng, DUOMO.lat);
    await createBin(u, ROME.lng, ROME.lat);

    const bins = await getNearBinsPosition(DUOMO.lng, DUOMO.lat, 2000);
    expect(bins.length).toBe(1);
    expect(bins[0]!.latitude).toBeCloseTo(DUOMO.lat, 4);
    expect(bins[0]!.longitude).toBeCloseTo(DUOMO.lng, 4);
  });

  test("orders results by distance", async () => {
    const u = await createUser();
    await createBin(u, 9.193, 45.4641); // roughly 85 m east
    await createBin(u, DUOMO.lng, DUOMO.lat); // at the center

    const bins = await getNearBinsPosition(DUOMO.lng, DUOMO.lat, 1000);
    expect(bins.length).toBe(2);
    expect(bins[0]!.distance_m).toBeLessThan(bins[1]!.distance_m);
  });

  test("returns an empty array when nothing is nearby", async () => {
    const bins = await getNearBinsPosition(0, 0, 1000);
    expect(bins).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("removeBin", () => {
  async function binStatus(binId: number) {
    const [r] = await connection`
      SELECT s.status FROM trashbin b
      JOIN bin_status s ON s.status_id = b.status
      WHERE b.bin_id = ${binId}
    `;
    return r!.status;
  }

  test("returns an error message when the bin has no reviews", async () => {
    const u = await createUser();
    await createBin(u);

    const res = await removeBin(DUOMO.lng, DUOMO.lat, "Plastic");
    expect(res).toBe("An error has occured");
  });

  test("marks the bin Inactive when the latest review is an old, reliable 'Removed'", async () => {
    const u = await createUser();
    const bin = await createBin(u);
    await createReview(bin, u, "Removed", 40);

    const res = await removeBin(DUOMO.lng, DUOMO.lat, "Plastic");
    expect(res).toBe("Removal successful");
    expect(await binStatus(bin)).toBe("Inactive");
  });

  test("keeps the bin Active when the 'Removed' review is recent", async () => {
    const u = await createUser();
    const bin = await createBin(u);
    await createReview(bin, u, "Removed", 1);

    await removeBin(DUOMO.lng, DUOMO.lat, "Plastic");
    expect(await binStatus(bin)).toBe("Active");
  });

  test("looks only at the LATEST review: an old 'Removed' is overridden by a newer 'Full'", async () => {
    const u = await createUser();
    const bin = await createBin(u);
    await createReview(bin, u, "Removed", 60);
    await createReview(bin, u, "Full", 40);

    await removeBin(DUOMO.lng, DUOMO.lat, "Plastic");
    expect(await binStatus(bin)).toBe("Active");
  });

  test("keeps the bin Active when the review is not reliable", async () => {
    const u = await createUser();
    const bin = await createBin(u);
    await createReview(bin, u, "Removed", 40);
    // assumes bin_review has useful / not_useful and the generated 'reliable' column
    await connection`UPDATE bin_review SET not_useful = 10 WHERE reviewed_bin = ${bin}`;

    await removeBin(DUOMO.lng, DUOMO.lat, "Plastic");
    expect(await binStatus(bin)).toBe("Active");
  });
});

// ---------------------------------------------------------------------------
describe("registerNewUser", () => {
  test("creates a user with a hashed password and the lowest rank's limits", async () => {
    const res = await registerNewUser("new@test.com", "newbie", "Passw0rd!");
    expect(res).toBe("User added successfully!");

    const [u] = await connection`
      SELECT t.password, t.new_bins_reported_today AS nb, t.bins_reported_today AS br,
             t.users_reviewed_today AS ur, r.rank_name,
             r.daily_new_bins_report AS lim_nb, r.daily_bins_report AS lim_br,
             r.daily_users_review AS lim_ur
      FROM trash_user t JOIN user_rank r ON r.rank_id = t.rank
      WHERE t.username = 'newbie'
    `;
    expect(u!.password).not.toBe("Passw0rd!");
    expect(await Bun.password.verify("Passw0rd!", u!.password)).toBe(true);
    expect(u!.rank_name).toBe("Rifiuto Della Società");
    expect(u!.nb).toBe(u!.lim_nb);
    expect(u!.br).toBe(u!.lim_br);
    expect(u!.ur).toBe(u!.lim_ur);
  });

  test("reports every password problem at once", async () => {
    const res = await registerNewUser("a@b.com", "bob", "abc");
    expect(res).toContain("password too short");
    expect(res).toContain("password must contain at least one number");
    expect(res).toContain("password must contain at least one special character");
  });

  test("rejects a password without a special character", async () => {
    const res = await registerNewUser("a@b.com", "bob", "Password123");
    expect(res).toContain("special character");
    expect(res).not.toContain("too short");
  });

  test("rejects an email that is already registered", async () => {
    await createUser("taken"); // email: taken@test.com

    const res = await registerNewUser("taken@test.com", "other", "Passw0rd!");
    expect(res).toContain("email already in use");
  });

  test("rejects a username that is already registered", async () => {
    await createUser("taken");

    const res = await registerNewUser("fresh@test.com", "taken", "Passw0rd!");
    expect(res).toContain("username already in use");
  });

  test("does not insert anything when validation fails", async () => {
    await registerNewUser("a@b.com", "bob", "abc");
    const [r] = await connection`SELECT COUNT(*)::int AS total FROM trash_user`;
    expect(r!.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("userLogin", () => {
  test("accepts the correct password", async () => {
    await createUser("alice", { password: "Passw0rd!" });
    expect(await userLogin("alice", "Passw0rd!")).toBe("Auth successfull");
  });

  test("rejects a wrong password", async () => {
    await createUser("alice", { password: "Passw0rd!" });
    expect(await userLogin("alice", "wrong")).toBe("Incorrect password");
  });

  test("reports an unknown username", async () => {
    expect(await userLogin("ghost", "whatever")).toBe("No such username");
  });

  test("usernames are case sensitive", async () => {
    await createUser("alice");
    expect(await userLogin("Alice", "Passw0rd!")).toBe("No such username");
  });
});

// ---------------------------------------------------------------------------
describe("computeUserRank", () => {
  // Needs user_rank.minimum_score. Fixed thresholds make the tests deterministic.
  beforeEach(async () => {
    const thresholds: [string, number][] = [
      ["Rifiuto Della Società", 0],
      ["Troll Delle Discariche", 6000],
      ["Monnezzaro Jr", 12000],
      ["Monnezzaro", 18000],
      ["Re Dei Monnezzari", 24000],
    ];
    for (const [name, score] of thresholds) {
      await connection`UPDATE user_rank SET minimum_score = ${score} WHERE rank_name = ${name}`;
    }
  });

  async function rankOf(userId: number) {
    const [r] = await connection`
      SELECT r.rank_name, r.daily_new_bins_report AS nb, r.daily_bins_report AS br,
             r.daily_users_review AS ur,
             t.new_bins_reported_today AS t_nb, t.bins_reported_today AS t_br,
             t.users_reviewed_today AS t_ur
      FROM trash_user t JOIN user_rank r ON r.rank_id = t.rank
      WHERE t.user_id = ${userId}
    `;
    return r!;
  }

  test("a user with no activity stays at the lowest rank", async () => {
    const u = await createUser("alice");
    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Rifiuto Della Società");
  });

  test("one active bin (100% active = 10000 pts) reaches the second rank", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");

    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Troll Delle Discariche");
  });

  test("half of the bins inactive gives 5000 pts and keeps the lowest rank", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");
    await createBin(u, ROME.lng, ROME.lat, "Plastic", "Inactive");

    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Rifiuto Della Società");
  });

  test("perfect bins, reliable reviews and a 100% vote reach the top rank", async () => {
    const u = await createUser("alice");
    const other = await createUser("bob");
    const bin = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");
    await createReview(bin, u, "Full"); // reliable by default (useful >= not_useful)
    await connection`
      INSERT INTO user_review (title, body, vote, reviewed_user, reviewing_user)
      VALUES ('t', 'b', 1.0, ${u}, ${other})
    `;

    await computeUserRank(u); // 10000 + 10000 + 10000 = 30000 pts
    expect((await rankOf(u)).rank_name).toBe("Re Dei Monnezzari");
  });

  test("resets the daily counters to the new rank's limits", async () => {
    const u = await createUser("alice", { newBins: 1, binReviews: 1, userReviews: 1 });
    await createBin(u);

    await computeUserRank(u);

    const r = await rankOf(u);
    expect(r.t_nb).toBe(r.nb);
    expect(r.t_br).toBe(r.br);
    expect(r.t_ur).toBe(r.ur);
  });
});

// ---------------------------------------------------------------------------
describe("not implemented yet", () => {
  (test.todo as any)("resetDailyUserData resets counters to the rank limits once per day");
  (test.todo as any)("reportGroupOfBins reports several bins at one position");
  (test.todo as any)("getBinData returns the data of a requested bin");
});


// Old Test -----------
describe("Register a new user", () => {
  test("User with all the right credentials", async () => {
    const user = await registerNewUser("tester@testone.com", "IlTestone65", "?TestingTesting78");

    expect(user).toBe("User added successfully!");
  });

  test("Email already registered", async () => {
    const user = await registerNewUser("tester@testone.com", "Testardone", "?TiestoTestante643");

    console.log(user);
    expect(user).toBe("email already in use|");
  });
});
