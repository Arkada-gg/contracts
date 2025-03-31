import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

import { delay } from '../../../helpers/utils';
import { checkNFTAndGetMultiplier } from '../helpers/check-nfts';
import { getPyramidMintEventsAndFormat } from '../helpers/get-and-format-events';

const func = async (hre: HardhatRuntimeEnvironment) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  const formattedEvents = await getPyramidMintEventsAndFormat(hre);
  console.log(
    'Total events found: ',
    Array.from(formattedEvents.values()).length,
  );

  const mysteryResponse = await client.query(
    `SELECT id,rewards,pyramid_required FROM campaigns WHERE event_type = 'mystery'`,
  );
  const mysteryCampaigns = mysteryResponse.rows;
  console.log(
    'Mystery campaigns Ids: ',
    mysteryCampaigns.map((i) => i.id),
  );

  let totalUsersOperated = 0;

  for (let i = 0; i < mysteryCampaigns.length; i++) {
    const campaignId = mysteryCampaigns[i].id;
    const pyramidRequired = mysteryCampaigns[i].pyramid_required;
    const campaignRewards = mysteryCampaigns[i].rewards.reduce(
      (total: any, rew: any) => total + Number(rew.value),
      0,
    );

    console.log('Campaign id: ', campaignId);
    const questsIdsRes = await client.query(
      `SELECT id FROM quests WHERE campaign_id = $1`,
      [campaignId],
    );

    const questId = questsIdsRes.rows[0].id;
    console.log('Quest Id: ', questId);

    console.log('Campaign rewards: ', campaignRewards);
    console.log('Pyramid mint required: ', pyramidRequired);

    const campaignCompletionRes = await client.query(
      `SELECT user_address FROM campaign_completions WHERE campaign_id = $1`,
      [campaignId],
    );
    const campaignCompletedUsers = new Set(
      campaignCompletionRes.rows.map((r) => r.user_address),
    );
    const questCompletionRes = await client.query(
      `SELECT user_address FROM quest_completions WHERE quest_id = $1`,
      [questId],
    );
    const questCompletedUsers = questCompletionRes.rows.map(
      (r) => r.user_address,
    );

    const missingUsers = questCompletedUsers.filter(
      (user) => !campaignCompletedUsers.has(user),
    );

    if (missingUsers.length === 0) {
      console.log('✅ Users match\n');
      continue;
    }

    totalUsersOperated += missingUsers.length;
    console.log('🚨 Users mismatch: ', missingUsers.length);

    console.log(missingUsers);

    for (let i = 0; i < missingUsers.length; i++) {
      const userAddress = missingUsers[i].toLowerCase();
      console.log('USER OPS: user address: ', userAddress);

      if (pyramidRequired) {
        const mintInfo = formattedEvents.get(`${campaignId}-${userAddress}`);
        if (!mintInfo) {
          console.log('USER OPS: Pyramid not minted 🚨, skipping\n');
          continue;
        }
        console.log('USER OPS: Pyramid minted, operating user...');
      }

      try {
        const multiplier = await checkNFTAndGetMultiplier(hre, userAddress);
        console.log('USER OPS: NFT multiplier: ', multiplier);
        const expectedRewards = Math.floor(campaignRewards * multiplier);
        console.log('USER OPS: expected rewards: ', expectedRewards);

        await client.query('BEGIN');

        console.log(
          'USER OPS: adding campaign completion for user: %s ...',
          userAddress,
        );
        await client.query(
          `INSERT INTO campaign_completions (campaign_id, user_address)
            VALUES ($1, $2)`,
          [campaignId, userAddress],
        );
        console.log('USER OPS: added');

        console.log(
          'USER OPS: adding user_points for user: %s ...',
          userAddress,
        );
        await client.query(
          `INSERT INTO user_points (user_address, points, point_type)
            VALUES ($1, $2, $3)`,
          [userAddress, campaignRewards, 'base_campaign'],
        );
        console.log('USER OPS: added');

        console.log(
          'USER OPS: increasing points for user: %s ...',
          userAddress,
        );
        await client.query(
          ` UPDATE users
            SET points = users.points + $1
            WHERE users.address = $2`,
          [campaignRewards, userAddress],
        );
        console.log('USER OPS: increased');
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(
          `-----------> Error when insert points for user: `,
          userAddress,
        );
      }
      console.log('Waiting for 2 sec before next user...\n');
      await delay(2000);
    }

    console.log('Waiting for 3 sec before next campaign...\n');
    await delay(3000);
  }

  await client.end();
  console.log('\n Total operated addresses: %s ', totalUsersOperated);
  process.exit(0);
};

func(hre)
  .then(console.log)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
