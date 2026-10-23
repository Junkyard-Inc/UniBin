import { SQL } from "bun";

export const connection = new SQL(process.env.DATABASE_URL!);

//WARN: PAY ATTENTION to SQL Injections

// This function must check the user's daily limits then it should let the user insert the record into the db
export async function reportNewBin(longitude: number, latitude: number, state: string, type: string, reporting_user: string) {
  //WARN: Check first if the bin is already in the db with status "Inactive"
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
      const [newBinQuery] = await connection`
        INSERT INTO trashbin (location, type, status, reporting_user)
        SELECT
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          (SELECT type_id FROM bin_type WHERE type=${type}),
          (SELECT status_id FROM bin_status WHERE status='Active'),
          (SELECT user_id FROM trash_user WHERE username=${reporting_user})
        RETURNING bin_id, created_at
      `;
      // In this case the field created_at is not inserted manually cause in the schema the field is set to DEFAULT now()
      if (newBinQuery.length === 0) {
        throw new Error("Nothing was inserted");
      }
      const newBinRev = await reviewBin(longitude, latitude, type, reporting_user, state);
      if (newBinRev === "Something went wrong") {
        throw new Error("Review was not inserted");
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

export async function reportGroupOfBins(longitude: number, latitude: number, states: string[], types: string[], reporting_user: string) {
  // This function lets a user report multiple bins in the same position
}

// This function must check first the user's daily limits, second if the user is near the bin and then if that is true it should insert the record into the db
export async function reviewBin(bin_long: number, bin_lat: number, type:string, reviewing_user: string, reported_state: string) {
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
          (SELECT bin_id FROM trashbin WHERE location = ST_SetSRID(ST_MakePoint(${bin_long}, ${bin_lat}), 4326) AND type = ${type}),
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

export async function getBinRev() {

}

export async function usefulBinRev() {

}

export async function notUsefulBinRev() {

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
export async function updateBinState(bin_long: number, bin_lat: number, type: number) {
  // Is it really necessary?
}

// This function must "remove" a bin from the db if the latest reported state is
export async function removeBin(bin_long: number, bin_lat: number, type: string) {
  // !! Evaluate if it is better to remove state from the trashbin table and use only bin_review
  // This query gets the latest review of a given trashbin
  const [rev_bin] = await connection`
    WITH selected_bin AS (
      SELECT bn.bin_id
      FROM trashbin bn
      JOIN bin_type bt ON bt.type_id = bn.type
      WHERE bt.type = ${type} AND ST_DWithin(
        bn.location,
        ST_SetSRID(ST_MakePoint(${bin_long}, ${bin_lat}), 4326)::geography,
        1
      ) -- Gets all the bins in that position and in a radius of one meter
      ORDER BY b.location <-> ST_SetSRID(ST_MakePoint(${bin_long}, ${bin_lat}), 4326)::geography -- Operand <-> returns the distance between two spatial values
      LIMIT 1
    )
    SELECT br.reviewed_bin, br.reliable, bs.state_id, bs.state, br.reviewed_at, (br.reviewed_at < now() - INTERVAL '30 days') AS is_stale
    FROM bin_review br
    JOIN selected_bin sb ON sb.bin_id = br.reviewed_bin
    JOIN bin_state bs ON bs.state_id = br.reported_state
    ORDER BY br.reviewed_at DESC
    LIMIT 1
  `;
  // is_stale is used to check if the review the query found is older than 30 days
  if (!rev_bin) {
    return "An error has occured";
  } else if (rev_bin.is_stale && rev_bin.state === "Removed" && rev_bin.reliable) {
    try {
      await connection`
        UPDATE trashbin
        SET status = (SELECT ststus_id FROM bin_status WHERE status='Inactive')
        WHERE bin_id = ${rev_bin.reviewed_bin}
      `;
      return "Removal successful";
    } catch (e) {
      return "Removal unsuccessful";
    }
  }
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
  if (!/[!?.,;:_£$%€@#*-]/.test(password)) {
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
          (SELECT rank_id FROM user_rank WHERE rank_name='Rifiuto Della Società'),
          (SELECT role_id FROM user_role WHERE role='Registered User'),
          (SELECT daily_new_bins_report FROM user_rank WHERE rank_name='Rifiuto Della Società'),
          (SELECT daily_bins_report FROM user_rank WHERE rank_name='Rifiuto Della Società'),
          (SELECT daily_users_review FROM user_rank WHERE rank_name='Rifiuto Della Società'),
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

// This function must calculate a user's rank based off of certain criteria
// This function is called when a user gets reviewed or when a bin bin review by the same user gets a feedback
export async function computeUserRank(userID: number) {
  // What is evaluated:
  // (N of reported bins still active/N of total reported bins)*100 (check if null)
  // (N of unreliable bins reviews/N of total bins review)*100 (check if null)
  // average vote across all of user's review that the user received (percent) (check if null)
  // user "seniority"
  // numbers of users reviewed
  //
  // The user starts at 0 pts = "Rifiuto Della Società"
  // The three percent values are multiplied by 100, so they can go from 0-100 to 0-10000
  // So the maximum score only with three percent values is 30000
  //
  // Use years of activity and users reviews only as bonus and malus, if the first three percent values are high,
  // the two values are multiplied using a multiplier (E.g. 1.2, 1.5, 1.8), otherwise the two values are multiplied using a divider (E.g. 0.7, 0.5, 0.3)
  // For every year that the user has been active on the platfrom +1000 points
  // For every user reviewed +100 pts
  // The points from years of activity and reviews are then multiplied using the bonus/malus multiplier and then added to the total points count
  //
  // Multipliers divided by points (<6000: 0.1; <12000: 0.4; <18000: 0.7; <24000: 1; <30000: 1.3)

  let total_pts: number = 0;
  let multiplier: number = 0;
  const userRanks: readonly string[] = ["Rifiuto Della Società", "Troll Delle Discariche", "Monnezzaro Jr", "Monnezzaro", "Re Dei Monnezzari"];
  let usrRank: string = "";

  const [bin_rep] = await connection`
    SELECT COUNT(*)::int AS total
    FROM trashbin
    WHERE reporting_user = ${userID}
    `;

  if (bin_rep.total !== 0) {
    const [bin_rep_act] = await connection`
      SELECT COUNT(*)::int AS total
      FROM trashbin
      JOIN bin_status bs ON bs.status_id = trashbin.status
      WHERE reporting_user = ${userID} AND bs.status = 'Active'
      `;
    total_pts += ((bin_rep_act.total / bin_rep.total) * 100) * 100;
  }

  const [bin_rev] = await connection`
    SELECT COUNT(*)::int AS total
    FROM bin_review
    WHERE reviewing_user = ${userID}
    `;

  if (bin_rev.total !== 0) {
    const [bin_rev_rel] = await connection`
      SELECT COUNT(*)::int AS total
      FROM bin_review
      WHERE reviewing_user = ${userID} AND reliable = true
      `;
    total_pts += ((bin_rev_rel.total/bin_rev.total)*100)*100
  }

  const [usr_rev_avg] = await connection`
    SELECT ROUND(AVG(vote), 4)::float AS average
    FROM user_review
    WHERE reviewed_user = ${userID}
    `;

  if (usr_rev_avg.average !== null) {
    total_pts += (usr_rev_avg.average * 100) * 100;
  }

  const [seniority] = await connection`
    SELECT EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_activation))::int AS years
    FROM trash_user
    WHERE user_id = ${userID}
    `;

  const [n_users_reviewed] = await connection`
    SELECT COUNT(*) AS total
    FROM user_review
    WHERE reviewing_user = ${userID}
    `;

  if (total_pts >= 0 && total_pts < 6000) {
    multiplier = 0.1;
  } else if (total_pts >= 6000 && total_pts < 12000) {
    multiplier = 0.4;
  } else if (total_pts >= 12000 && total_pts < 18000) {
    multiplier = 0.7;
  } else if (total_pts >= 18000 && total_pts < 24000) {
    multiplier = 1.0;
  } else if (total_pts >= 24000) {
    multiplier = 1.3;
  }

  total_pts += (seniority.years * 1000) * multiplier;
  total_pts += (n_users_reviewed.total * 100) * multiplier;

  const [points] = await connection`
    SELECT minimum_score
    FROM user_rank
    ORDER BY minimum_score ASC
    `;

  for (let i = 0; i < 5; i++) {
    if (total_pts >= points[i].minimum_score) {
      usrRank = userRanks[i] ?? "";
    }
  }

  await connection`
    UPDATE trash_user
    SET
      rank = (SELECT rank_id FROM user_rank WHERE rank_name = ${usrRank}),
      new_bins_reported_today = (SELECT daily_new_bins_report FROM user_rank WHERE rank_name = ${usrRank}),
      bins_reported_today = (SELECT daily_bins_report FROM user_rank WHERE rank_name = ${usrRank}),
      users_reviewed_today = (SELECT daily_users_review FROM user_rank WHERE rank_name = ${usrRank})
    WHERE user_id = ${userID}
    `;

}

export async function serverRequestsThrottling() {

}

// TO-BE_ADDED: Functions for bins search with filters
