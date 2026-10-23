import { test, expect, describe } from 'bun:test';
import { useCleanDb, createUser, createBin, createReview } from './helpers';
import { reviewUser, registerNewUser, userLogin, computeUserRank } from '../db';

useCleanDb();

describe("Register a new user", () => {
  test("User with all the right credentials", async () => {
    const user = await registerNewUser("tester@testone.com", "IlTestone65", "?TestingTesting78");

    expect(user).toBe("User added successfully!");
  })
})
