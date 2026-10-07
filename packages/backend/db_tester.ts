import { connection } from '.';

//PAY ATTENTION to SQL Injections!!!

// This function must check the user's daily limits then it should let the user insert the record into the db
export async function reportNewBin(longitude: number, latitude: number, type: string, state: string, reporting_user: string) {
  const [row] = await connection`
    INSERT INTO trashbin (location, type, state, reporting_user)
    SELECT
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      (SELECT type_id FROM bin_type WHERE type=${type}),
      (SELECT state_id FROM bin_state WHERE state=${state}),
      (SELECT user_id FROM trash_user WHERE username=${reporting_user})
    RETURNING bin_id, created_at
  `;
  // In this case the field created_at is not inserted manually cause in the schema the field is set to DEFAILT now()
  return row;
}

export async function reviewBin() {
  // This function must check first the user's daily limits, second if the user is near the bin and then if that is true it should insert the record into the db
}

export async function reviewUser() {
  // This function must check the user's daily limits and then if the user is inside the limits it should insert the record into the db
}

export async function getBinData() {
  // This function must get the specified bin data that the user request
}

export async function getNearBinsPosition() {
  // This function must return the position of all the nearby bins given a certain radius around the user
}

export async function removeBin() {
  // This function must remove a bin from the db based off of certain criteria
}

export async function getUserInfo() {
  // This function must get the various public info for a given user
}

export async function registerNewUser() {
  // This function must let a new user registr to the site
}

export async function userLogin() {
  // This function must let an already registered user to login
}

export async function resetDailyUserData() {
  // This function must periodically check what time it is and then reset all the users usage data for the day at a given time (daily)
}

export async function computeUserRank() {
  // This function must calculate a user's rank based off of certain criteria
  // This function should be called when a user gets reviewed or when a bin gets deleted due to reasons
}

export async function serverRequestsThrottling() {

}

// TO-BE_ADDED: Functions for bins search with filters
