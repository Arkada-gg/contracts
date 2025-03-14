import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';

import { OptionalCommonParams } from './common.helpers';

import {
  ArkadaERC721Royalty,
  ArkadaERC721RoyaltyWithTrade,
} from '../../typechain-types';

type CommonParams = {
  arkadaErc721RoyaltyContract:
    | ArkadaERC721Royalty
    | ArkadaERC721RoyaltyWithTrade;
  owner: SignerWithAddress;
};

interface ISetMintPriceTest extends CommonParams {
  mintPrice: BigNumberish;
}
export const setMintPriceTest = async (
  { arkadaErc721RoyaltyContract, owner, mintPrice }: ISetMintPriceTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract.connect(sender).setMintPrice(mintPrice),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).setMintPrice(mintPrice),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'MintPriceUpdated(address,uint256)'
    ].name,
  ).to.not.reverted;

  const postData = await arkadaErc721RoyaltyContract.mintPrice();

  expect(postData).eq(mintPrice);
};

interface ISetMintDeadlineTest extends CommonParams {
  deadline: BigNumberish;
}
export const setMintDeadlineTest = async (
  { arkadaErc721RoyaltyContract, owner, deadline }: ISetMintDeadlineTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract.connect(sender).setMintDeadline(deadline),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).setMintDeadline(deadline),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'MintDeadlineUpdated(address,uint256)'
    ].name,
  ).to.not.reverted;

  const postData = await arkadaErc721RoyaltyContract.mintDeadline();

  expect(postData).eq(deadline);
};

interface ISetPaymentRecipientTest extends CommonParams {
  recipient: string;
}
export const setPaymentRecipientTest = async (
  { arkadaErc721RoyaltyContract, owner, recipient }: ISetPaymentRecipientTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract
        .connect(sender)
        .setPaymentRecipient(recipient),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).setPaymentRecipient(recipient),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'PaymentRecipientUpdated(address,address)'
    ].name,
  ).to.not.reverted;

  const postData = await arkadaErc721RoyaltyContract.paymentRecipient();

  expect(postData).eq(recipient);
};

interface ISetOperatorTest extends CommonParams {
  operator: string;
}
export const setOperatorTest = async (
  { arkadaErc721RoyaltyContract, owner, operator }: ISetOperatorTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract.connect(sender).setOperator(operator),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).setOperator(operator),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'OperatorUpdated(address,address)'
    ].name,
  ).to.not.reverted;

  const postData = await arkadaErc721RoyaltyContract.operator();

  expect(postData).eq(operator);
};

interface ISetRoyaltyTest extends CommonParams {
  receiver: string;
  royalty: number; // percent like 1=1%, 5, 7
  priceToCheck: BigNumber;
}
export const setRoyaltyTest = async (
  {
    arkadaErc721RoyaltyContract,
    owner,
    receiver,
    royalty,
    priceToCheck,
  }: ISetRoyaltyTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const percentToSubmit = royalty * 100;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract
        .connect(sender)
        .setRoyalty(receiver, percentToSubmit),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract
      .connect(sender)
      .setRoyalty(receiver, percentToSubmit),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'RoyaltyUpdated(address,address,uint96)'
    ].name,
  ).to.not.reverted;

  const [receiverOnchain, royaltyToTransfer] =
    await arkadaErc721RoyaltyContract.royaltyInfo(0, priceToCheck);
  expect(receiverOnchain).eq(receiver);
  expect(royaltyToTransfer).eq(priceToCheck.mul(percentToSubmit).div(10000));
};

interface ISetBaseURITest extends CommonParams {
  uri: string;
}
export const setBaseURITest = async (
  { arkadaErc721RoyaltyContract, owner, uri }: ISetBaseURITest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract.connect(sender).setBaseURI(uri),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).setBaseURI(uri),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'BaseURIUpdated(address,string)'
    ].name,
  ).to.not.reverted;
};

interface ISetOnePerWalletTest extends CommonParams {
  enabled: boolean;
}
export const setOnePerWalletTest = async (
  { arkadaErc721RoyaltyContract, owner, enabled }: ISetOnePerWalletTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract.connect(sender).setOnePerWallet(enabled),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).setOnePerWallet(enabled),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'OnePerWalletUpdated(address,bool)'
    ].name,
  ).to.not.reverted;

  expect(await arkadaErc721RoyaltyContract.onlyOnePerWallet()).eq(enabled);
};

interface IMintNFTToTest extends CommonParams {
  to: string;
}
export const mintNFTToTest = async (
  { arkadaErc721RoyaltyContract, owner, to }: IMintNFTToTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract.connect(sender).mintNFTTo(to),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).mintNFTTo(to),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'NFTMinted(address,address,uint256)'
    ].name,
  ).to.not.reverted;

  expect(await arkadaErc721RoyaltyContract.hasMinted(to)).eq(true);
};

interface IMintNFTTest extends CommonParams {
  value: BigNumberish;
}
export const mintNFTTest = async (
  { arkadaErc721RoyaltyContract, owner, value }: IMintNFTTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyContract.connect(sender).mintNFT({ value }),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const paymentsRecipient =
    await arkadaErc721RoyaltyContract.paymentRecipient();

  const paymentsRecipientEthBalanceBefore =
    await arkadaErc721RoyaltyContract.provider.getBalance(paymentsRecipient);

  await expect(
    arkadaErc721RoyaltyContract.connect(sender).mintNFT({ value }),
  ).to.emit(
    arkadaErc721RoyaltyContract,
    arkadaErc721RoyaltyContract.interface.events[
      'NFTMinted(address,address,uint256)'
    ].name,
  ).to.not.reverted;

  const paymentsRecipientEthBalanceAfter =
    await arkadaErc721RoyaltyContract.provider.getBalance(paymentsRecipient);

  expect(
    paymentsRecipientEthBalanceAfter.sub(paymentsRecipientEthBalanceBefore),
  ).eq(value);

  expect(await arkadaErc721RoyaltyContract.hasMinted(sender.address)).eq(true);
};
