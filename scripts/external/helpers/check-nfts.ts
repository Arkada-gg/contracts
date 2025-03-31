import { Interface } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const nftConfigs = [
  {
    address: '0x2877Da93f3b2824eEF206b3B313d4A61E01e5698'.toLowerCase(),
    multiplier: 1.1,
  },
  {
    address: '0x181b42ca4856237AE76eE8c67F8FF112491eCB9e'.toLowerCase(),
    multiplier: 1.2,
  },
];

const MulticallAbi = [
  'function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)',
];

export const checkNFTAndGetMultiplier = async (
  hre: HardhatRuntimeEnvironment,
  userAddress: string,
): Promise<number> => {
  try {
    const minimalAbi = ['function hasMinted(address) view returns (bool)'];
    const iface = new Interface(minimalAbi);

    // Prepare multicall data
    const calls = nftConfigs.map((config) => ({
      target: config.address,
      callData: iface.encodeFunctionData('hasMinted', [userAddress]),
    }));

    // Create multicall contract instance
    const multicallContract = new hre.ethers.Contract(
      MULTICALL_ADDRESS,
      MulticallAbi,
      hre.ethers.provider,
    );

    // Execute multicall
    const { returnData } = await multicallContract.aggregate.staticCall(calls);

    // Process results and find highest multiplier
    let highestMultiplier = 1.0;
    for (let i = 0; i < nftConfigs.length; i++) {
      try {
        const decoded = iface.decodeFunctionResult('hasMinted', returnData[i]);
        if (decoded[0]) {
          highestMultiplier = Math.max(
            highestMultiplier,
            nftConfigs[i].multiplier,
          );
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(
            `Error decoding result for ${nftConfigs[i].address}: ${error.message}`,
          );
        }
      }
    }

    return highestMultiplier;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error in checkNFTAndGetMultiplier: ${error.message}`);
    }
    return 1.0; // Return default multiplier in case of error
  }
};
