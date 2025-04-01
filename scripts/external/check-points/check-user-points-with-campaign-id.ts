import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Client } from 'pg';

interface UserPoint {
  user_address: string;
  campaign_id: string;
  points: number;
  created_at: Date;
  points_before: number;
  points_after: number;
}

interface CampaignCompletion {
  user_address: string;
  campaign_id: string;
  completed_at: Date;
}

const func = async (hre: HardhatRuntimeEnvironment) => {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_URL,
  });
  console.log('--------> Connecting to postgres...');
  await client.connect();
  console.log('--------> Postgres client connected.\n');

  try {
    const result = await client.query(
      'SELECT * FROM user_points WHERE campaign_id IS NOT NULL ORDER BY created_at ASC',
    );
    console.log('Found user points with campaign IDs:', result.rows.length);

    const firstRecord = result.rows[0];
    console.log('First user points record:', firstRecord);

    const completionsResult = await client.query(
      'SELECT * FROM campaign_completions WHERE completed_at >= $1 ORDER BY completed_at ASC',
      [firstRecord.created_at],
    );

    console.log(
      'Found campaign completions after first record:',
      completionsResult.rows.length,
    );

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

    // Create maps for easier comparison
    const userPointsMap = new Map<string, UserPoint>();
    const completionsMap = new Map<string, CampaignCompletion>();

    // Group user points by user_address and campaign_id
    result.rows.forEach((row: UserPoint) => {
      const key = `${row.user_address.toLowerCase()}-${row.campaign_id}`;
      userPointsMap.set(key, row);
    });

    // Group completions by user_address and campaign_id
    completionsResult.rows.forEach((row: CampaignCompletion) => {
      const key = `${row.user_address.toLowerCase()}-${row.campaign_id}`;
      completionsMap.set(key, row);
    });

    // Find mismatches
    const mismatches = new Map<
      string,
      {
        pointsWithoutCompletions: UserPoint[];
        completionsWithoutPoints: CampaignCompletion[];
      }
    >();

    // Check for points without completions
    userPointsMap.forEach((point: UserPoint, key) => {
      if (!completionsMap.has(key)) {
        const [userAddress] = key.split('-');
        if (!mismatches.has(userAddress.toLowerCase())) {
          mismatches.set(userAddress.toLowerCase(), {
            pointsWithoutCompletions: [],
            completionsWithoutPoints: [],
          });
        }
        mismatches
          .get(userAddress.toLowerCase())!
          .pointsWithoutCompletions.push(point);
      }
    });

    // Check for completions without points
    completionsMap.forEach((completion: CampaignCompletion, key) => {
      if (!userPointsMap.has(key)) {
        const [userAddress] = key.split('-');
        if (!mismatches.has(userAddress.toLowerCase())) {
          mismatches.set(userAddress.toLowerCase(), {
            pointsWithoutCompletions: [],
            completionsWithoutPoints: [],
          });
        }
        mismatches
          .get(userAddress.toLowerCase())!
          .completionsWithoutPoints.push(completion);
      }
    });

    console.log(Array.from(mismatches.entries()));

    // Insert missing points
    console.log('\nInserting missing points...');
    let insertedCount = 0;

    const time = new Date('2025-03-31 19:55').toISOString();

    for (const [userAddress, mismatch] of mismatches.entries()) {
      for (const completion of mismatch.completionsWithoutPoints) {
        const campaignReward = rewardsById.get(completion.campaign_id);
        if (!campaignReward) {
          console.log(
            `Warning: No reward found for campaign ${completion.campaign_id}`,
          );
          continue;
        }

        // Get the latest points for this user
        const latestPointsResult = await client.query(
          `SELECT points_after FROM user_points
           WHERE user_address = $1
           AND created_at <= $2
           ORDER BY created_at DESC
           LIMIT 1`,
          [userAddress.toLowerCase(), time],
        );

        const pointsBefore = latestPointsResult.rows[0]?.points_after || 0;
        const rewards = Math.floor(campaignReward * 1.2);
        const pointsAfter = pointsBefore + rewards;

        await client.query(
          `INSERT INTO user_points
           (user_address, campaign_id, points, points_before, points_after, created_at, point_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userAddress.toLowerCase(),
            completion.campaign_id,
            rewards,
            pointsBefore,
            pointsAfter,
            time,
            'base_campaign',
          ],
        );
        insertedCount++;
      }
    }

    console.log(`Successfully inserted ${insertedCount} missing points`);
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
