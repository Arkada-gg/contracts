import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

import { getDailyCheckEventsAndFormat } from './helpers/get-and-format-events';

import { delay } from '../../../helpers/utils';
import { formatLogToAlchemyWebhook } from '../helpers/format-logs';
import { signAlchemyWebhook } from '../helpers/sign-webhook-data';

const WEBHOOK_URL = process.env.ALCHEMY_WEBHOOK_URL;

// base block 4808436 23.03.2025 ± 18pm UTC
// blocks per day if block mines every 2s = 43200
const BLOCKS_PER_DAY = 43200;
const TO_BLOCK = 4592431;
const FROM_BLOCK = TO_BLOCK - BLOCKS_PER_DAY;

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

    const existingTxs = await client.query(
      `
      SELECT hash 
      FROM transactions 
      WHERE event_name = 'DailyCheck'
      AND hash = ANY($1);
      `,
      [filteredTxs.map(({ raw }) => raw.transactionHash)],
    );

    const existingTxHashes = new Set(
      existingTxs.rows.map((row) => row.hash.toLowerCase()),
    );
    const notExistedTxs = filteredTxs.filter(
      ({ raw }) => !existingTxHashes.has(raw.transactionHash.toLowerCase()),
    );
    console.log('Transactions that need to be added:', notExistedTxs.length);
    const alchemyData = await Promise.all(
      notExistedTxs.map(({ raw }) => formatLogToAlchemyWebhook(raw, 1868)),
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
    console.log('All sent!!! <-----------------------');
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
