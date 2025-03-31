import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

const func = async (hre: HardhatRuntimeEnvironment) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  try {
    const query = `
      WITH user_points_sum AS (
        SELECT 
          user_address,
          SUM(points) as total_points
        FROM user_points
        GROUP BY user_address
      )
      SELECT 
        u.address,
        u.points as users_table_points,
        COALESCE(ups.total_points, 0) as calculated_points,
        u.points - COALESCE(ups.total_points, 0) as points_difference,
        CASE 
          WHEN u.points != COALESCE(ups.total_points, 0) THEN 'MISMATCH'
          ELSE 'MATCH'
        END as status
      FROM users u
      LEFT JOIN user_points_sum ups ON u.address = ups.user_address
      WHERE u.points != COALESCE(ups.total_points, 0)
      ORDER BY u.address;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      console.log(
        'No mismatches found! All points are correctly synchronized.',
      );
    } else {
      console.log(`Found ${result.rows.length} mismatches:\n`);

      const sortedDescByDif = result.rows.sort(
        (a, b) => a.points_difference - b.points_difference,
      );

      console.log(sortedDescByDif[0]);
      console.log(sortedDescByDif[sortedDescByDif.length - 1]);

      const positive = sortedDescByDif.filter((a) => a.points_difference > 0);
      console.log('Positives count: ', positive.length);
      const negative = sortedDescByDif.filter((a) => a.points_difference < 0);
      console.log('Negatives count: ', negative.length);

      // Update points in users table to match calculated points
      const updateQuery = `
        WITH user_points_sum AS (
          SELECT
            user_address,
            SUM(points) as total_points
          FROM user_points
          GROUP BY user_address
        )
        UPDATE users u
        SET points = COALESCE(ups.total_points, 0)
        FROM user_points_sum ups
        WHERE u.address = ups.user_address
        AND u.points != COALESCE(ups.total_points, 0)
        RETURNING address, points as new_points;
      `;

      console.log('\nUpdating points in users table...');
      const updateResult = await client.query(updateQuery);
      console.log(`Updated ${updateResult.rows.length} users`);

      // Verify the update
      const verifyQuery = `
        WITH user_points_sum AS (
          SELECT
            user_address,
            SUM(points) as total_points
          FROM user_points
          GROUP BY user_address
        )
        SELECT COUNT(*) as remaining_mismatches
        FROM users u
        LEFT JOIN user_points_sum ups ON u.address = ups.user_address
        WHERE u.points != COALESCE(ups.total_points, 0);
      `;

      const verifyResult = await client.query(verifyQuery);
      console.log(
        `Remaining mismatches after update: ${verifyResult.rows[0].remaining_mismatches}`,
      );
    }
  } catch (error) {
    console.error('Error processing campaign completions:', error);
    throw error;
  } finally {
    await client.end();
  }
};

func(hre)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
