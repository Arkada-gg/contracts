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
  const usersData = events.reduce<UsersData>((result, event) => {
    const caller = event.args.caller.toLowerCase();
    const streak = +event.args.streak;

    const pointsDependsOnStreak = streak > 30 ? 30 : streak;

    const prevData = result[caller];

    const recordedPoints = prevData?.points ?? 0;
    const recordedChecksCount = prevData?.checksCount ?? 0;
    const recordedMaxStreak = prevData?.maxStreak ?? 0;

    const userDataToRecord: IUserData = {
      address: caller,
      points: recordedPoints + pointsDependsOnStreak,
      checksCount: recordedChecksCount + 1,
      maxStreak: recordedMaxStreak < streak ? streak : recordedMaxStreak,
    };

    return { ...result, [caller]: userDataToRecord };
  }, {});

  const dir = 'scripts-data';
  const filePath = path.join(dir, 'users-points.json');

  // Ensure the directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(usersData, null, 2), 'utf8');
};
