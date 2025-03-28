import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

import { getPyramidMintEventsAndFormat } from '../helpers/get-and-format-events';

const CHUNK_SIZE = 1000;

async function processEventsChunk(
  client: Client,
  eventsChunk: any[],
  chainId: number,
  addressToPyramidsCount: Map<string, number>,
): Promise<any[]> {
  const valuesPlaceholder = eventsChunk
    .map(
      (_, i) =>
        `($${i * 3 + 1}::TEXT, $${i * 3 + 2}::INT, $${i * 3 + 3}::UUID)`,
    )
    .join(', ');

  const values = eventsChunk.flatMap(({ decoded }) => {
    const claimer = decoded.args.claimer.toLowerCase();
    return [claimer, addressToPyramidsCount.get(claimer), decoded.args.questId];
  });

  const query = `
    WITH input_data (user_address, count, campaign_id) AS (
      VALUES ${valuesPlaceholder}
    )
    SELECT
      input_data.user_address,
      input_data.count,
      input_data.campaign_id
    FROM input_data
    LEFT JOIN users c 
      ON c.address = input_data.user_address
    WHERE COALESCE((c.pyramids_info->>'${chainId}')::jsonb->>'basic', '0')::int != input_data.count;
  `;

  return (await client.query(query, values)).rows;
}

const func = async (hre: HardhatRuntimeEnvironment) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  try {
    const formattedEvents = await getPyramidMintEventsAndFormat(hre);

    const eventsValues = Array.from(formattedEvents.values());
    console.log('Total events found: ', eventsValues.length);

    const addressToPyramidsCount = new Map<string, number>();

    eventsValues.forEach(({ decoded }) => {
      const claimer = decoded.args.claimer.toLowerCase();
      const prev = addressToPyramidsCount.get(claimer) ?? 0;
      addressToPyramidsCount.set(claimer, prev + 1);
    });

    const chainId = await hre.ethers.provider
      .getNetwork()
      .then((network) => network.chainId);

    // Process events in chunks
    const allMismatches: any[] = [];
    for (let i = 0; i < eventsValues.length; i += CHUNK_SIZE) {
      const chunk = eventsValues.slice(i, i + CHUNK_SIZE);
      console.log(
        `Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(
          eventsValues.length / CHUNK_SIZE,
        )}`,
      );
      const chunkMismatches = await processEventsChunk(
        client,
        chunk,
        chainId,
        addressToPyramidsCount,
      );
      allMismatches.push(...chunkMismatches);
    }

    console.log(`Found ${allMismatches.length} total mismatches`);

    // Start transaction
    await client.query('BEGIN');

    try {
      const dataToSetMap = new Map();
      allMismatches.forEach((m) => {
        dataToSetMap.set(m.user_address, {
          user_address: m.user_address,
          count: JSON.stringify(m.count),
        });
      });
      const dataToSet = Array.from(dataToSetMap.values());
      console.log(
        `Found ${dataToSet.length} unique pyramids counters mismatches to process\n`,
      );

      console.log('Data to set: ', dataToSet);

      // Update pyramids_info and points for all users in a single query
      const updateValues = dataToSet.map((m) => [m.user_address, m.count]);

      const updatePlaceholders = updateValues
        .map((_, i) => `($${i * 2 + 1}::TEXT, $${i * 2 + 2}::jsonb)`)
        .join(', ');

      await client
        .query(
          `WITH update_data (user_address, count) AS (
          VALUES ${updatePlaceholders}
        )
        UPDATE users u
        SET
          pyramids_info = jsonb_set(
            jsonb_set(
              COALESCE(pyramids_info, '{}'::jsonb),
              '{${chainId}}',
              '{}'::jsonb
            ),
            '{${chainId},basic}',
            ud.count
          )
        FROM update_data ud
        WHERE u.address = ud.user_address`,
          updateValues.flat(),
        )
        .then((r) => console.log('Users updated: ', r.rowCount));

      // Commit transaction
      await client.query('COMMIT');
      console.log('Successfully processed all missing counters');
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Error processing updates:', error);
      throw error;
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
