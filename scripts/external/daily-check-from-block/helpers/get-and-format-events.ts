import { HardhatRuntimeEnvironment } from 'hardhat/types';

const ADDRESS = '0x98826e728977B25279ad7629134FD0e96bd5A7b2';
const CHECK_TOPIC =
  '0x9774279daef4087e16967484080e062b1dc082b02454370036c7854cb6fcc386';

export const getDailyCheckEventsAndFormat = async (
  hre: HardhatRuntimeEnvironment,
  fromBlock: number,
  toBlock: number,
) => {
  const provider = hre.ethers.provider;

  // Get logs by topic
  const logs = await provider.getLogs({
    address: ADDRESS,
    topics: [CHECK_TOPIC],
    fromBlock,
    toBlock,
  });

  const checkAbi = [
    'event DailyCheck(address indexed caller, uint256 streak, uint256 timestamp)',
  ];
  const intface = new hre.ethers.utils.Interface(checkAbi);

  return logs.map((log) => {
    const decoded = intface.parseLog(log);
    return {
      decoded,
      raw: log,
    };
  });
};
