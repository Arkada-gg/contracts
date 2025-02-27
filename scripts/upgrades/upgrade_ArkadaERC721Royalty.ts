import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ARKADA_ERC721_ROYALTY_CONTRACT_NAME } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log(
    'Upgrading ArkadaERC721Royalty at address:',
    addresses?.arkadaErc721Royalty,
  );
  const deployment = await hre.upgrades.upgradeProxy(
    addresses?.arkadaErc721Royalty ?? '',
    await hre.ethers.getContractFactory(
      ARKADA_ERC721_ROYALTY_CONTRACT_NAME,
      owner,
    ),
    {
      unsafeAllow: ['constructor'],
    },
  );
  console.log('Upgraded ArkadaERC721Royalty:', deployment.address);

  await logDeployProxy(
    hre,
    ARKADA_ERC721_ROYALTY_CONTRACT_NAME,
    deployment.address,
  );
  console.log('Waiting 5 blocks to verify...');
  if (deployment.deployTransaction) {
    await deployment.deployTransaction.wait(5);
  }
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
