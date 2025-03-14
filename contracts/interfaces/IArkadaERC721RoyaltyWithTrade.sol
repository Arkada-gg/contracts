// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IArkadaERC721Royalty.sol";

/**
 * @title IArkadaERC721RoyaltyWithTrade
 * @author Arkada
 */
interface IArkadaERC721RoyaltyWithTrade is IArkadaERC721Royalty {
    /// @notice Event emitted when trade ERC721 is updated
    /// @param oldTradeERC721 Address of the old trade ERC721
    /// @param newTradeERC721 Address of the new trade ERC721
    event TradeERC721Updated(
        address indexed oldTradeERC721,
        address indexed newTradeERC721
    );

    /**
     * @notice Allows a user to trade their old NFT for a new one by burning the old NFT.
     * @param tokenId The token ID of the BUSHI NFT to be burned.
     */
    function tradeNft(uint256 tokenId) external;

    /**
     * @notice Allows the owner to set the trade ERC721 address.
     * @param _tradeERC721 The address of the new trade ERC721.
     */
    function setTradeERC721(address _tradeERC721) external;
}
