import { LogDescription } from '@ethersproject/abi';
import { Log } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const getPyrAddress = (chainId: number) => {
  switch (chainId) {
    case 1868:
      return '0x30410050CB1eBCF21741c9D3F817C386401f82fd';
    case 146:
      return '0xE99F2AEfff9CCff34832747479Bd84658495F50A';
    default:
      throw new Error('Invalid chain id');
  }
};
const getFromBlock = (chainId: number) => {
  switch (chainId) {
    case 1868:
      return 4627750;
    case 146:
      return 16332267;
    default:
      throw new Error('Invalid chain id');
  }
};

const PYRAMID_CLAIM_TOPIC =
  '0x7b7188b14b1a89406b609ab3d2c18b85c1e7ee16c9165d63fc527274207e494f';
const CHUNK_SIZE = 20000; // Number of blocks to fetch in each chunk

export const getPyramidMintEventsAndFormat = async (
  hre: HardhatRuntimeEnvironment,
  chainId: number,
) => {
  const provider = hre.ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  const startBlock = getFromBlock(chainId);
  const address = getPyrAddress(chainId);

  const pyramidAbi = [
    'event PyramidClaim(string questId, uint256 indexed tokenId, address indexed claimer, uint256 price, uint256 rewards, uint256 issueNumber, string walletProvider, string embedOrigin)',
  ];
  const intface = new hre.ethers.utils.Interface(pyramidAbi);

  const result = new Map<string, { decoded: LogDescription; raw: Log }>();

  // Fetch events in chunks
  for (
    let fromBlock = startBlock;
    fromBlock <= currentBlock;
    fromBlock += CHUNK_SIZE
  ) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);

    console.log(`Fetching events from block ${fromBlock} to ${toBlock}`);

    const logs = await provider.getLogs({
      address,
      topics: [PYRAMID_CLAIM_TOPIC],
      fromBlock,
      toBlock,
    });

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
  }

  return result;
};
