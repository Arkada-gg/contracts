import fs from 'fs';
import path from 'path';

import { DailyCheckEvent } from '../../../../../typechain-types/contracts/DailyCheck';

interface ITxData {
  hash: string;
  event_name: string;
  block_number: number;
  args: string;
  created_at: string;
}

export const writeTxs = (events: DailyCheckEvent[]) => {
  const txs = events.map<ITxData>((event) => ({
    hash: event.transactionHash,
    event_name: event.event ?? 'Unknown',
    block_number: event.blockNumber,
    args: JSON.stringify(event.args),
    created_at: new Date(event.args.timestamp.toNumber() * 1000).toISOString(),
  }));
  console.log('txs count: ', txs.length);

  const dir = 'scripts-data/from-block';
  const filePath = path.join(dir, 'tx.json');

  // Ensure the directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(txs, null, 2), 'utf8');
};
