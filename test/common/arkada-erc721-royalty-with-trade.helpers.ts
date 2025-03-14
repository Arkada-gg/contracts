import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish } from 'ethers';

import { OptionalCommonParams } from './common.helpers';

import { ArkadaERC721RoyaltyWithTrade } from '../../typechain-types';

type CommonParams = {
  arkadaErc721RoyaltyWithTradeContract: ArkadaERC721RoyaltyWithTrade;
  owner: SignerWithAddress;
};

interface ISetTradeERC721Test extends CommonParams {
  tradeERC721: string;
}
export const setTradeERC721Test = async (
  {
    arkadaErc721RoyaltyWithTradeContract,
    owner,
    tradeERC721,
  }: ISetTradeERC721Test,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyWithTradeContract
        .connect(sender)
        .setTradeERC721(tradeERC721),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    arkadaErc721RoyaltyWithTradeContract
      .connect(sender)
      .setTradeERC721(tradeERC721),
  ).to.emit(
    arkadaErc721RoyaltyWithTradeContract,
    arkadaErc721RoyaltyWithTradeContract.interface.events[
      'TradeERC721Updated(address,address)'
    ].name,
  ).to.not.reverted;

  const postData = await arkadaErc721RoyaltyWithTradeContract.tradeERC721();
  expect(postData).eq(tradeERC721);
};

interface ITradeNftTest extends CommonParams {
  tokenId: BigNumberish;
  from: SignerWithAddress;
}
export const tradeNftTest = async (
  { arkadaErc721RoyaltyWithTradeContract, tokenId, from }: ITradeNftTest,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? from;

  if (opt?.revertMessage) {
    await expect(
      arkadaErc721RoyaltyWithTradeContract.connect(sender).tradeNft(tokenId),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const totalMintedBefore =
    await arkadaErc721RoyaltyWithTradeContract.totalMinted();

  await expect(
    arkadaErc721RoyaltyWithTradeContract.connect(sender).tradeNft(tokenId),
  ).to.emit(
    arkadaErc721RoyaltyWithTradeContract,
    arkadaErc721RoyaltyWithTradeContract.interface.events[
      'NFTMinted(address,address,uint256)'
    ].name,
  ).to.not.reverted;

  const totalMintedAfter =
    await arkadaErc721RoyaltyWithTradeContract.totalMinted();
  expect(totalMintedAfter.sub(totalMintedBefore)).eq(1);

  // Verify the new token is owned by the sender
  const newTokenId = totalMintedAfter;
  expect(await arkadaErc721RoyaltyWithTradeContract.ownerOf(newTokenId)).eq(
    sender.address,
  );
};

// Re-export helpers from arkada-erc721-royalty.helpers.ts
export {
  mintNFTTest,
  mintNFTToTest,
  setBaseURITest,
  setMintDeadlineTest,
  setMintPriceTest,
  setOnePerWalletTest,
  setOperatorTest,
  setPaymentRecipientTest,
  setRoyaltyTest,
} from './arkada-erc721-royalty.helpers';
