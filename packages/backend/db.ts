import { SQL } from "bun";

export const connection = new SQL(process.env.DATABASE_URL!);

//WARN: PAY ATTENTION to SQL Injections

//####################################################################################################################################
//------------------------------------------------## Bin Related Functions ##---------------------------------------------------------
//####################################################################################################################################

// This function must check the user's daily limits then it should let the user insert the record into the db
export async function reportNewBin(longitude: number, latitude: number, state: string, type: string, reporting_user: string) {

  const [check] = await connection`
    SELECT new_bins_reported_today
    FROM trash_user
    WHERE username=${reporting_user}
  `;
  let advice = "empty";
  if (!check) {
    advice = "No user found";
  } else if (check.new_bins_reported_today === 0) {
    advice = "You reached your daily limit for new bins report";
  } else {
    const [bin] = await getBinID(longitude, latitude, type);
    // bin does not exist
    if (!bin) {
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
        if (!newBinQuery) {
          throw new Error("Nothing was inserted");
        }
        const newBinRev = await reviewBin(longitude, latitude, type, reporting_user, state);
        if (newBinRev !== "Trashbin reviewed successfully!") {
          await connection`
            DELETE FROM trashbin
            WHERE bin_id = ${newBinQuery.bin_id}
            `;
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
        console.error("Report new bin failed:", e);
        advice = "Something went wrong";
      }
      // Bin exists but is inactive
    } else {
      //checking first if the bin is already in the db with status "Inactive"
      const [binStat] = await connection`
        SELECT bs.status
        FROM trashbin bn
        JOIN bin_status bs ON bs.status_id = bn.status
        WHERE bn.bin_id = ${bin.bin_id}
      `;

      if (binStat.status === "Inactive") { // TODO: how do I handle Removed by Admin?
        try {
          await connection`
            UPDATE trashbin
            SET status = (SELECT status_id FROM bin_status WHERE status = 'Active')
            WHERE bin_id = ${bin.bin_id}
            `;
          advice = "Trashbin reactivated";
        } catch (e) {
          console.error("Report new bin failed:", e);
          advice = "Something went wrong";
        }
      } else { // Bin already exists and is active
        advice = "Trashbin already exists";
    }
  }
  return advice;
}

//WARN: Still very experimental needs ATTENTION
// This function lets a user report multiple bins in the same position
export async function reportGroupOfBins(longitude: number, latitude: number, states: string[], types: string[], reporting_user: string) {
  if (states.length !== types.length) {
    return "states array does not match types array length";
  }
  if (types.length === 0) {
    return "Array length not valid";
  }
  // Same type at the same position is the same bin, so it can't appear twice
  if (new Set(types).size !== types.length) {
    return "Duplicate bin types in the same position";
  }

  // Refuse the whole group up front if the user can't afford it
  const [check] = await connection`
    SELECT new_bins_reported_today AS new_bins, bins_reported_today AS bin_reviews
    FROM trash_user
    WHERE username = ${reporting_user}
  `;
  if (!check) {
    return "No user found";
  }
  if (check.new_bins < types.length || check.bin_reviews < types.length) {
    return "Not enough daily reports left for this group";
  }

  let added = 0;
  let reactivated = 0;
  let existing = 0;

  for (let i = 0; i < types.length; i++) {
    const res = await reportNewBin(longitude, latitude, states[i]!, types[i]!, reporting_user);

    if (res === "New trashbin added successfully!") {
      added++;
    } else if (res === "Trashbin reactivated") {
      reactivated++;
    } else if (res === "Trashbin already exists") {
      existing++; // not an error, keep going
    } else {
      return `Stopped at bin ${i + 1} (${types[i]}): ${res}. ${added + reactivated} bin(s) before it were saved.`;
    }
  }

  return `Group reported: ${added} added, ${reactivated} reactivated, ${existing} already existed`;
}

// This function must return the position of all the nearby bins given a certain radius around the user
export async function getNearBinsPosition(usr_long: number, usr_lat: number, radius: number) {
  // Returning an array containing longitude, latitude and distance from the position of nearby bins
  return await connection`
    SELECT bt.type,
           ST_X(bn.location::geometry) AS longitude,
           ST_Y(bn.location::geometry) AS latitude,
           ST_Distance(bn.location, ST_SetSRID(ST_MakePoint(${usr_long}, ${usr_lat}), 4326)::geography)::float AS distance_m
    FROM trashbin bn
    JOIN bin_type bt   ON bt.type_id = bn.type
    JOIN bin_status bs ON bs.status_id = bn.status
    WHERE bs.status = 'Active'
      AND ST_DWithin(bn.location, ST_SetSRID(ST_MakePoint(${usr_long}, ${usr_lat}), 4326)::geography, ${radius})
    ORDER BY distance_m
  `;
}

// This function must check first the user's daily limits, second if the user is near the bin and then if that is true it should insert the record into the db
export async function reviewBin(bin_long: number, bin_lat: number, type:string, reviewing_user: string, reported_state: string) {
  const [check] = await connection`
    SELECT bins_reported_today
    FROM trash_user
    WHERE username=${reviewing_user}
  `;
  let advice = "empty";
  if (!check) {
    advice = "No user found";
  } else if (check.bins_reported_today === 0) {
    console.log("You reached your daily limit for bins reviews");
    advice = "You reached your daily limit for bins reviews";
  } else {
    try {
      const bin = await getBinID(bin_long, bin_lat, type);
      if (!bin) {
        throw new Error("Cannot find bin");
      }
      const [query] = await connection`
        INSERT INTO bin_review (reviewed_bin, reviewing_user, reported_state)
        SELECT
          ${bin.bin_id},
          (SELECT user_id FROM trash_user WHERE username=${reviewing_user}),
          (SELECT state_id FROM bin_state WHERE state=${reported_state})
        RETURNING bin_rev_id, reviewed_at
      `

      // In this case the field reviewed_at is not inserted manually cause in the schema the field is set to DEFAULT now()
      if (!query) {
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
      console.error("Review bin failed:", e);
      advice = "Something went wrong";
    }
  }
  return advice;
}

// TODO: A user can vote multiple times without limits and can also vote for its own reviews, MUST fix
// Increase the "useful counter" of a given bin review
export async function usefulBinRev(bin_long: number, bin_lat: number, bin_type: string, username: string, date_time: Date) {
  const revId = await getBinRevID(bin_long, bin_lat, bin_type, username, date_time);
  if (revId === null) {
    return "Review not found";
  }
  const [row] = await connection`
    UPDATE bin_review SET useful = useful + 1
    WHERE bin_rev_id = ${revId}
    RETURNING reviewing_user
  `;
  try {
    await computeUserRank(row.reviewing_user); // the author's reliability changed
  } catch (e) {
    console.error("Rank update failed:", e);
  }
  return "Vote registered";
}

// TODO: A user can vote multiple times without limits and can also vote for its own reviews, MUST fix
// Increase the "not useful counter" of a given bin review
export async function notUsefulBinRev(bin_long: number, bin_lat: number, bin_type: string, username: string, date_time: Date) {
  const revId = await getBinRevID(bin_long, bin_lat, bin_type, username, date_time);
  if (revId === null) {
    return "Review not found";
  }
  const [row] = await connection`
    UPDATE bin_review SET not_useful = not_useful + 1
    WHERE bin_rev_id = ${revId}
    RETURNING reviewing_user
  `;
  try {
    await computeUserRank(row.reviewing_user); // the author's reliability changed
  } catch (e) {
    console.error("Rank update failed:", e);
  }
  return "Vote registered";
}

// This function must "remove" a bin from the db if the latest reported state is
export async function removeBin(bin_long: number, bin_lat: number, type: string) {
  // This query gets the latest review of a given trashbin
  try {
    const bin = await getBinID(bin_long, bin_lat, type);
    if (!bin) {
      throw new Error("Cannot find bin");
    }
    const [rev_bin] = await connection`
      SELECT br.reviewed_bin, br.reliable, bs.state_id, bs.state, br.reviewed_at, (br.reviewed_at < now() - INTERVAL '30 days') AS is_stale
      FROM bin_review br
      JOIN bin_state bs ON bs.state_id = br.reported_state
      WHERE br.reviewed_bin = ${bin.bin_id}
      ORDER BY br.reviewed_at DESC, br.bin_rev_id DESC
      LIMIT 1
    `;
      /*const [rev_bin] = await connection`
        WITH selected_bin AS (
          SELECT bn.bin_id
          FROM trashbin bn
          JOIN bin_type bt ON bt.type_id = bn.type
          WHERE bt.type = ${type} AND ST_DWithin(
            bn.location,
            ST_SetSRID(ST_MakePoint(${bin_long}, ${bin_lat}), 4326)::geography,
            1
          ) -- Gets all the bins in that position and in a radius of one meter
          ORDER BY bn.location <-> ST_SetSRID(ST_MakePoint(${bin_long}, ${bin_lat}), 4326)::geography -- Operand <-> returns the distance between two spatial values
          LIMIT 1
        )
        SELECT br.reviewed_bin, br.reliable, bs.state_id, bs.state, br.reviewed_at, (br.reviewed_at < now() - INTERVAL '30 days') AS is_stale
        FROM bin_review br
        JOIN selected_bin sb ON sb.bin_id = br.reviewed_bin
        JOIN bin_state bs ON bs.state_id = br.reported_state
        ORDER BY br.reviewed_at DESC
        LIMIT 1
      `;*/
      // is_stale is used to check if the review the query found is older than 30 days
    if (!rev_bin) {
      throw new Error("Unable to find bin review");
      //return "An error has occured";
    }
    if (!(rev_bin.is_stale && rev_bin.state === "Removed" && rev_bin.reliable)) {
      //throw new Error("Bin not removed");
      return "Bin not removed";
    }

    const [update] = await connection`
      UPDATE trashbin
      SET status = (SELECT status_id FROM bin_status WHERE status='Inactive')
      WHERE bin_id = ${rev_bin.reviewed_bin}
        AND status = (SELECT status_id FROM bin_status WHERE status = 'Active') -- So that we don't overwrite "Removed by Admin"
      RETURNING bin_id, reporting_user
    `;

    if (!update) {
      //throw new Error("Unable to update trashbin table");
      return "Bin not removed (already inactive or removed by admin)";
    }

    // A rank error must not turn a successful removal into a failure
    try {
      // Getting reporting_user from the update query so that I do not have to make another redundant query
      await computeUserRank(update.reporting_user);
    } catch (e) {
      console.error("Rank update failed:", e);
    }

    return "Removal successful";
  } catch (e) {
    console.error("Bin removal failed: ", e);
    return "Bin removal unsuccessful";
  }
}

// Returns the trashbin ID given specific parameters
export async function getBinID(longitude: number, latitude: number, type: string) {
  const [bin] = await connection`
    SELECT bn.bin_id
    FROM trashbin bn
    JOIN bin_type bt ON bt.type_id = bn.type
    WHERE bt.type = ${type} AND ST_DWithin(
      bn.location,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      1
    ) -- Gets all the bins in that position and in a radius of one meter
    ORDER BY bn.location <-> ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography -- Operand <-> returns the distance between two spatial values
    LIMIT 1
  `;
  return bin ?? null;
}

// Returns the bin revuew ID given specific parameters
export async function getBinRevID(bin_long: number, bin_lat: number, bin_type:string, username: string, date_time: Date): Promise<number | null>{
  const trashbin = await getBinID(bin_long, bin_lat, bin_type);
  const user = await getUserID(username);
  if (!trashbin || !user) return null;

  const [rev] = await connection`
    SELECT bin_rev_id
    FROM bin_review
    WHERE reviewed_bin = ${trashbin.bin_id}
      AND reviewing_user = ${user.user_id}
      AND reviewed_at >= ${date_time}
      AND reviewed_at <  ${new Date(date_time.getTime() + 1)}
    ORDER BY reviewed_at DESC
    LIMIT 1
  `;
  return rev?.bin_rev_id ?? null;
}

export async function getLatestBinRevID(bin_long: number, bin_lat: number, bin_type: string): Promise<number | null> {
  const trashbin = await getBinID(bin_long, bin_lat, bin_type);
  if (!trashbin) return null;

  const [rev] = await connection`
    SELECT bin_rev_id
    FROM bin_review
    WHERE reviewed_bin = ${trashbin.bin_id}
    ORDER BY reviewed_at DESC, bin_rev_id DESC
    LIMIT 1
  `;

  return rev?.bin_rev_id ?? null;
}

// This function returns all the public trashbin data given a specific ID
export async function getBinData() {

}

// This function returns all the public bin review data given a specific ID
export async function getBinRevData() {

}

//TODO: Functions for bins search with filters

//####################################################################################################################################
//------------------------------------------------## User Related Functions ##--------------------------------------------------------
//####################################################################################################################################

// This function must check the user's daily limits and then if the user is inside the limits it should insert the record into the db
export async function reviewUser(title: string, body: string, vote: number, reviewed_user: string, reviewing_user: string) {
  let advice = "empty";
  //The vote variable must be passed using a number from 0 to 100:
  if (!Number.isFinite(vote) || vote < 0 || vote > 100) {
    advice = "Invalid vote value";
  } else if (reviewed_user === reviewing_user) {
    advice = "Users can't review themselves";
  } else {
    vote = vote / 100;
    const [check] = await connection`
      SELECT users_reviewed_today
      FROM trash_user
      WHERE username=${reviewing_user}
    `;
    if (!check) {
      advice = "No user found";
    } else if (check.users_reviewed_today === 0) {
      console.log("You reached your daily limit for users reviews");
      advice = "You reached your daily limit for users reviews";
    } else {
      try {
        const [query] = await connection`
          INSERT INTO user_review (title, body, vote, reviewed_user, reviewing_user)
          SELECT
            ${title}::TEXT,
            ${body}::TEXT,
            ${vote}::NUMERIC(5, 4),
            (SELECT user_id FROM trash_user WHERE username=${reviewed_user}),
            (SELECT user_id FROM trash_user WHERE username=${reviewing_user})
          RETURNING user_rev_id, date_time, reviewed_user
        `;
        // In this case the field date_time is not inserted manually cause in the schema the field is set to DEFAULT now()
        if (!query) {
          throw new Error("Nothing was inserted");
        }
        await connection`
          UPDATE trash_user
          SET users_reviewed_today = (users_reviewed_today - 1)
          WHERE username=${reviewing_user}
        `;

        // The reviewed user's score depends on the votes they receive, so recompute it.
        // Own try/catch: a rank error must not turn a saved review into a failure.
        try {
          await computeUserRank(query.reviewed_user);
        } catch (e) {
          console.error("Rank update failed:", e);
        }

        console.log("User reviewed successfully!");
        advice = "User reviewed successfully!";
      } catch (e) {
        console.error("Review user failed: ", e);
        advice = "Something went wrong";
      }
    }
  }
  return advice;
}

// This function updates the bin state based off of the recent bin reviews
// export async function updateBinState(bin_long: number, bin_lat: number, type: number) {
  // Is it really necessary?
// }

// This function must let a new user register to the site
//  First we check if the username already exists
//  Then we check if the email is correct
//  Then we check the password and if it respects the criteria we hash it
export async function registerNewUser(email: string, username: string, password: string, timezone?: string) {
  let em_flag = false; // if email is already in use =true
  let usr_flag = false; // if username already in use =true
  let pw_len_flag = false; // if password is too short =true
  let pw_num_flag = false; // if password does not contain any number =true
  let pw_spec_flag = false; // if password does not contain any special character =true
  let advice = "";

  // An invalid or missing timezone must not block the registration
  const tz = timezone && (await isValidTimezone(timezone)) ? timezone : "Europe/Rome";

  // This removes spaces and anything that is NOT a letter, number, @, ., -, or _
  const clean_email = email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();

  const [email_check] = await connection`
    SELECT EXISTS(
      SELECT user_id
      FROM trash_user
      WHERE email=${clean_email}
    ) AS email_exists
  `;

  em_flag = email_check.email_exists;
  //if (email_check.length !== 0) {
    //em_flag = true;
  //}

  const [usr_check] = await connection`
    SELECT EXISTS(
      SELECT user_id
      FROM trash_user
      WHERE username=${username}
    ) AS usrname_exists
  `;

  usr_flag = usr_check.usrname_exists;
  //if (usr_check.length !== 0) {
    //usr_flag = true;
  //}


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
        INSERT INTO trash_user (email, username, password, rank, role, new_bins_reported_today, bins_reported_today, users_reviewed_today, timezone)
        SELECT
          ${clean_email}::TEXT,
          ${username}::TEXT,
          ${hash}::TEXT,
          (SELECT rank_id FROM user_rank WHERE rank_name='Rifiuto Della Società'),
          (SELECT role_id FROM user_role WHERE role='Registered User'),
          (SELECT daily_new_bins_report FROM user_rank WHERE rank_name='Rifiuto Della Società'),
          (SELECT daily_bins_report FROM user_rank WHERE rank_name='Rifiuto Della Società'),
          (SELECT daily_users_review FROM user_rank WHERE rank_name='Rifiuto Della Società'),
          ${tz}::TEXT
        RETURNING user_id
      `;
      if (!query) {
        throw new Error("Nothing was inserted");
      }
      advice = "User added successfully!";
    } catch (e) {
      console.error("User registration failed: ", e);
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
export async function userLogin(username: string, password: string, timezone?: string) {
  const [query] = await connection`
    SELECT username, password
    FROM trash_user
    WHERE username=${username}
  `;
  if (!query) {
    return "Invalid credentials";
    //return "No such username"; This would reveal an attacker important informations
  }
  const pw_ok = await Bun.password.verify(password, query.password); // true / false
  if (!pw_ok) {
    return "Invalid credentials";
    //return "Incorrect password" This would reveal an attacker important informations
  }
  // Only after the password is verified, apply the timezone and the daily reset
  await startUserRequest(username, timezone);
  return "Auth successfull";
}

//TODO: Understand where to use this function

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

  if (!seniority) return "Calculation failed";

  const [n_users_reviewed] = await connection`
    SELECT COUNT(*)::int AS total
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

  /*const points = await connection`
    SELECT minimum_score
    FROM user_rank
    ORDER BY minimum_score ASC
    `;*/

  console.log("total points:", total_pts);

  const ranks = await connection`
    SELECT rank_id, minimum_score
    FROM user_rank
    ORDER BY minimum_score ASC
  `;
  let rankId: number | null = null;
  for (const r of ranks) {
    if (total_pts >= r.minimum_score) rankId = r.rank_id;
  }

  //for (let i = 0; i < 5; i++) {
    //if (total_pts >= points[i]?.minimum_score) {
      //usrRank = userRanks[i] ?? "";
    //}
  //}

  // This UPDATE only sets the rank.
  // It no longer overwrites the daily counters:
  // they are restored only by resetDailyUserData, from the user's current rank.
  if (rankId !== null) {
    await connection`
      UPDATE trash_user
      SET rank = ${rankId}
      WHERE user_id = ${userID}
    `;
  } else {
    return "Calculation failed";
  }

}

// Returns the user ID given specific parameters
export async function getUserID(username: string) {
  const [user] = await connection`
      SELECT user_id
      FROM trash_user
      WHERE username = ${username}
    `;
  return user ?? null;
}

// Returns the user review ID given specific parameters
export async function getUserRevID(reviewed_user: string, reviewing_user: string, date_time: Date): Promise<number | null> {
  const rows = await connection`
    SELECT ur.user_rev_id
    FROM user_review ur
    JOIN trash_user reviewed  ON reviewed.user_id  = ur.reviewed_user
    JOIN trash_user reviewing ON reviewing.user_id = ur.reviewing_user
    WHERE reviewed.username  = ${reviewed_user}
      AND reviewing.username = ${reviewing_user}
      AND ur.date_time >= ${date_time}
      AND ur.date_time <  ${new Date(date_time.getTime() + 1)}
    ORDER BY ur.date_time DESC
    LIMIT 1
  `;
  return rows[0]?.user_rev_id ?? null;
}

export async function getLatestUserRevID(reviewed_user: string): Promise<number | null> {
  const [revedUsr] = await getUserID(reviewed_user);

  if (!revedUsr) return null;

  const [rev] = await connection`
    SELECT user_rev_id
    FROM user_review
    WHERE reviewed_user = ${revedUsr.user_id}
    ORDER BY date_time DESC, user_rev_id DESC
    LIMIT 1
  `;

  return rev?.user_rev_id ?? null;
}

// This function returns all the public user data given a specific ID
export async function getUserData() {

}

// This function returns all the public user review data given a specific ID
export async function getUserRevData() {

}

//####################################################################################################################################
//--------------------------------------------## Timezone and DataUsage Related Functions ##------------------------------------------
//####################################################################################################################################

// True if Postgres knows this IANA name (e.g. "Europe/Rome").
// An invalid name inside AT TIME ZONE would make the reset query fail for everyone.
export async function isValidTimezone(tz: string): Promise<boolean> {
  const [r] = await connection`
    SELECT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = ${tz}) AS ok
  `;
  return r!.ok;
}

// Restores the daily counters to the user's rank limits for every user whose last
// reset happened on an earlier calendar day IN THEIR OWN TIMEZONE.
// Advice: safe to call any number of times.
// With a username it resets only that user.
// Returns how many users were reset.
export async function resetDailyUserData(username?: string): Promise<number> {
  // This could be done in three ways:
  // 1. checking a given arbitrary time server-side and reset all the users at the same time
  // 2. we could add a time-zone to user entity and reset everytime a certain time-zone reaches midnight
  // 3. we could execute the reset everytime the user does something while also checking the date
  const rows = await connection`
      UPDATE trash_user u
      SET new_bins_reported_today = r.daily_new_bins_report,
          bins_reported_today     = r.daily_bins_report,
          users_reviewed_today    = r.daily_users_review,
          last_data_usage_reset   = now()
      FROM user_rank r
      WHERE r.rank_id = u.rank
        AND (u.last_data_usage_reset AT TIME ZONE u.timezone)::date
            < (now() AT TIME ZONE u.timezone)::date
        AND (${username ?? null}::text IS NULL OR u.username = ${username ?? null})
      RETURNING u.user_id
    `;
    return rows.length;
}

// Changes the user's timezone.
// Returns a message describing the outcome.
export async function updateUserTimezone(username: string, timezone: string) {
  const [user] = await connection`
    SELECT timezone FROM trash_user WHERE username = ${username}
  `;
  if (!user) return "No user found";
  if (user.timezone === timezone) return "Timezone unchanged"; // the usual case: one query only
  if (!(await isValidTimezone(timezone))) return "Invalid timezone";

  await resetDailyUserData(username); // settle a pending reset under the OLD zone first
  await connection`
    UPDATE trash_user
    SET timezone = ${timezone},
        last_data_usage_reset = now()   -- no free extra reset right after switching
    WHERE username = ${username}
  `;
  return "Timezone updated";
}

//TODO: Understand where to use this function

// Call this once at the start of every request that reads or spends usage data.
// A rejected or invalid timezone is ignored on purpose: it must never fail the request.
// Routes: call startUserRequest first in every route that touches usage data
export async function startUserRequest(username: string, timezone?: string) {
  if (timezone) {
    await updateUserTimezone(username, timezone);
  }
  await resetDailyUserData(username);
}

export async function serverRequestsThrottling() {

}
