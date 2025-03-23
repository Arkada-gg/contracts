import { HardhatRuntimeEnvironment } from 'hardhat/types';

const ADDRESS = '0x30410050CB1eBCF21741c9D3F817C386401f82fd';

export const checkPyramidMint = async (
  hre: HardhatRuntimeEnvironment,
  address: string,
  campaign_id: string,
): Promise<boolean> => {
  const contractABI = [
    'event PyramidClaim(string questId, uint256 indexed tokenId, address indexed claimer, uint256 price, uint256 rewards, uint256 issueNumber, string walletProvider, string embedOrigin)',
  ];
  const contract = new hre.ethers.Contract(
    ADDRESS,
    contractABI,
    hre.ethers.provider,
  );

  const filter = contract.filters.PyramidClaim(
    null,
    null,
    address,
    null,
    null,
    null,
    null,
    null,
  );
  const events = await contract.queryFilter(filter, 4627750, 'latest');

  return (
    events.filter((event) => event.args?.questId === campaign_id).length > 0
  );
};
