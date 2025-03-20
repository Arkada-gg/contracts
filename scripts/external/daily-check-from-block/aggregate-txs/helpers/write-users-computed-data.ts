import fs from 'fs';
import path from 'path';

import { DailyCheckEvent } from '../../../../../typechain-types/contracts/DailyCheck';

interface IUserData {
  points: number;
  maxStreak: number;
  address: string;
  checksCount: number;
}

type UsersData = Record<string, IUserData>;

export const writeUsersComputedData = (events: DailyCheckEvent[]) => {
  const usersData: UsersData = {};

  for (const event of events) {
    const caller = event.args.caller.toLowerCase();
    const streak = +event.args.streak;

    const pointsDependsOnStreak = streak > 30 ? 30 : streak;

    const prevData = usersData[caller] || {
      address: caller,
      points: 0,
      checksCount: 0,
      maxStreak: 0,
    };

    prevData.points += pointsDependsOnStreak;
    prevData.checksCount += 1;
    prevData.maxStreak = Math.max(prevData.maxStreak, streak);

    usersData[caller] = prevData;
  }

  const dir = 'scripts-data/from-block';
  const filePath = path.join(dir, 'users-points.json');

  // Ensure the directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(usersData, null, 2), 'utf8');
};
