import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ARKADA_ERC721_ROYALTY_WITH_TRADE_CONTRACT_NAME } from '../../config';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  console.log('deployer', { deployer });

  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying ArkadaERC721RoyaltyWithTrade...');

  // initialise params <=========
  const NAME = 'Arkada Shogun: The Whispering Void Gauntlets';
  const SYMBOL = 'ArkadaShogunGauntlets';
  const BASE_URI =
    'https://ipfs.io/ipfs/bafybeif4wgv6w6bx3owmk25k5qj6yvjprazccsejjzhf5lj6dianelqfxq';
  const MINT_PRICE = hre.ethers.utils.parseEther('0.002');
  const MINT_DEADLINE = Math.floor(Date.now() / 1000) - 86400 * 35; // 30 days from now
  const PAYMENT_RECIPIENT = '0x4a665E6785556624324637695C4A20465D5D7b74';
  const OWNER = '0x4a665E6785556624324637695C4A20465D5D7b74';
  const TRADE_ERC721 = '0x39dF84267Fda113298d4794948B86026EFD47e32';
  // =====================

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(
      ARKADA_ERC721_ROYALTY_WITH_TRADE_CONTRACT_NAME,
      owner,
    ),
    [
      NAME,
      SYMBOL,
      BASE_URI,
      MINT_PRICE,
      MINT_DEADLINE,
      PAYMENT_RECIPIENT,
      OWNER,
      TRADE_ERC721,
    ],
    {
      unsafeAllow: ['constructor'],
    },
  );

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }

  await logDeployProxy(
    hre,
    ARKADA_ERC721_ROYALTY_WITH_TRADE_CONTRACT_NAME,
    deployment.address,
  );
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
