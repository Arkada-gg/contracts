import { BigNumber } from 'ethers';
import { Client } from 'pg';

import fs from 'fs';
import path from 'path';

import { ITxData } from './sync-txs';

import { delay } from '../../../../../helpers/utils';

export interface IUserData {
  points: number;
  maxStreak: number;
  address: string;
  checksCount: number;
}

const BATCH_SIZE = 250;

const getDailyPointsUserAddresses = async (
  client: Client,
  fromTimestamp: number,
) => {
  const result = await client.query(
    `
    SELECT DISTINCT user_address
    FROM user_points
    WHERE point_type = 'daily' AND created_at > to_timestamp($1);
  `,
    [fromTimestamp],
  );

  return result.rows.map((row) => row.user_address.toLowerCase());
};

export const syncUsersPoints = async (fromTimestamp: number) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  const dir = 'scripts-data/from-block';
  const filePathPoints = path.join(dir, 'users-points.json');
  const filePathTxs = path.join(dir, 'tx.json');

  const usersPointsJson = fs.readFileSync(filePathPoints, 'utf-8');
  const usersPointsObj: Record<string, IUserData> = JSON.parse(usersPointsJson);

  const txsJson = fs.readFileSync(filePathTxs, 'utf-8');
  const txs: ITxData[] = JSON.parse(txsJson);

  try {
    await client.query('BEGIN');

    console.log('Filtering transactions by existing users...');
    const addressesFromTxs = Object.keys(usersPointsObj);
    console.log('Total addresses from events: ', addressesFromTxs.length);

    const existingUsers = await client.query(
      `SELECT address FROM users WHERE address = ANY($1)`,
      [addressesFromTxs],
    );
    const filteredAddresses = existingUsers.rows.map((r) =>
      r.address.toLowerCase(),
    );
    console.log(
      'Total addresses by users filtering: ',
      filteredAddresses.length,
    );

    const filteredTxs = txs.filter((tx) => {
      const args = JSON.parse(tx.args);
      const caller = args[0];
      if (!caller) return false;
      return filteredAddresses.includes(caller.toLowerCase());
    });
    console.log('Total txs after filtering: ', filteredTxs.length);

    const filteredUsersPoints = filteredAddresses
      .map((address) => usersPointsObj[address])
      .filter((obj) => !!obj);
    console.log(
      'Total users points after filtering: ',
      filteredUsersPoints.length,
    );
    console.log('Transactions filtered...\n');

    console.log(
      `Removing daily points from users.points from timestamp: ${fromTimestamp}...\n`,
    );

    const addressesExistedInUsersPointsTable =
      await getDailyPointsUserAddresses(client, fromTimestamp);

    console.log(
      'addressesExistedInUsersPointsTable length: ',
      addressesExistedInUsersPointsTable.length,
    );

    for (
      let i = 0;
      i < addressesExistedInUsersPointsTable.length;
      i += BATCH_SIZE
    ) {
      const batch = addressesExistedInUsersPointsTable.slice(i, i + BATCH_SIZE);

      await client.query(
        `
        CREATE TEMP TABLE temp_users_backup AS
        SELECT address, points AS old_points FROM users
        WHERE address = ANY($1);
      `,
        [batch],
      );

      const updateResult = await client.query(
        `
        UPDATE users
        SET points = GREATEST(0, users.points - COALESCE((
            SELECT SUM(up.points)
            FROM user_points up
            WHERE up.user_address = users.address
            AND up.point_type = 'daily' AND created_at > to_timestamp($2)
        ), 0))
        WHERE address = ANY($1);
      `,
        [batch, fromTimestamp],
      );

      const result = await client.query(
        `
        SELECT u.address,
               ub.old_points,
               u.points AS new_points,
               (ub.old_points - u.points) AS points_deducted
        FROM users u
        JOIN temp_users_backup ub ON u.address = ub.address
        WHERE ub.old_points <> u.points
        AND (ub.old_points - u.points) > 0;
      `,
      );

      const updatedUsersPointsCount = updateResult.rowCount;
      const checkHowMuchUpdatedCorrect = result.rowCount;
      console.log(updatedUsersPointsCount, checkHowMuchUpdatedCorrect);
      if (updatedUsersPointsCount !== checkHowMuchUpdatedCorrect)
        throw new Error('Check failed');

      await client.query('DROP TABLE temp_users_backup');
      console.log(
        `Removed daily points for batch ${i / BATCH_SIZE + 1} batch size: ${
          batch.length
        }`,
      );

      if (batch.length === BATCH_SIZE) {
        console.log('Waiting for 3 sec before next batch');
        await delay(3000);
      }
    }
    console.log('\nDaily points removed from users.points\n');

    console.log(
      'Deleting all operated daily points from users_points table...',
    );
    await client.query(
      "DELETE FROM user_points WHERE point_type = 'daily' AND created_at > to_timestamp($1);",
      [fromTimestamp],
    );
    console.log('All operated daily points deleted from users_points table.\n');

    console.log('Updating user.points...\n');
    for (let i = 0; i < filteredUsersPoints.length; i += BATCH_SIZE) {
      const batch = filteredUsersPoints.slice(i, i + BATCH_SIZE);

      const currentPointsResult = await client.query(
        `SELECT address, points FROM users WHERE address = ANY($1)`,
        [batch.map((u) => u.address.toLowerCase())],
      );

      const currentPointsMap = new Map(
        currentPointsResult.rows.map((row) => [
          row.address.toLowerCase(),
          row.points,
        ]),
      );

      const query = `
        UPDATE users
        SET points = users.points + data.new_points
        FROM jsonb_to_recordset($1::jsonb)
        AS data(user_address text, new_points int)
        WHERE users.address = data.user_address
      `;
      await client.query(query, [
        JSON.stringify(
          batch.map((i) => ({
            user_address: i.address.toLowerCase(),
            new_points: i.points,
          })),
        ),
      ]);

      const updatedPointsResult = await client.query(
        `SELECT address, points FROM users WHERE address = ANY($1)`,
        [batch.map((u) => u.address.toLowerCase())],
      );

      // Check if points were correctly updated
      const failedUpdates = [];
      for (const row of updatedPointsResult.rows) {
        const expectedPoints =
          currentPointsMap.get(row.address.toLowerCase()) +
          batch.find(
            (u) => u.address?.toLowerCase() === row.address.toLowerCase(),
          )?.points;
        if (row.points !== expectedPoints) {
          failedUpdates.push({
            address: row.address.toLowerCase(),
            expected: expectedPoints,
            actual: row.points,
          });
        }
      }

      if (failedUpdates.length > 0) {
        console.error('Failed updates:', failedUpdates);
        throw new Error('Points update validation failed');
      }
      console.log(
        `Updated points for batch ${i / BATCH_SIZE + 1} batch size: ${
          batch.length
        }`,
      );

      if (batch.length === BATCH_SIZE) {
        console.log('Waiting for 3 sec before next batch');
        await delay(3000);
      }
    }
    console.log('\nUsers points updated.\n');

    console.log('Inserting points to user_points...\n');
    for (let i = 0; i < filteredTxs.length; i += BATCH_SIZE) {
      const batch = filteredTxs.slice(i, i + BATCH_SIZE);
      const query = `
        INSERT INTO user_points (user_address, points, point_type)
        VALUES
          ${batch
            .map(
              (_, index) =>
                `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`,
            )
            .join(', ')}
      `;

      const values = batch.flatMap((item) => {
        const args = JSON.parse(item.args);
        const caller = args[0].toLowerCase();
        const streakNumber = +BigNumber.from(args[1]);
        const points = streakNumber < 30 ? streakNumber : 30;
        return [caller, points, 'daily'];
      });

      await client.query(query, values);
      console.log(
        `Inserted for batch ${i / BATCH_SIZE + 1} batch size: ${batch.length}`,
      );

      if (batch.length === BATCH_SIZE) {
        console.log('Waiting for 3 sec before next batch');
        await delay(3000);
      }
    }
    console.log('\nPoints inserted to user_points...\n');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error((error as Error).message);
  }
};
