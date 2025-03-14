import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ConfigPerNetwork } from '../types/index';
export interface ArkadaAddresses {
  dailyCheck?: string;
  arkadaErc721Royalty?: string;
  arkadaErc721RoyaltyWithTrade?: string;
  arkadaRewarder?: string;
}

export const arkadaAddressesPerNetwork: ConfigPerNetwork<
  ArkadaAddresses | undefined
> = {
  soneium: {
    dailyCheck: '0x98826e728977B25279ad7629134FD0e96bd5A7b2',
    arkadaErc721Royalty: '0x181b42ca4856237AE76eE8c67F8FF112491eCB9e',
    // arkadaErc721RoyaltyWithTrade: '0x181b42ca4856237AE76eE8c67F8FF112491eCB9e',
    // arkadaRewarder: '0x98826e728977B25279ad7629134FD0e96bd5A7b2',
  },
  sepolia: undefined,
  hardhat: undefined,
  localhost: undefined,
};

export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (arkadaAddressesPerNetwork as any)[hre.network.name] as
    | ArkadaAddresses
    | undefined;
};
