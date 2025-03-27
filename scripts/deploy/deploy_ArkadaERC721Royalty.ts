import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ARKADA_ERC721_ROYALTY_CONTRACT_NAME } from '../../config';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  console.log('deployer', { deployer });

  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying ArkadaERC721Royalty...');

  // initialise params <=========
  const NAME = 'Arkada Shogun: Echoing Memory Pauldrons';
  const SYMBOL = 'ArkadaShogunPauldrons';
  const BASE_URI =
    'https://ipfs.io/ipfs/bafybeibntccjq4bi2mamjoe2vsbc4kesgpbu3pqt4rrjfqfsl6kissrgl4';
  const MINT_PRICE = hre.ethers.utils.parseEther('0.01');
  const MINT_DEADLINE = Math.floor(Date.now() / 1000) + 86400 * 37; // 30 days from now
  const PAYMENT_RECIPIENT = '0x4a665E6785556624324637695C4A20465D5D7b74';
  const OWNER = '0x4a665E6785556624324637695C4A20465D5D7b74';
  // =====================

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(
      ARKADA_ERC721_ROYALTY_CONTRACT_NAME,
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
    ARKADA_ERC721_ROYALTY_CONTRACT_NAME,
    deployment.address,
  );
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
