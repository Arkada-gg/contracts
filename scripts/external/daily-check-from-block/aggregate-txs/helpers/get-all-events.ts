import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { delay } from '../../../../../helpers/utils';
import { DailyCheck } from '../../../../typechain-types';
import { DailyCheckEvent } from '../../../../typechain-types/contracts/DailyCheck';

const DAILY_CHECK_ADDRESS = '0x98826e728977B25279ad7629134FD0e96bd5A7b2';

export const getAllDailyCheckEvents = async (
  hre: HardhatRuntimeEnvironment,
  startBlock?: number,
): Promise<DailyCheckEvent[]> => {
  const provider = hre.ethers.provider;
  const latestBlock = await provider.getBlockNumber(); // Get latest block

  const dailyCheckContract: DailyCheck = await hre.ethers.getContractAt(
    'DailyCheck',
    DAILY_CHECK_ADDRESS,
  );

  const filter =
    dailyCheckContract.filters['DailyCheck(address,uint256,uint256)']();

  const CHUNK_SIZE = 15000; // Prevents large queries that can time out

  let fromBlock = startBlock ?? 0;
  let toBlock = Math.min(fromBlock + CHUNK_SIZE, latestBlock);

  const allEvents: DailyCheckEvent[] = [];

  while (fromBlock <= latestBlock) {
    try {
      const events = await queryWithRetry(
        dailyCheckContract,
        filter,
        fromBlock,
        toBlock,
      );
      allEvents.push(...events);
    } catch (error) {
      console.error(
        `Failed to fetch events from ${fromBlock} to ${toBlock}:`,
        error,
      );
      break; // Exit on failure after retries
    }

    fromBlock = toBlock + 1;
    toBlock = Math.min(fromBlock + CHUNK_SIZE, latestBlock);
  }

  return allEvents.sort((a, b) => a.blockNumber - b.blockNumber);
};

async function queryWithRetry(
  contract: DailyCheck,
  filter: any,
  fromBlock: number,
  toBlock: number,
  retries = 2,
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await contract.queryFilter(filter, fromBlock, toBlock);
    } catch (error) {
      if (attempt < retries - 1) {
        console.warn(`Retrying queryFilter... Attempt ${attempt + 1}`);
        await delay(2000 * (attempt + 1)); // Exponential backoff
      } else {
        throw error; // Fail after max retries
      }
    }
  }
}
