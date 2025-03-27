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
    const userPointsWithCampaignId = (
      await client.query(
        `
    SELECT * FROM user_points
    WHERE campaign_id IS NOT NULL
    ORDER BY created_at ASC;`,
      )
    ).rows;
    console.log(
      `Found ${userPointsWithCampaignId.length} user points with campaign id\n`,
    );
    const timeOfFirstRecordWithCampaignId = new Date(
      userPointsWithCampaignId[0].created_at,
    );

    const campaignsCompletitions = (
      await client.query(
        `
    SELECT * FROM campaign_completions
    WHERE completed_at >= to_timestamp($1);`,
        [Math.floor(timeOfFirstRecordWithCampaignId.getTime() / 1000)],
      )
    ).rows;
    console.log(
      `Found ${campaignsCompletitions.length} campaignsCompletitions from ${timeOfFirstRecordWithCampaignId}\n`,
    );

    const userPointsMap = new Map();
    userPointsWithCampaignId.forEach((p) => {
      userPointsMap.set(`${p.campaign_id}-${p.user_address.toLowerCase()}`, p);
    });

    const completitionsWithoutPointsAwarded = campaignsCompletitions.filter(
      (compl) =>
        !userPointsMap.has(
          `${compl.campaign_id}-${compl.user_address.toLowerCase()}`,
        ),
    );
    console.log(completitionsWithoutPointsAwarded);
    console.log(`${completitionsWithoutPointsAwarded.length} missing points\n`);

    const missingCampaignsIds = new Set(
      completitionsWithoutPointsAwarded.map((e) => e.campaign_id),
    );
    console.log(
      `${Array.from(missingCampaignsIds).length} unique campaign ids\n`,
    );

    const campaignsInfo = (
      await client.query(
        `
    SELECT * FROM campaigns
    WHERE id = ANY($1);`,
        [Array.from(missingCampaignsIds)],
      )
    ).rows;

    const mysteries = new Map();
    campaignsInfo.forEach((c) => {
      if (c.event_type === 'mystery') {
        mysteries.set(c.id, c);
      }
    });
    console.log(
      'Mystery campaigns count: ',
      Array.from(mysteries.values()).length,
    );

    const missingByMisteries = completitionsWithoutPointsAwarded.filter(
      (compl) => mysteries.has(compl.campaign_id),
    );
    console.log('Mystery missings count: ', missingByMisteries.length);

    const countsByUser = new Map();
    completitionsWithoutPointsAwarded.forEach((c) => {
      const address = c.user_address.toLowerCase();
      const prev = countsByUser.get(address) ?? 0;
      countsByUser.set(address, prev + 1);
    });
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
