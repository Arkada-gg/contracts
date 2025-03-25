import { LogDescription } from '@ethersproject/abi';
import { Log } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const ADDRESS = '0x30410050CB1eBCF21741c9D3F817C386401f82fd';
const PYRAMID_CLAIM_TOPIC =
  '0x7b7188b14b1a89406b609ab3d2c18b85c1e7ee16c9165d63fc527274207e494f';

export const getPyramidMintEventsAndFormat = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const provider = hre.ethers.provider;

  // Get logs by topic
  const logs = await provider.getLogs({
    address: ADDRESS,
    topics: [PYRAMID_CLAIM_TOPIC],
    fromBlock: 4627750,
    toBlock: 'latest',
  });

  const pyramidAbi = [
    'event PyramidClaim(string questId, uint256 indexed tokenId, address indexed claimer, uint256 price, uint256 rewards, uint256 issueNumber, string walletProvider, string embedOrigin)',
  ];
  const intface = new hre.ethers.utils.Interface(pyramidAbi);

  const result = new Map<string, { decoded: LogDescription; raw: Log }>();
  logs.forEach((log) => {
    const decoded = intface.parseLog(log);
    result.set(
      `${decoded.args.questId}-${decoded.args.claimer.toLowerCase()}`,
      {
        decoded,
        raw: log,
      },
    );
  });

  return result;
};
