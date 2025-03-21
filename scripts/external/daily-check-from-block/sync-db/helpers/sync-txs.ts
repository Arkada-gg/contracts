import { Client } from 'pg';

import fs from 'fs';
import path from 'path';

import { IUserData } from './sync-users-points';

import { delay } from '../../../../../helpers/utils';

export interface ITxData {
  hash: string;
  event_name: string;
  block_number: number;
  args: string;
  created_at: string;
}

const BATCH_SIZE = 250;

export const syncTxs = async (fromBlock: number) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  const dir = 'scripts-data/from-block';
  const filePath = path.join(dir, 'tx.json');
  const filePathPoints = path.join(dir, 'users-points.json');

  const txsJson = fs.readFileSync(filePath, 'utf-8');
  const usersPointsJson = fs.readFileSync(filePathPoints, 'utf-8');

  const txs: ITxData[] = JSON.parse(txsJson);
  const usersPointsObj: Record<string, IUserData> = JSON.parse(usersPointsJson);

  try {
    await client.query('BEGIN');

    console.log('Filtering transactions by existing users...');
    console.log(`Total transactions count: ${txs.length}`);
    const addressesFromTxs = Object.keys(usersPointsObj);

    const existingUsers = await client.query(
      `SELECT address FROM users WHERE address = ANY($1)`,
      [addressesFromTxs],
    );
    const filteredAddresses = existingUsers.rows.map((r) =>
      r.address.toLowerCase(),
    );

    const filteredTxs = txs
      .filter((tx) => {
        const args = JSON.parse(tx.args);
        const caller = args[0];
        if (!caller) return false;
        return filteredAddresses.includes(caller.toLowerCase());
      })
      .sort((a, b) => b.block_number - a.block_number)
      .slice(-5000);
    console.log('Total txs after filtering: ', filteredTxs.length);
    console.log('Transactions filtered...\n');

    console.log(`Deleting records from block number: ${fromBlock}...`);
    await client.query(`DELETE FROM transactions WHERE block_number > $1`, [
      fromBlock,
    ]);
    console.log(`Records from block number ${fromBlock} deleted.\n`);

    console.log('Syncing transactions in batches...\n');

    // Process in batches
    for (let i = 0; i < filteredTxs.length; i += BATCH_SIZE) {
      const batch = filteredTxs.slice(i, i + BATCH_SIZE);
      const query = `
      INSERT INTO transactions (hash, event_name, block_number, args, created_at)
      VALUES 
        ${batch
          .map(
            (_, index) =>
              `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${
                index * 5 + 4
              }, $${index * 5 + 5})`,
          )
          .join(', ')}
    `;
      console.log(
        `Inserting batch ${i / BATCH_SIZE + 1} batch size: ${batch.length}...`,
      );
      await client.query(
        query,
        batch.flatMap((tx) => [
          tx.hash,
          tx.event_name,
          tx.block_number,
          tx.args,
          tx.created_at,
        ]),
      );

      if (batch.length === BATCH_SIZE) {
        console.log('Waiting for 3 sec before next batch');
        await delay(3000);
      }
    }

    console.log('\nTransactions synced!\n');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error((error as Error).message);
  }
};
