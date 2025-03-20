import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { syncTxs } from './helpers/sync-txs';
import { syncUsersPoints } from './helpers/sync-users-points';

const FROM_BLOCK_NUMBER = 4417962;

const func = async (hre: HardhatRuntimeEnvironment) => {
  console.log('From block number: ', FROM_BLOCK_NUMBER);
  const provider = hre.ethers.provider;
  const block = await provider.getBlock(FROM_BLOCK_NUMBER);
  const blockTimestampInSeconds = block.timestamp;
  console.log('Block timestamp: ', blockTimestampInSeconds);

  console.log('--------> Reading txs data and syncing with pg db...');
  await syncTxs(FROM_BLOCK_NUMBER);

  console.log('--------------------------------------------\n');

  console.log('--------> Syncing users points...');
  await syncUsersPoints(blockTimestampInSeconds);
  console.log('--------> Users points synced.');

  process.exit(0);
};

func(hre)
  .then(console.log)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
