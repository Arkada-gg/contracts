import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

interface IData {
  points: number;
  count: number;
}

const func = async (hre: HardhatRuntimeEnvironment) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  try {
    const usersPoints = (
      await client.query(
        `
    SELECT * FROM user_points
    WHERE point_type = 'base_campaign'
    AND created_at >= to_timestamp($1)
    ORDER BY created_at ASC;`,
        [Math.floor(new Date('2025-03-17 00:00:00').getTime() / 1_000_000)],
      )
    ).rows;
    console.log(usersPoints.length);

    const pointsSumByIserAddress = new Map<string, IData>();
    usersPoints.forEach((p) => {
      const address = p.user_address.toLowerCase();
      const prev = pointsSumByIserAddress.get(address);
      pointsSumByIserAddress.set(address, {
        points: (prev?.points ?? 0) + p.points,
        count: (prev?.count ?? 0) + 1,
      });
    });

    const campaigns = (
      await client.query(
        `
    SELECT id,rewards FROM campaigns;`,
      )
    ).rows;
    const rewardsById = new Map();
    campaigns.forEach((c) => {
      rewardsById.set(
        c.id,
        c.rewards.reduce(
          (r: number, c: { value: string }) => r + Number(c.value),
          0,
        ),
      );
    });

    const campaignsCompletitions = (
      await client.query(
        `
    SELECT campaign_id,user_address FROM campaign_completions
    WHERE completed_at >= to_timestamp($1);`,
        [Math.floor(new Date('2025-03-17 00:00:00').getTime() / 1_000_000)],
      )
    ).rows;
    console.log(campaignsCompletitions.length);
    const totalCompleted = new Map<string, IData>();
    campaignsCompletitions.forEach((p) => {
      const address = p.user_address.toLowerCase();
      const campaignRew = rewardsById.get(p.campaign_id) ?? 0;
      const prev = pointsSumByIserAddress.get(address);
      totalCompleted.set(address, {
        points: (prev?.points ?? 0) + campaignRew,
        count: (prev?.count ?? 0) + 1,
      });
    });

    const mismatched: {
      address: string;
      up: number;
      upCount: number;
      cc: number;
      ccCount: number;
      diff: number;
      diffCount: number;
    }[] = [];
    Array.from(totalCompleted.keys()).forEach((address) => {
      const cc = totalCompleted.get(address);
      const up = pointsSumByIserAddress.get(address);
      const ccPoints = cc?.points ?? 0;
      const upPoints = up?.points ?? 0;
      const upCount = up?.count ?? 0;
      const ccCount = cc?.count ?? 0;
      if (upCount !== ccCount) {
        mismatched.push({
          address,
          up: upPoints,
          upCount,
          cc: ccPoints,
          ccCount,
          diff: Math.max(upPoints, ccPoints) - Math.min(upPoints, ccPoints),
          diffCount: Math.max(upCount, ccCount) - Math.min(upCount, ccCount),
        });
      }
    });
    // const find = mismatched.find(
    //   ({ address }) => '0x4ddbe53bffcb118fd92c70815f984230a0926613' === address,
    // );
    // console.log(find);
    console.log(mismatched.sort((a, b) => a.diffCount - b.diffCount)[0]);
    console.log('Missmatched count: ', mismatched.length);
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
