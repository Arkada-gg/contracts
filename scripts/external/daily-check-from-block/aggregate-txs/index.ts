import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getAllDailyCheckEvents } from './helpers/get-all-events';
import { writeTxs } from './helpers/write-txs';
import { writeUsersComputedData } from './helpers/write-users-computed-data';

const FROM_BLOCK_NUMBER = 4417962;

const func = async (hre: HardhatRuntimeEnvironment) => {
  console.log('Getting and sorting events...');
  const sortedEvents = await getAllDailyCheckEvents(hre, FROM_BLOCK_NUMBER);
  console.log('Events loaded!');

  console.log('--------------------------------------------');

  console.log(
    'Generating txs records and writing to file (<root>/scripts-data/from-block/tx.json)...',
  );
  writeTxs(sortedEvents);
  console.log('Txs recorded!');

  console.log('--------------------------------------------');

  console.log(
    'Calculating users points and writing to file (<root>/scripts-data/from-block/users-points.json)...',
  );
  writeUsersComputedData(sortedEvents);
  console.log('Points recorded!');

  process.exit(0);
};

func(hre).then(console.log).catch(console.error);
