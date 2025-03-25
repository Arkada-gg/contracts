import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

import { getDailyCheckEventsAndFormat } from './helpers/get-and-format-events';

import { delay } from '../../../helpers/utils';
import { formatLogToAlchemyWebhook } from '../helpers/format-logs';
import { signAlchemyWebhook } from '../helpers/sign-webhook-data';

const WEBHOOK_URL = process.env.ALCHEMY_WEBHOOK_URL;

/**
 * Sent for:
 * 1) 4765236 - 4808436 done 22.03-23.03 ±18pm
 * 2) 4722035 - 4765235 done 21.03-22.03 ±18pm
 * 3) 4678834 - 4722034 done 20.03-21.03 ±18pm
 * 4) 4635633 - 4678833 done 19.03-20.03 ±18pm
 * 5) 4592432 - 4635632 done 18.03-19.03 ±18pm
 * 5) 4549231 - 4592431 done 17.03-18.03 ±18pm
 */

// base block 4808436 23.03.2025 ± 18pm UTC
// blocks per day if block mines every 2s = 43200
const BLOCKS_PER_DAY = 43200;
const TO_BLOCK = 4592431;
const FROM_BLOCK = TO_BLOCK - BLOCKS_PER_DAY;

const getDailyPointsUserAddresses = async (
  client: Client,
  from: number,
  to: number,
) => {
  const result = await client.query(
    `
    SELECT DISTINCT user_address
    FROM user_points
    WHERE point_type = 'daily'
    AND created_at >= to_timestamp($1)
    AND created_at <= to_timestamp($2);
  `,
    [from, to],
  );

  return result.rows.map((row) => row.user_address.toLowerCase());
};

const func = async (hre: HardhatRuntimeEnvironment) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');
  try {
    const formattedEvents = await getDailyCheckEventsAndFormat(
      hre,
      FROM_BLOCK,
      TO_BLOCK,
    );
    console.log('Total events found: ', formattedEvents.length);

    console.log('Filtering transactions by existing users...');
    const addressesFromTxs = formattedEvents.map(({ decoded }) =>
      decoded.args.caller.toLowerCase(),
    );
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

    const filteredTxs = formattedEvents.filter(({ decoded }) => {
      const caller = decoded.args.caller?.toLowerCase();
      if (!caller) return false;
      return filteredAddresses.includes(caller);
    });
    console.log('Total txs after filtering: ', filteredTxs.length);

    const fromBlockData = await hre.ethers.provider.getBlock(FROM_BLOCK);
    const toBlockData = await hre.ethers.provider.getBlock(TO_BLOCK);

    console.log(
      '\nRestoring from: ',
      new Date(fromBlockData.timestamp * 1000).toISOString(),
    );
    console.log(
      'Restoring to: %s \n',
      new Date(toBlockData.timestamp * 1000).toISOString(),
    );

    const BATCH_SIZE = 500;
    const userAddressesToClear = await getDailyPointsUserAddresses(
      client,
      fromBlockData.timestamp,
      toBlockData.timestamp,
    );

    console.log(
      'Addresses existed in this time range: ',
      userAddressesToClear.length,
    );

    // Process points updates in batches
    console.log('\nProcessing points updates...');
    for (let i = 0; i < userAddressesToClear.length; i += BATCH_SIZE) {
      const batchAddresses = userAddressesToClear.slice(i, i + BATCH_SIZE);

      try {
        await client.query('BEGIN');

        await client.query(
          `
          UPDATE users
          SET points = GREATEST(0, users.points - COALESCE((
              SELECT SUM(up.points)
              FROM user_points up
              WHERE up.user_address = users.address
              AND up.point_type = 'daily'
              AND created_at >= to_timestamp($2)
              AND created_at <= to_timestamp($3)
          ), 0))
          WHERE address = ANY($1)
        `,
          [batchAddresses, fromBlockData.timestamp, toBlockData.timestamp],
        );
        await client.query(
          `
          DELETE FROM user_points
          WHERE point_type = 'daily'
          AND user_address = ANY($1)
          AND created_at >= to_timestamp($2)
          AND created_at <= to_timestamp($3);`,
          [batchAddresses, fromBlockData.timestamp, toBlockData.timestamp],
        );

        await client.query('COMMIT');

        console.log(
          `Processed points update batch ${i / BATCH_SIZE + 1} of ${Math.ceil(
            userAddressesToClear.length / BATCH_SIZE,
          )}`,
        );
        console.log('Waiting for 15 secs before next batch...\n');
        await delay(15000);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(
          `Error processing points update batch ${i / BATCH_SIZE + 1}:`,
          error,
        );
        throw error;
      }
    }

    // Process transaction deletions in batches
    // console.log('\nProcessing transaction deletions...');
    // const allBatchTxs = filteredTxs.map(({ raw }) => raw.transactionHash);
    // for (let i = 0; i < allBatchTxs.length; i += BATCH_SIZE) {
    //   const batchTxs = allBatchTxs.slice(i, i + BATCH_SIZE);

    //   try {
    //     await client.query('BEGIN');

    //     await client.query(
    //       `
    //       DELETE FROM transactions
    //       WHERE event_name = 'DailyCheck'
    //       AND hash = ANY($1);`,
    //       [batchTxs],
    //     );

    //     await client.query('COMMIT');

    //     console.log(
    //       `Processed transaction deletion batch ${
    //         i / BATCH_SIZE + 1
    //       } of ${Math.ceil(allBatchTxs.length / BATCH_SIZE)}`,
    //     );
    //     console.log('Waiting for 15 secs before next batch...\n');
    //     await delay(15000);
    //   } catch (error) {
    //     await client.query('ROLLBACK');
    //     console.error(
    //       `Error processing transaction deletion batch ${i / BATCH_SIZE + 1}:`,
    //       error,
    //     );
    //     throw error;
    //   }
    // }

    const alchemyData = await Promise.all(
      formattedEvents.map(({ raw }) => formatLogToAlchemyWebhook(raw)),
    );
    const webhookData = alchemyData.map((data) => signAlchemyWebhook(data));

    for (const { payload, signature } of webhookData) {
      try {
        const res = await fetch(WEBHOOK_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Alchemy-Signature': signature,
          },
          body: payload,
        });
        console.log(
          'Webhook sent successfully for transaction:',
          JSON.parse(payload).event.data.block.logs[0].transaction.hash,
        );
        console.log('Status: ', res.status);
        if (res.status > 205 || res.status < 200) throw new Error('not OK');
        console.log('Waiting for 200 ms ...\n');
        await delay(200);
      } catch (error) {
        console.error('Failed to send webhook:', error);
      }
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e);
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
