import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import {
  mintNFTTest,
  mintNFTToTest,
  setBaseURITest,
  setMintDeadlineTest,
  setMintPriceTest,
  setOnePerWalletTest,
  setOperatorTest,
  setPaymentRecipientTest,
  setRoyaltyTest,
} from './common/arkada-erc721-royalty.helpers';
import { defaultDeploy } from './common/fixtures';

// eslint-disable-next-line camelcase
import { ArkadaERC721Royalty__factory } from '../typechain-types';

const ZeroAddress = ethers.constants.AddressZero;

describe('ArkadaERC721RoyaltyWithTrade', function () {
  it('deployment', async () => {
    await loadFixture(defaultDeploy);
  });

  it('initialize', async () => {
    const {
      owner,
      arkadaERC721Royalty,
      mintDeadline,
      mintPrice,
      paymentsRecipient,
    } = await loadFixture(defaultDeploy);

    await expect(
      arkadaERC721Royalty.initialize(
        'ArkadaNFT',
        'ARK',
        'ipfs://base_uri/',
        mintPrice,
        mintDeadline,
        paymentsRecipient.address,
        owner.address,
      ),
    ).revertedWith('Initializable: contract is already initialized');

    const arkadaERC721RoyaltyNew = await new ArkadaERC721Royalty__factory(
      owner,
    ).deploy();
    await expect(
      arkadaERC721RoyaltyNew.initialize(
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
      arkadaERC721RoyaltyNew.initialize(
        'ArkadaNFT',
        'ARK',
        'ipfs://base_uri/',
        mintPrice,
        mintDeadline,
        ZeroAddress,
        owner.address,
      ),
    ).to.be.revertedWith('invalid recipient');
    await expect(
      arkadaERC721RoyaltyNew.initialize(
        'ArkadaNFT',
        'ARK',
        'ipfs://base_uri/',
        mintPrice,
        mintDeadline,
        paymentsRecipient.address,
        ZeroAddress,
      ),
    ).to.be.revertedWith('invalid owner');

    await arkadaERC721RoyaltyNew.initialize(
      'ArkadaNFT',
      'ARK',
      'ipfs://base_uri/',
      mintPrice,
      mintDeadline,
      paymentsRecipient.address,
      owner.address,
    );
  });

  describe('setBaseURI()', () => {
    it('should be set', async () => {
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setBaseURITest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        uri: 'lalala',
      });
    });

    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setBaseURITest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner, regularAccounts, mintPrice } =
        await loadFixture(defaultDeploy);

      await setRoyaltyTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner, mintPrice } = await loadFixture(
        defaultDeploy,
      );

      await setRoyaltyTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner, regularAccounts, mintPrice } =
        await loadFixture(defaultDeploy);

      await setRoyaltyTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        receiver: regularAccounts[0].address,
        royalty: 2,
        priceToCheck: mintPrice,
      });
    });

    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts, mintPrice } =
        await loadFixture(defaultDeploy);

      await setRoyaltyTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setOperatorTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        operator: regularAccounts[0].address,
      });
    });

    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setOperatorTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setPaymentRecipientTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setPaymentRecipientTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          recipient: ZeroAddress,
        },
        {
          revertMessage: 'Invalid recipient',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setPaymentRecipientTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        recipient: regularAccounts[0].address,
      });
    });
  });

  describe('setOnePerWallet()', () => {
    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setOnePerWalletTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setOnePerWalletTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          enabled: true,
        },
        {
          revertMessage: 'Already in this state',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setOnePerWalletTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        enabled: false,
      });
    });
  });

  describe('setMintDeadline()', () => {
    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMintDeadlineTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setMintDeadlineTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        deadline: 0,
      });
    });
  });

  describe('setMintPrice()', () => {
    it('should be reverted if sender is not owner', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMintPriceTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
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
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setMintPriceTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          mintPrice: ethers.utils.parseEther('0'),
        },
        {
          revertMessage: 'Invalid price',
        },
      );
    });

    it('should be set', async () => {
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setMintPriceTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        mintPrice: ethers.utils.parseEther('0.2'),
      });
    });
  });

  describe('mintNFTTo()', () => {
    it('should be reverted if sender is not owner or operator', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await mintNFTToTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          to: regularAccounts[2].address,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Not authorized',
        },
      );
    });

    it('should be minted', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await mintNFTToTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        to: regularAccounts[2].address,
      });
    });

    it('should be able to mint multiple tokens to same address', async () => {
      const { arkadaERC721Royalty, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await mintNFTToTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        to: regularAccounts[2].address,
      });

      await mintNFTToTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        to: regularAccounts[2].address,
      });
    });
  });

  describe('mintNFT()', () => {
    it('should be reverted if user send invalid amout of ether', async () => {
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await mintNFTTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          value: ethers.utils.parseEther('0.6'),
        },
        {
          revertMessage: 'Invalid price',
        },
      );
    });

    it('should be reverted if mint deadline exceeded', async () => {
      const { arkadaERC721Royalty, owner } = await loadFixture(defaultDeploy);

      await setMintDeadlineTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        deadline: 0,
      });

      await mintNFTTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          value: ethers.utils.parseEther('0.6'),
        },
        {
          revertMessage: 'Locked',
        },
      );
    });

    it('should be reverted if flag onePerWallet enabled and user want to mint multiple', async () => {
      const { arkadaERC721Royalty, owner, mintPrice } = await loadFixture(
        defaultDeploy,
      );

      await mintNFTTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        value: mintPrice,
      });

      await mintNFTTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          value: mintPrice,
        },
        {
          revertMessage: 'Already minted',
        },
      );
    });

    it('should be reverted if flag onePerWallet enabled, operator minted nft foe user and user want to mint more', async () => {
      const { arkadaERC721Royalty, owner, mintPrice, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mintNFTToTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        to: regularAccounts[0].address,
      });

      await mintNFTTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          value: mintPrice,
        },
        {
          from: regularAccounts[0],
          revertMessage: 'Already minted',
        },
      );
    });

    it('should be mint multiple nft if flag onePerWallet disabled', async () => {
      const { arkadaERC721Royalty, owner, mintPrice, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setOnePerWalletTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        enabled: false,
      });

      await mintNFTTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          value: mintPrice,
        },
        {
          from: regularAccounts[0],
        },
      );

      await mintNFTTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          value: mintPrice,
        },
        {
          from: regularAccounts[0],
        },
      );
    });

    it('should be mint multiple nft if flag onePerWallet disabled, and operator already minted nft for user', async () => {
      const { arkadaERC721Royalty, owner, mintPrice, regularAccounts } =
        await loadFixture(defaultDeploy);

      await setOnePerWalletTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        enabled: false,
      });

      await mintNFTToTest({
        arkadaErc721RoyaltyContract: arkadaERC721Royalty,
        owner,
        to: regularAccounts[0].address,
      });

      await mintNFTTest(
        {
          arkadaErc721RoyaltyContract: arkadaERC721Royalty,
          owner,
          value: mintPrice,
        },
        {
          from: regularAccounts[0],
        },
      );
    });
  });
});
