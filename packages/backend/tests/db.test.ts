import { test, expect, describe } from 'bun:test';
import { useCleanDb, createUser, createBin, createReview, counters, binCount, reviewCount } from './helpers';
import { connection, reportNewBin, reviewBin, reviewUser, getNearBinsPosition, removeBin, registerNewUser, userLogin, computeUserRank, } from '../db';

useCleanDb();

const DUOMO = { lng: 9.1919, lat: 45.4641 };
const ROME = { lng: 12.4964, lat: 41.9028 };

// ---------------------------------------------------------------------------
// Sanity checks on the schema and seed data that your functions rely on
// ---------------------------------------------------------------------------
/*describe("schema and seed", () => {
  test("lookup tables are seeded", async () => {
    const status = await connection`SELECT status FROM bin_status`;
    expect(status.map((r) => r.status)).toEqual(
      expect.arrayContaining(["Active", "Inactive"]),
    );
    const roles = await connection`SELECT role FROM user_role`;
    expect(roles.map((r) => r.role)).toEqual(
      expect.arrayContaining(["Admin", "Registered User"]),
    );
  });

  test("higher ranks have higher thresholds and higher daily limits", async () => {
    const ranks = await connection`
      SELECT rank_name, minimum_score, daily_new_bins_report AS lim
      FROM user_rank ORDER BY minimum_score ASC
    `;
    expect(ranks.map((r) => r.rank_name)).toEqual([
      "Rifiuto Della Società",
      "Troll Delle Discariche",
      "Monnezzaro Jr",
      "Monnezzaro",
      "Re Dei Monnezzari",
    ]);
    expect(ranks[0]!.minimum_score).toBe(0);
    const limits = ranks.map((r) => r.lim as number);
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
  });

  test("usernames are unique", async () => {
    await createUser("alice");
    await expect(createUser("alice")).rejects.toThrow();
  });

  describe("bin_review.reliable", () => {
    async function reliableFor(useful: number, notUseful: number) {
      const u = await createUser("alice");
      const bin = await createBin(u);
      await createReview(bin, u, "Full", 0, { useful, notUseful });
      const [r] = await connection`SELECT reliable FROM bin_review`;
      return r!.reliable;
    }

    test("is true when useful equals not_useful (the defaults)", async () => {
      expect(await reliableFor(1, 1)).toBe(true);
    });

    test("is true when most votes are useful", async () => {
      expect(await reliableFor(3, 1)).toBe(true);
    });

    test("is false when most votes are not useful", async () => {
      expect(await reliableFor(1, 3)).toBe(false);
    });
  });
});*/

// ---------------------------------------------------------------------------
describe("reportNewBin", () => {
  async function statusOf(binId: number) {
    const [r] = await connection`
      SELECT s.status FROM trashbin b
      JOIN bin_status s ON s.status_id = b.status
      WHERE b.bin_id = ${binId}
    `;
    return r!.status;
  }

  // signature: (longitude, latitude, state, type, reporting_user)

  test("inserts an Active bin, a first review, and spends one of each counter", async () => {
    await createUser("alice");

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

  test("the first review carries the reported state", async () => {
    await createUser("alice");
    await reportNewBin(DUOMO.lng, DUOMO.lat, "Broken", "Plastic", "alice");

    const [r] = await connection`
      SELECT s.state FROM bin_review br JOIN bin_state s ON s.state_id = br.reported_state
    `;
    expect(r!.state).toBe("Broken");
  });

  test("refuses when the daily new-bins limit is reached", async () => {
    await createUser("alice", { newBins: 0 });

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(res).toBe("You reached your daily limit for new bins report");
    expect(await binCount()).toBe(0);
  });

  test("the last allowed report succeeds and the next one is refused", async () => {
    await createUser("alice", { newBins: 1 });

    const first = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(first).toBe("New trashbin added successfully!");
    expect((await counters("alice")).new_bins).toBe(0);

    const second = await reportNewBin(ROME.lng, ROME.lat, "Full", "Plastic", "alice");
    expect(second).toBe("You reached your daily limit for new bins report");
    expect(await binCount()).toBe(1);
  });

  test("inserts nothing when the review limit is reached", async () => {
    await createUser("alice", { binReviews: 0 });

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(res).toBe("Something went wrong");
    expect(await binCount()).toBe(0);
    expect(await reviewCount()).toBe(0);

    const c = await counters("alice");
    expect(c.new_bins).toBe(5); // not spent
    expect(c.bin_reviews).toBe(0);
  });

  test("fails for an unknown bin type and changes nothing", async () => {
    await createUser("alice");

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "DoesNotExist", "alice");
    expect(res).toBe("Something went wrong");
    expect(await binCount()).toBe(0);
    expect((await counters("alice")).new_bins).toBe(5);
  });

  test("removes the new bin when the first review fails (unknown state)", async () => {
    await createUser("alice");

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "NotAState", "Plastic", "alice");
    expect(res).toBe("Something went wrong");
    expect(await binCount()).toBe(0);
    expect(await reviewCount()).toBe(0);

    const c = await counters("alice");
    expect(c.new_bins).toBe(5);
    expect(c.bin_reviews).toBe(5);
  });

  test("does not create a duplicate when an active bin already exists there", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(res).toBe("Trashbin already exists");
    expect(await binCount()).toBe(1);
    expect(await reviewCount()).toBe(0);
    expect((await counters("alice")).new_bins).toBe(5); // nothing spent
  });

  test("allows a bin of a different type at the same position", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Glass", "alice");
    expect(res).toBe("New trashbin added successfully!");
    expect(await binCount()).toBe(2);
  });

  test("reactivates an Inactive bin instead of inserting a new one", async () => {
    const u = await createUser("alice");
    const bin = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Inactive");

    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(res).toBe("Trashbin reactivated");
    expect(await binCount()).toBe(1);
    expect(await statusOf(bin)).toBe("Active");
  });

  test("does not reactivate a bin removed by an admin", async () => {
    const u = await createUser("alice");
    const bin = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Removed by Admin");

    await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "alice");
    expect(await statusOf(bin)).toBe("Removed by Admin");
    expect(await binCount()).toBe(1);
  });

  test("returns 'No user found' for an unknown username", async () => {
    const res = await reportNewBin(DUOMO.lng, DUOMO.lat, "Full", "Plastic", "ghost");
    expect(res).toBe("No user found");
    expect(await binCount()).toBe(0);
  });

  test("treats a bin about 0.4 m away as the same bin", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");

    // 0.000004 degrees of latitude is roughly 0.4 m
    const res = await reportNewBin(DUOMO.lng, DUOMO.lat + 0.000004, "Full", "Plastic", "alice");
    expect(res).toBe("Trashbin already exists");
    expect(await binCount()).toBe(1);
  });

  test("treats a bin about 50 m away as a different bin", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");

    // 0.00045 degrees of latitude is roughly 50 m
    const res = await reportNewBin(DUOMO.lng, DUOMO.lat + 0.00045, "Full", "Plastic", "alice");
    expect(res).toBe("New trashbin added successfully!");
    expect(await binCount()).toBe(2);
  });

  (test.todo as any)("decide whether reactivating a bin spends a counter and adds a review");
  (test.todo as any)("returns a specific message for a bin removed by an admin");
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
    expect(res).toBe("You reached your daily limit for bins reviews");
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
    //console.log("var mia: ", glass);
    //console.log("var sua: ", row!.reviewed_bin);
    expect(row!.reviewed_bin).toBe(glass);
  });

  test("returns 'No user found' for an unknown reviewing user", async () => {
    const u = await createUser("alice");
    await createBin(u); // the bin exists, only the user is missing

    const res = await reviewBin(DUOMO.lng, DUOMO.lat, "Plastic", "ghost", "Full");
    expect(res).toBe("No user found");
    expect(await reviewCount()).toBe(0);
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
    expect(res).toBe("You reached your daily limit for users reviews");

    const [r] = await connection`SELECT COUNT(*)::int AS total FROM user_review`;
    expect(r!.total).toBe(0);
  });

  test("fails when the reviewed user does not exist", async () => {
    await createUser("alice");

    const res = await reviewUser("x", "y", 50, "ghost", "alice");
    expect(res).toBe("Something went wrong");
  });

  test("returns 'No user found' for an unknown reviewing user", async () => {
    await createUser("bob"); // the reviewed user exists, only the reviewer is missing

    const res = await reviewUser("x", "y", 50, "bob", "ghost");
    expect(res).toBe("No user found");

    const [r] = await connection`SELECT COUNT(*)::int AS total FROM user_review`;
    expect(r!.total).toBe(0);
  });

  test("rejects a vote above 100", async () => {
    await createUser("alice");
    await createUser("bob");

    const res = await reviewUser("x", "y", 101, "bob", "alice");
    expect(res).toBe("Invalid vote value");

    const [r] = await connection`SELECT COUNT(*)::int AS total FROM user_review`;
    expect(r!.total).toBe(0);
    expect((await counters("alice")).user_reviews).toBe(5); // not spent
  });

  test("rejects a negative vote", async () => {
    await createUser("alice");
    await createUser("bob");

    expect(await reviewUser("x", "y", -1, "bob", "alice")).toBe("Invalid vote value");
  });

  test("accepts the edge values 0 and 100", async () => {
    await createUser("alice");
    await createUser("bob");

    expect(await reviewUser("low", "x", 0, "bob", "alice")).toBe("User reviewed successfully!");
    expect(await reviewUser("high", "x", 100, "bob", "alice")).toBe("User reviewed successfully!");
  });

  test("rounds the vote to 4 decimals", async () => {
    await createUser("alice");
    await createUser("bob");

    await reviewUser("x", "y", 33.333, "bob", "alice"); // 0.33333 -> 0.3333
    const [row] = await connection`SELECT vote::float AS vote FROM user_review`;
    expect(row!.vote).toBeCloseTo(0.3333, 4);
  });

  test("validates the vote before looking up the user", async () => {
    // documents the order of your checks: an invalid vote wins over an unknown user
    const res = await reviewUser("x", "y", 500, "bob", "ghost");
    expect(res).toBe("Invalid vote value");
  });

  test("rejects a vote that is not a number", async () => {
    await createUser("alice");
    await createUser("bob");

    expect(await reviewUser("x", "y", NaN, "bob", "alice")).toBe("Invalid vote value");
    expect(await reviewUser("x", "y", Infinity, "bob", "alice")).toBe("Invalid vote value");
  });

  test("a user can't review themselves", async () => {
    await createUser("alice");

    const res = await reviewUser("x", "y", 50, "alice", "alice");
    expect(res).toBe("Users can't review themselves");

    const [r] = await connection`SELECT COUNT(*)::int AS total FROM user_review`;
    expect(r!.total).toBe(0);
    expect((await counters("alice")).user_reviews).toBe(5); // not spent
  });

  test("an invalid vote is reported before the self-review check", async () => {
    // documents the order of your checks
    await createUser("alice");

    expect(await reviewUser("x", "y", 500, "alice", "alice")).toBe("Invalid vote value");
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
    await createReview(bin, u, "Removed", 40, { useful: 1, notUseful: 5 });

    await removeBin(DUOMO.lng, DUOMO.lat, "Plastic");
    expect(await binStatus(bin)).toBe("Active");
  });

  test("only touches the bin of the requested type", async () => {
    const u = await createUser();
    const plastic = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic");
    const glass = await createBin(u, DUOMO.lng, DUOMO.lat, "Glass");
    await createReview(glass, u, "Removed", 40);
    await createReview(plastic, u, "Full", 40);

    await removeBin(DUOMO.lng, DUOMO.lat, "Glass");
    expect(await binStatus(glass)).toBe("Inactive");
    expect(await binStatus(plastic)).toBe("Active");
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

  test("sets the activation date to today", async () => {
    await registerNewUser("new@test.com", "newbie", "Passw0rd!");
    const [r] = await connection`
      SELECT date_of_activation = CURRENT_DATE AS is_today
      FROM trash_user WHERE username = 'newbie'
    `;
    expect(r!.is_today).toBe(true);
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
// Thresholds seeded in db-setup.ts:
//   Rifiuto 0 | Troll 7500 | Monnezzaro Jr 15000 | Monnezzaro 30000 | Re Dei 35000
// Points: three percentages (max 10000 each) plus bonuses for seniority
// (1000 per year) and users reviewed (100 each), both times the multiplier.
// ---------------------------------------------------------------------------
describe("computeUserRank", () => {
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

  // Inserts a user_review where `reviewed` received a 100% vote
  async function giveFullVote(reviewed: number, reviewer: number) {
    await connection`
      INSERT INTO user_review (title, body, vote, reviewed_user, reviewing_user)
      VALUES ('t', 'b', 1.0, ${reviewed}, ${reviewer})
    `;
  }

  test("a user with no activity stays at the lowest rank (0 pts)", async () => {
    const u = await createUser("alice");
    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Rifiuto Della Società");
  });

  test("half of the bins inactive gives 5000 pts: still the lowest rank", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");
    await createBin(u, ROME.lng, ROME.lat, "Plastic", "Inactive");

    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Rifiuto Della Società");
  });

  test("one active bin (10000 pts) reaches Troll Delle Discariche", async () => {
    const u = await createUser("alice");
    await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");

    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Troll Delle Discariche");
  });

  test("active bin + reliable review (20000 pts) reaches Monnezzaro Jr", async () => {
    const u = await createUser("alice");
    const bin = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");
    await createReview(bin, u, "Full"); // reliable with the default 1/1 votes

    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Monnezzaro Jr");
  });

  test("an unreliable review does not add points", async () => {
    const u = await createUser("alice");
    const bin = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");
    await createReview(bin, u, "Full", 0, { useful: 1, notUseful: 5 });

    await computeUserRank(u); // only the 10000 from the active bin
    expect((await rankOf(u)).rank_name).toBe("Troll Delle Discariche");
  });

  test("all three percentages at 100% (30000 pts) reach Monnezzaro", async () => {
    const u = await createUser("alice");
    const other = await createUser("bob");
    const bin = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");
    await createReview(bin, u, "Full");
    await giveFullVote(u, other);

    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Monnezzaro");
  });

  test("seniority bonus pushes a 30000 pts user to Re Dei Monnezzari", async () => {
    // 30000 + 5 years * 1000 * 1.3 = 36500 pts
    const u = await createUser("alice", { yearsActive: 5 });
    const other = await createUser("bob");
    const bin = await createBin(u, DUOMO.lng, DUOMO.lat, "Plastic", "Active");
    await createReview(bin, u, "Full");
    await giveFullVote(u, other);

    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Re Dei Monnezzari");
  });

  test("seniority alone is scaled down by the low multiplier", async () => {
    // 0 pts from percentages -> multiplier 0.1 -> 5 * 1000 * 0.1 = 500 pts
    const u = await createUser("alice", { yearsActive: 5 });
    await computeUserRank(u);
    expect((await rankOf(u)).rank_name).toBe("Rifiuto Della Società");
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

describe("resetDailyUserData", () => {
  async function limits() {
    const [r] = await connection`
      SELECT daily_new_bins_report AS nb, daily_bins_report AS br, daily_users_review AS ur
      FROM user_rank WHERE rank_name = 'Rifiuto Della Società'
    `;
    return r!;
  }

  test("restores the rank limits for a user whose last reset was yesterday", async () => {
    await createUser("alice", { newBins: 0, binReviews: 0, userReviews: 0 });
    await backdate("alice", 1);

    expect(await resetDailyUserData()).toBe(1);

    const c = await counters("alice");
    const l = await limits();
    expect([c.new_bins, c.bin_reviews, c.user_reviews]).toEqual([l.nb, l.br, l.ur]);
  });

  test("does not touch a user already reset today", async () => {
    await createUser("alice", { newBins: 3, binReviews: 3, userReviews: 3 });

    expect(await resetDailyUserData()).toBe(0);
    expect((await counters("alice")).new_bins).toBe(3);
  });

  test("is idempotent: a second run changes nothing", async () => {
    await createUser("alice", { newBins: 0 });
    await backdate("alice", 1);

    await resetDailyUserData();
    expect(await resetDailyUserData()).toBe(0);
  });

  test("with a username, resets only that user", async () => {
    await createUser("alice", { newBins: 0 });
    await createUser("bob", { newBins: 0 });
    await backdate("alice", 1);
    await backdate("bob", 1);

    await resetDailyUserData("alice");

    expect((await counters("alice")).new_bins).toBeGreaterThan(0);
    expect((await counters("bob")).new_bins).toBe(0);
  });

  test("uses each user's own rank limits", async () => {
    await createUser("alice", { newBins: 0 });
    await backdate("alice", 1);
    await connection`
      UPDATE trash_user
      SET rank = (SELECT rank_id FROM user_rank WHERE rank_name = 'Re Dei Monnezzari')
      WHERE username = 'alice'
    `;

    await resetDailyUserData("alice");

    const [top] = await connection`
      SELECT daily_new_bins_report AS nb FROM user_rank WHERE rank_name = 'Re Dei Monnezzari'
    `;
    expect((await counters("alice")).new_bins).toBe(top!.nb);
  });

  test("the reset follows the user's own midnight", async () => {
    await createUser("alice", { newBins: 0 });
    await connection`UPDATE trash_user SET timezone = 'Pacific/Kiritimati'`;

    // last reset exactly at the start of today in the user's zone: not due
    await connection`
      UPDATE trash_user
      SET last_data_usage_reset =
        date_trunc('day', now() AT TIME ZONE timezone) AT TIME ZONE timezone
    `;
    expect(await resetDailyUserData()).toBe(0);

    // one second before that midnight: due
    await connection`
      UPDATE trash_user SET last_data_usage_reset = last_data_usage_reset - INTERVAL '1 second'
    `;
    expect(await resetDailyUserData()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe("timezone", () => {
  test("new users get the default timezone", async () => {
    await registerNewUser("a@test.com", "alice", "Passw0rd!");
    expect(await tzOf("alice")).toBe("Europe/Rome");
  });

  test("registration stores a valid timezone", async () => {
    await registerNewUser("a@test.com", "alice", "Passw0rd!", "America/New_York");
    expect(await tzOf("alice")).toBe("America/New_York");
  });

  test("registration falls back to the default for an invalid timezone", async () => {
    const res = await registerNewUser("a@test.com", "alice", "Passw0rd!", "Not/AZone");
    expect(res).toBe("User added successfully!"); // an invalid zone does not block registration
    expect(await tzOf("alice")).toBe("Europe/Rome");
  });

  test("updates the timezone", async () => {
    await createUser("alice");

    expect(await updateUserTimezone("alice", "Asia/Tokyo")).toBe("Timezone updated");
    expect(await tzOf("alice")).toBe("Asia/Tokyo");
  });

  test("rejects an invalid timezone and keeps the old one", async () => {
    await createUser("alice");

    expect(await updateUserTimezone("alice", "Not/AZone")).toBe("Invalid timezone");
    expect(await tzOf("alice")).toBe("Europe/Rome");
  });

  test("reports unchanged and unknown users", async () => {
    await createUser("alice");

    expect(await updateUserTimezone("alice", "Europe/Rome")).toBe("Timezone unchanged");
    expect(await updateUserTimezone("ghost", "Asia/Tokyo")).toBe("No user found");
  });

  test("a change does not give a free reset", async () => {
    await createUser("alice", { newBins: 0 });

    await updateUserTimezone("alice", "Pacific/Honolulu");
    expect(await resetDailyUserData()).toBe(0);
    expect((await counters("alice")).new_bins).toBe(0);
  });

  test("a change settles a pending reset under the old zone first", async () => {
    await createUser("alice", { newBins: 0 });
    await backdate("alice", 1);

    await updateUserTimezone("alice", "Asia/Tokyo");
    expect((await counters("alice")).new_bins).toBeGreaterThan(0);
  });

  test("login stores the timezone only after a correct password", async () => {
    await createUser("alice", { password: "Passw0rd!" });

    await userLogin("alice", "wrong", "Asia/Tokyo");
    expect(await tzOf("alice")).toBe("Europe/Rome");

    await userLogin("alice", "Passw0rd!", "Asia/Tokyo");
    expect(await tzOf("alice")).toBe("Asia/Tokyo");
  });

  test("login still works with no timezone", async () => {
    await createUser("alice", { password: "Passw0rd!" });
    expect(await userLogin("alice", "Passw0rd!")).toBe("Auth successfull");
  });
});

// ---------------------------------------------------------------------------
describe("startUserRequest", () => {
  test("resets a due user even without a timezone", async () => {
    await createUser("alice", { newBins: 0 });
    await backdate("alice", 1);

    await startUserRequest("alice");
    expect((await counters("alice")).new_bins).toBeGreaterThan(0);
  });

  test("applies a new timezone and resets under the old one first", async () => {
    await createUser("alice", { newBins: 0 });
    await backdate("alice", 1);

    await startUserRequest("alice", "Asia/Tokyo");

    expect(await tzOf("alice")).toBe("Asia/Tokyo");
    expect((await counters("alice")).new_bins).toBeGreaterThan(0);
  });

  test("an invalid timezone is ignored and the reset still runs", async () => {
    await createUser("alice", { newBins: 0 });
    await backdate("alice", 1);

    await startUserRequest("alice", "Not/AZone");

    expect(await tzOf("alice")).toBe("Europe/Rome");
    expect((await counters("alice")).new_bins).toBeGreaterThan(0);
  });

  test("does nothing harmful for a user who is not due", async () => {
    await createUser("alice", { newBins: 2 });

    await startUserRequest("alice", "Europe/Rome");
    expect((await counters("alice")).new_bins).toBe(2);
  });
});

// ---------------------------------------------------------------------------
describe("not implemented yet", () => {
  (test.todo as any)("reportGroupOfBins reports several bins at one position");
  (test.todo as any)("getBinData returns the data of a requested bin");
});


// Old Test -----------
/*
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
*/
