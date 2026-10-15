import { connection } from '.';

//PAY ATTENTION to SQL Injections!!!

// This function must check the user's daily limits then it should let the user insert the record into the db
export async function reportNewBin(longitude: number, latitude: number, type: string, state: string, reporting_user: string) {
  const [check] = await connection`
    SELECT new_bins_reported_today
    FROM trash_user
    WHERE username=${reporting_user}
  `;
  let advice = "empty";
  if (check.new_bins_reported_today === 0) {
    console.log("Your reached your daily limit for new bins report");
    advice = "Your reached your daily limit for new bins report";
  }
  else {
    try
    {
      const [query] = await connection`
        INSERT INTO trashbin (location, type, state, reporting_user)
        SELECT
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          (SELECT type_id FROM bin_type WHERE type=${type}),
          (SELECT state_id FROM bin_state WHERE state=${state}),
          (SELECT user_id FROM trash_user WHERE username=${reporting_user})
        RETURNING bin_id, created_at
      `;
      // In this case the field created_at is not inserted manually cause in the schema the field is set to DEFAULT now()
      if (query.length === 0) {
        throw new Error("Nothing was inserted");
      }
      await connection`
        UPDATE trash_user
        SET new_bins_reported_today = (new_bins_reported_today - 1)
        WHERE username=${reporting_user}
      `;
      console.log("New trashbin added successfully!");
      advice = "New trashbin added successfully!";
    } catch (e) {
      console.log("Something went wrong");
      advice = "Something went wrong";
    }
  }
  return advice;
}

// This function must check first the user's daily limits, second if the user is near the bin and then if that is true it should insert the record into the db
export async function reviewBin(bin_long: number, bin_lat: number, reviewing_user: string, reported_state: string) {
  const [check] = await connection`
    SELECT bins_reported_today
    FROM trash_user
    WHERE username=${reviewing_user}
  `;
  let advice = "empty";
  if (check.bins_reported_today === 0) {
    console.log("Your reached your daily limit for bins reviews");
    advice = "Your reached your daily limit for bins reviews";
  }
  else {
    try {
      const [query] = await connection`
        INSERT INTO bin_review (reviewed_bin, reviewing_user, reported_state)
        SELECT
          (SELECT bin_id FROM trashbin WHERE location = ST_SetSRID(ST_MakePoint(${bin_long}, ${bin_lat}), 4326)),
          (SELECT user_id FROM trash_user WHERE username=${reviewing_user}),
          (SELECT state_id FROM bin_state WHERE state=${reported_state})
        RETURNING bin_rev_id, reviewed_at
      `;
      // In this case the field reviewed_at is not inserted manually cause in the schema the field is set to DEFAULT now()
      if (query.length === 0) {
        throw new Error("Nothing was inserted");
      }
      await connection`
        UPDATE trash_user
        SET bins_reported_today = (bins_reported_today - 1)
        WHERE username=${reviewing_user}
      `;
      console.log("Trashbin reviewed successfully!");
      advice = "Trashbin reviewed successfully!";
    } catch (e) {
      console.log("Something went wrong");
      advice = "Something went wrong";
    }
  }
  return advice;
}

// This function must check the user's daily limits and then if the user is inside the limits it should insert the record into the db
export async function reviewUser(title: string, body: string, vote: number, reviewed_user: string, reviewing_user: string) {
  //The vote variable must be passed using a number from 0 to 100:
  vote = vote / 100;
  const [check] = await connection`
    SELECT users_reviewed_today
    FROM trash_user
    WHERE username=${reviewing_user}
  `;
  let advice = "empty";
  if (check.users_reviewed_today === 0) {
    console.log("Your reached your daily limit for users reviews");
    advice = "Your reached your daily limit for users reviews";
  }
  else {
    try {
      const [query] = await connection`
        INSERT INTO user_review (title, body, vote, reviewed_user, reviewing_user)
        SELECT
          ${title}::TEXT,
          ${body}::TEXT,
          ${vote}::NUMERIC(5, 4),
          (SELECT user_id FROM trash_user WHERE username=${reviewed_user}),
          (SELECT user_id FROM trash_user WHERE username=${reviewing_user})
        RETURNING user_rev_id, date_time
      `;
      // In this case the field date_time is not inserted manually cause in the schema the field is set to DEFAULT now()
      if (query.length === 0) {
        throw new Error("Nothing was inserted");
      }
      await connection`
        UPDATE trash_user
        SET users_reviewed_today = (users_reviewed_today - 1)
        WHERE username=${reviewing_user}
      `;
      console.log("User reviewed successfully!");
      advice = "User reviewed successfully!";
    } catch (e) {
      console.log("Something went wrong");
      advice = "Something went wrong";
    }
  }
  return advice;
}

// This function must get the specified bin data that the user request
export async function getBinData() {
  // Dilemma, do we save the data returned from the query in an object or we just format a string to return all the data?
}

// This function must return the position of all the nearby bins given a certain radius around the user
export async function getNearBinsPosition(usr_long: number, usr_lat: number, radius: number) {
  // Returning an array containing longitude, latitude and distance from the position of nearby bins
  return await connection`
    SELECT
      ST_X(location::geometry) AS longitude,
      ST_Y(location::geometry) AS latitude,
      ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${usr_long}, ${usr_lat}), 4326)::geography
      )::float AS distance_m
    FROM tashbin
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(${usr_long}, ${usr_lat}), 4326)::geography,
      ${radius}
    )
    ORDER BY distance_m
  `;
}

// This function updates the bin state based off of the recent bin reviews
export async function updateBinState() {
  // !! Evaluate if it is better to remove state from the trashbin table and use only bin_review
}

// This function must remove a bin from the db if the latest reported state is
export async function removeBin(bin_long: number, bin_lat: number) {
  const [bin_check] = await connection`
    SELECT bin_id,
  `;
}

export async function getUserInfo() {
  // This function must get the various public info for a given user
}

// This function must let a new user register to the site
//  First we check if the username already exists
//  Then we check if the email is correct
//  Then we check the password and if it respects the criteria we hash it
export async function registerNewUser(email: string, username: string, password: string) {
  let em_flag = false; // if email is already in use =true
  let usr_flag = false; // if username already in use =true
  let pw_len_flag = false; // if password is too short =true
  let pw_num_flag = false; // if password does not contain any number =true
  let pw_spec_flag = false; // if password does not contain any special character =true
  let advice = "";

  // This removes spaces and anything that is NOT a letter, number, @, ., -, or _
  const clean_email = email.replace(/[^a-zA-Z0-9@._-]/g, '');

  const [email_check] = await connection`
    SELECT user_id
    FROM trash_user
    WHERE email=${clean_email}
  `;

  if (email_check.length !== 0) {
    em_flag = true;
  }

  const [usr_check] = await connection`
    SELECT user_id
    FROM trash_user
    WHERE username=${username}
  `;

  if (usr_check.length !== 0) {
    usr_flag = true;
  }


  if (password.length < 8) {
    pw_len_flag = true;
  }

  // This checks if the password contanins numbers
  if (!/\d/.test(password)) {
    pw_num_flag = true;
  }

  // This checks if the password contanins special characters
  if (!/[!?.,;:_-£$%€@#*]/.test(password)) {
    pw_spec_flag = true;
  }

  if (!em_flag && !usr_flag && !pw_len_flag && !pw_num_flag && !pw_spec_flag) {
    const hash = await Bun.password.hash(password); // argon2id by default
    try {
      const [query] = await connection`
        INSERT INTO trash_user (email, username, password, rank, role, new_bins_reported_today, bins_reported_today, users_reviewed_today, date_of_activation)
        SELECT
          ${email}::TEXT,
          ${username}::TEXT,
          ${hash}::TEXT,
          (SELECT rank_id FROM user_rank WHERE rank_name='Monnezzaro Jr'),
          (SELECT role_id FROM user_role WHERE role='Registered User'),
          (SELECT daily_new_bins_report FROM user_rank WHERE rank_name='Monnezzaro Jr'),
          (SELECT daily_bins_report FROM user_rank WHERE rank_name='Monnezzaro Jr'),
          (SELECT daily_users_review FROM user_rank WHERE rank_name='Monnezzaro Jr'),
          CURRENT_DATE()
        RETURNING user_id
      `;
      if (query.length === 0) {
        throw new Error("Nothing was inserted");
      }
      advice = "User added successfully!";
    } catch (e) {
      advice = "Something went wrong";
    }
    return advice;
  } else {
    if (em_flag) {
      advice = advice + "email already in use|";
    }
    if (usr_flag) {
      advice = advice + "username already in use|";
    }
    if (pw_len_flag) {
      advice = advice + "password too short|";
    }
    if (pw_num_flag) {
      advice = advice + "password must contain at least one number|";
    }
    if (pw_spec_flag) {
      advice = advice + "password must contain at least one special character|";
    }
  }
  return advice;
}

// This function must let an already registered user to login
export async function userLogin(username: string, password: string) {
  const [query] = await connection`
    SELECT username, password
    FROM trash_user
    WHERE username=${username}
  `;
  if (query.length === 0) {
    return "No such username";
  } else {
    const pw_ok = await Bun.password.verify(password, query.password); // true / false
    if (pw_ok) {
      return "Auth successfull";
    } else {
      return "Incorrect password"
    }
  }
}

// This function must periodically check what time it is and then reset all the users usage data for the day at a given time (daily)
export async function resetDailyUserData() {
  // This could be done in three ways:
  // 1. checking a given arbitrary time server-side and reset all the users at the same time
  // 2. we could add a time-zone to user entity and reset everytime a certain time-zone reaches midnight
  // 3. we could execute the reset everytime the user does something while also checking the date
}

export async function computeUserRank() {
  // This function must calculate a user's rank based off of certain criteria
  // This function should be called when a user gets reviewed or when a bin gets deleted due to reasons
}

export async function serverRequestsThrottling() {

}

// TO-BE_ADDED: Functions for bins search with filters
