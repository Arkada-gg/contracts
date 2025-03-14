import { expect } from 'chai';
import { ethers } from 'hardhat';

import {
  // eslint-disable-next-line camelcase
  ArkadaERC721Royalty__factory,
  // eslint-disable-next-line camelcase
  ArkadaERC721RoyaltyWithTrade__factory,
  // eslint-disable-next-line camelcase
  ArkadaRewarder__factory,
  // eslint-disable-next-line camelcase
  DailyCheck__factory,
  // eslint-disable-next-line camelcase
  MockERC721__factory,
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [owner, paymentsRecipient, operator, ...regularAccounts] =
    await ethers.getSigners();

  // Deploy mock ERC721 for trading
  const mockERC721 = await new MockERC721__factory(owner).deploy();
  await mockERC721.deployed();

  // main contracts
  const dailyCheck = await new DailyCheck__factory(owner).deploy();
  await dailyCheck.initialize();

  const mintPrice = ethers.utils.parseEther('0.1');
  const mintDeadline = Math.floor(Date.now() / 1000) + 86400 * 5;

  const arkadaERC721Royalty = await new ArkadaERC721Royalty__factory(
    owner,
  ).deploy();
  await expect(
    arkadaERC721Royalty.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      0,
      mintDeadline,
      paymentsRecipient.address,
      owner.address,
    ),
  ).to.be.revertedWith('invalid price');
  await expect(
    arkadaERC721Royalty.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      mintPrice,
      mintDeadline,
      ethers.constants.AddressZero,
      owner.address,
    ),
  ).to.be.revertedWith('invalid recipient');
  await expect(
    arkadaERC721Royalty.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      mintPrice,
      mintDeadline,
      paymentsRecipient.address,
      ethers.constants.AddressZero,
    ),
  ).to.be.revertedWith('invalid owner');

  await arkadaERC721Royalty.initialize(
    'ArkadaNFT',
    'ARK',
    'ipfs://base_uri/',
    mintPrice,
    mintDeadline,
    paymentsRecipient.address,
    owner.address,
  );

  const arkadaERC721RoyaltyWithTrade =
    await new ArkadaERC721RoyaltyWithTrade__factory(owner).deploy();
  await expect(
    arkadaERC721RoyaltyWithTrade.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      0,
      mintDeadline,
      paymentsRecipient.address,
      owner.address,
      mockERC721.address,
    ),
  ).to.be.revertedWith('invalid price');
  await expect(
    arkadaERC721RoyaltyWithTrade.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      mintPrice,
      mintDeadline,
      ethers.constants.AddressZero,
      owner.address,
      mockERC721.address,
    ),
  ).to.be.revertedWith('invalid recipient');
  await expect(
    arkadaERC721RoyaltyWithTrade.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      mintPrice,
      mintDeadline,
      paymentsRecipient.address,
      ethers.constants.AddressZero,
      mockERC721.address,
    ),
  ).to.be.revertedWith('invalid owner');
  await expect(
    arkadaERC721RoyaltyWithTrade.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      mintPrice,
      mintDeadline,
      paymentsRecipient.address,
      owner.address,
      ethers.constants.AddressZero,
    ),
  ).to.be.revertedWith('invalid trade ERC721');

  await arkadaERC721RoyaltyWithTrade.initialize(
    'ArkadaNFT',
    'ARK',
    'ipfs://base_uri/',
    mintPrice,
    mintDeadline,
    paymentsRecipient.address,
    owner.address,
    mockERC721.address,
  );

  await arkadaERC721Royalty.setOperator(operator.address);
  await arkadaERC721RoyaltyWithTrade.setOperator(operator.address);

  const arkadaRewarder = await new ArkadaRewarder__factory(owner).deploy();
  await arkadaRewarder.initialize(operator.address);

  return {
    owner,
    regularAccounts,
    dailyCheck,
    mintPrice,
    mintDeadline,
    paymentsRecipient,
    operator,
    arkadaERC721Royalty,
    arkadaERC721RoyaltyWithTrade,
    arkadaRewarder,
    mockERC721,
  };
};
