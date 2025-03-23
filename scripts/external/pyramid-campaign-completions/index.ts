import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

import * as crypto from 'crypto';

import { formatLogToAlchemyWebhook } from './helpers/format-logs';
import { getPyramidMintEventsAndFormat } from './helpers/get-and-format-events';

import { delay } from '../../../helpers/utils';

const WEBHOOK_URL = process.env.ALCHEMY_WEBHOOK_URL;

const func = async (hre: HardhatRuntimeEnvironment) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  const formattedEvents = await getPyramidMintEventsAndFormat(hre);

  const eventsValues = Array.from(formattedEvents.values());
  console.log('Total events found: ', eventsValues.length);

  const valuesPlaceholder = eventsValues
    .map((_, i) => `($${i * 2 + 1}::UUID, $${i * 2 + 2}::TEXT)`)
    .join(', ');

  const values = eventsValues.flatMap(({ decoded }) => [
    decoded.args.questId,
    decoded.args.claimer.toLowerCase(),
  ]);

  const query = `
    WITH input_data (campaign_id, user_address) AS (
      VALUES ${valuesPlaceholder}
    )
    SELECT
      input_data.campaign_id,
      input_data.user_address
    FROM input_data
    WHERE NOT EXISTS (
      SELECT 1
      FROM campaign_completions c
      WHERE c.campaign_id = input_data.campaign_id
      AND c.user_address = input_data.user_address
    );
  `;

  try {
    // Get all missing campaign completions
    const missingCompletions = (await client.query(query, values)).rows;
    console.log(
      `Found ${missingCompletions.length} missing campaign completions to process\n`,
    );
    const missingLogs = missingCompletions
      .map(
        (r) => formattedEvents.get(`${r.campaign_id}-${r.user_address}`)?.raw,
      )
      .filter((r) => !!r);

    const alchemyData = await Promise.all(
      missingLogs.map((raw) => formatLogToAlchemyWebhook(raw)),
    );

    const webhookData = alchemyData.map((data) => {
      if (!process.env.ALCHEMY_WEBHOOK_KEY) {
        throw new Error('ALCHEMY_KEY environment variable is not set');
      }
      const payload = JSON.stringify(data);

      // Generate HMAC-SHA256 signature using hex digest to match verification
      const hmac = crypto.createHmac('sha256', process.env.ALCHEMY_WEBHOOK_KEY);
      const signature = hmac.update(payload).digest('hex');

      return {
        payload,
        signature,
      };
    });

    // Now using webhookData to send to Alchemy
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
        console.log('Waiting for 2 secs ...\n');
        await delay(2000);
      } catch (error) {
        console.error('Failed to send webhook:', error);
      }
    }

    console.log('Successfully processed all missing campaign completions');
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
