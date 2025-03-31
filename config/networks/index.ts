import { HardhatNetworkUserConfig, NetworkUserConfig } from 'hardhat/types';

import { GWEI, MOCK_AGGREGATOR_NETWORK_TAG } from '../constants';
import { ENV } from '../env';
import { ConfigPerNetwork, Network, RpcUrl } from '../types';

const {
  ALCHEMY_KEY,
  INFURA_KEY,
  MNEMONIC_DEV,
  MNEMONIC_PROD,
  PRIVATE_KEY_DEPLOYER,
} = ENV;

export const rpcUrls: ConfigPerNetwork<RpcUrl> = {
  soneium: ALCHEMY_KEY
    ? `https://soneium-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://rpc.soneium.org/`,
  sonic: ALCHEMY_KEY
    ? `https://sonic-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://rpc.soniclabs.com`,
  sepolia: ALCHEMY_KEY
    ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://sepolia.infura.io/v3/${INFURA_KEY}`,
  hardhat: 'http://localhost:8545',
  localhost: 'http://localhost:8545',
};

export const gasPrices: ConfigPerNetwork<number | 'auto' | undefined> = {
  soneium: 'auto',
  sonic: 'auto',
  sepolia: 'auto',
  hardhat: 'auto',
  localhost: 70 * GWEI,
};

export const chainIds: ConfigPerNetwork<number> = {
  soneium: 1868,
  sonic: 146,
  sepolia: 11155111,
  hardhat: 31337,
  localhost: 31337,
};

export const mnemonics: ConfigPerNetwork<string | undefined> = {
  soneium: MNEMONIC_PROD,
  sonic: MNEMONIC_PROD,
  sepolia: MNEMONIC_DEV,
  hardhat: MNEMONIC_DEV,
  localhost: MNEMONIC_DEV,
};

export const gases: ConfigPerNetwork<number | undefined> = {
  soneium: undefined,
  sonic: undefined,
  sepolia: undefined,
  hardhat: undefined,
  localhost: undefined,
};

export const timeouts: ConfigPerNetwork<number | undefined> = {
  soneium: undefined,
  sonic: undefined,
  sepolia: 999999,
  hardhat: undefined,
  localhost: 999999,
};

export const blockGasLimits: ConfigPerNetwork<number | undefined> = {
  soneium: undefined,
  sonic: undefined,
  sepolia: undefined,
  hardhat: 300 * 10 ** 6,
  localhost: undefined,
};

export const initialBasesFeePerGas: ConfigPerNetwork<number | undefined> = {
  soneium: undefined,
  sonic: undefined,
  sepolia: undefined,
  hardhat: 0,
  localhost: undefined,
};

export const getBaseNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
): NetworkUserConfig => ({
  accounts: mnemonics[network]
    ? {
        mnemonic: mnemonics[network],
      }
    : [PRIVATE_KEY_DEPLOYER],
  chainId: chainIds[network],
  gas: gases[network],
  gasPrice: gasPrices[network],
  blockGasLimit: blockGasLimits[network],
  timeout: timeouts[network],
  initialBaseFeePerGas: initialBasesFeePerGas[network],
  tags,
});

export const getNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
  forkingNetwork?: Network,
): NetworkUserConfig => ({
  ...getBaseNetworkConfig(forkingNetwork ?? network, tags),
  url: rpcUrls[network],
  chainId: chainIds[network],
  saveDeployments: true,
});

export const getForkNetworkConfig = (
  network: Network,
  tags: Array<string> = [MOCK_AGGREGATOR_NETWORK_TAG],
): HardhatNetworkUserConfig => ({
  ...getBaseNetworkConfig(network, tags),
  accounts: {
    mnemonic: mnemonics[network],
  },
  live: false,
  saveDeployments: true,
  mining: {
    auto: false,
    interval: 1000,
  },
  forking: {
    url: rpcUrls[network],
    enabled: true,
  },
});

export const getHardhatNetworkConfig = (): HardhatNetworkUserConfig => ({
  ...getBaseNetworkConfig('hardhat'),
  accounts: mnemonics.hardhat ? { mnemonic: mnemonics.hardhat } : undefined,
  saveDeployments: true,
  live: false,
});
