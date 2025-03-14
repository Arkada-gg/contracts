import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import {
  setBaseURITest,
  setMintDeadlineTest,
  setMintPriceTest,
  setOnePerWalletTest,
  setOperatorTest,
  setPaymentRecipientTest,
  setRoyaltyTest,
  setTradeERC721Test,
  tradeNftTest,
} from './common/arkada-erc721-royalty-with-trade.helpers';
import { defaultDeploy } from './common/fixtures';

// eslint-disable-next-line camelcase

const ZeroAddress = ethers.constants.AddressZero;

describe.only('ArkadaERC721RoyaltyWithTrade', function () {
  it('deployment', async () => {
    await loadFixture(defaultDeploy);
  });

  it('initialize', async () => {
    const {
      owner,
      arkadaERC721RoyaltyWithTrade,
      mintDeadline,
      mintPrice,
      paymentsRecipient,
      mockERC721,
    } = await loadFixture(defaultDeploy);

    await expect(
      arkadaERC721RoyaltyWithTrade.initialize(
        'ArkadaNFT',
        'ARK',
        'ipfs://base_uri/',
        mintPrice,
        mintDeadline,
        paymentsRecipient.address,
        owner.address,
        mockERC721.address,
      ),
    ).revertedWith('Initializable: contract is already initialized');
  });

  describe('setBaseURI()', () => {
    it('should be set', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setBaseURITest({
        arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
        owner,
        uri: 'lalala',
      });
    });

    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setBaseURITest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          uri: 'lalala',
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });
  });

  describe('setRoyalty()', () => {
    it('should be reverted if fee too high', async () => {
      const {
        arkadaERC721RoyaltyWithTrade,
        owner,
        regularAccounts,
        mintPrice,
      } = await loadFixture(defaultDeploy);

      await setRoyaltyTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          receiver: regularAccounts[0].address,
          royalty: 50,
          priceToCheck: mintPrice,
        },
        {
          revertMessage: 'Fee too high',
        },
      );
    });

    it('should be reverted if receiver address invalid', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, mintPrice } =
        await loadFixture(defaultDeploy);

      await setRoyaltyTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          receiver: ZeroAddress,
          royalty: 2,
          priceToCheck: mintPrice,
        },
        {
          revertMessage: 'Invalid receiver',
        },
      );
    });

    it('royalty should be updated', async () => {
      const {
        arkadaERC721RoyaltyWithTrade,
        owner,
        regularAccounts,
        mintPrice,
      } = await loadFixture(defaultDeploy);

      await setRoyaltyTest({
        arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
        owner,
        receiver: regularAccounts[0].address,
        royalty: 2,
        priceToCheck: mintPrice,
      });
    });

    it('should be reverted if sender is not owner', async () => {
      const {
        arkadaERC721RoyaltyWithTrade,
        owner,
        regularAccounts,
        mintPrice,
      } = await loadFixture(defaultDeploy);

      await setRoyaltyTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          receiver: regularAccounts[0].address,
          royalty: 2,
          priceToCheck: mintPrice,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });
  });

  describe('setOperator()', () => {
    it('should be updated', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setOperatorTest({
        arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
        owner,
        operator: regularAccounts[0].address,
      });
    });

    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setOperatorTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          operator: regularAccounts[0].address,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });
  });

  describe('setPaymentRecipient()', () => {
    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setPaymentRecipientTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          recipient: regularAccounts[0].address,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });

    it('should be reverted if recipient address invalid', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setPaymentRecipientTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          recipient: ZeroAddress,
        },
        {
          revertMessage: 'Invalid recipient',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setPaymentRecipientTest({
        arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
        owner,
        recipient: regularAccounts[0].address,
      });
    });
  });

  describe('setOnePerWallet()', () => {
    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setOnePerWalletTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          enabled: false,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });

    it('should be reverted if same state', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setOnePerWalletTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          enabled: true,
        },
        {
          revertMessage: 'Already in this state',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setOnePerWalletTest({
        arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
        owner,
        enabled: false,
      });
    });
  });

  describe('setMintDeadline()', () => {
    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMintDeadlineTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          deadline: 0,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setMintDeadlineTest({
        arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
        owner,
        deadline: 0,
      });
    });
  });

  describe('setMintPrice()', () => {
    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setMintPriceTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          mintPrice: ethers.utils.parseEther('0.1'),
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });

    it('should be reverted if price == 0', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setMintPriceTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
          owner,
          mintPrice: ethers.utils.parseEther('0'),
        },
        {
          revertMessage: 'Invalid price',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setMintPriceTest({
        arkadaErc721RoyaltyContract: arkadaERC721RoyaltyWithTrade,
        owner,
        mintPrice: ethers.utils.parseEther('0.2'),
      });
    });
  });

  describe('setTradeERC721()', () => {
    it('should be reverted if sender is not owner', async () => {
      const {
        arkadaERC721RoyaltyWithTrade,
        owner,
        regularAccounts,
        mockERC721,
      } = await loadFixture(defaultDeploy);

      await setTradeERC721Test(
        {
          arkadaErc721RoyaltyWithTradeContract: arkadaERC721RoyaltyWithTrade,
          owner,
          tradeERC721: mockERC721.address,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Ownable: caller is not the owner',
        },
      );
    });

    it('should be reverted if trade ERC721 address is invalid', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner } = await loadFixture(
        defaultDeploy,
      );

      await setTradeERC721Test(
        {
          arkadaErc721RoyaltyWithTradeContract: arkadaERC721RoyaltyWithTrade,
          owner,
          tradeERC721: ZeroAddress,
        },
        {
          revertMessage: 'Invalid trade ERC721',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, mockERC721 } =
        await loadFixture(defaultDeploy);

      await setTradeERC721Test({
        arkadaErc721RoyaltyWithTradeContract: arkadaERC721RoyaltyWithTrade,
        owner,
        tradeERC721: mockERC721.address,
      });
    });
  });

  describe('tradeNft()', () => {
    it('should successfully trade an NFT', async () => {
      const {
        arkadaERC721RoyaltyWithTrade,
        owner,
        regularAccounts,
        mockERC721,
      } = await loadFixture(defaultDeploy);

      // Mint a token to trade
      await mockERC721.mint(regularAccounts[0].address, 1);
      await mockERC721
        .connect(regularAccounts[0])
        .approve(arkadaERC721RoyaltyWithTrade.address, 1);

      await tradeNftTest({
        arkadaErc721RoyaltyWithTradeContract: arkadaERC721RoyaltyWithTrade,
        owner,
        tokenId: 1,
        from: regularAccounts[0],
      });
    });

    it('should revert if token does not exist', async () => {
      const { arkadaERC721RoyaltyWithTrade, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await tradeNftTest(
        {
          arkadaErc721RoyaltyWithTradeContract: arkadaERC721RoyaltyWithTrade,
          owner,
          tokenId: 999,
          from: regularAccounts[0],
        },
        {
          revertMessage: 'ERC721: invalid token ID',
        },
      );
    });

    it('should revert if caller is not token owner', async () => {
      const {
        arkadaERC721RoyaltyWithTrade,
        owner,
        regularAccounts,
        mockERC721,
      } = await loadFixture(defaultDeploy);

      // Mint a token to regularAccounts[0]
      await mockERC721.mint(regularAccounts[0].address, 1);

      // Try to trade from regularAccounts[1]
      await tradeNftTest(
        {
          arkadaErc721RoyaltyWithTradeContract: arkadaERC721RoyaltyWithTrade,
          owner,
          tokenId: 1,
          from: regularAccounts[1],
        },
        {
          revertMessage: 'ERC721: caller is not token owner or approved',
        },
      );
    });

    it('should revert if token is not approved', async () => {
      const {
        arkadaERC721RoyaltyWithTrade,
        owner,
        regularAccounts,
        mockERC721,
      } = await loadFixture(defaultDeploy);

      // Mint a token but don't approve
      await mockERC721.mint(regularAccounts[0].address, 1);

      await tradeNftTest(
        {
          arkadaErc721RoyaltyWithTradeContract: arkadaERC721RoyaltyWithTrade,
          owner,
          tokenId: 1,
          from: regularAccounts[0],
        },
        {
          revertMessage: 'ERC721: caller is not token owner or approved',
        },
      );
    });
  });
});
