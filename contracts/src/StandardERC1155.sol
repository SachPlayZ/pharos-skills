// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice ERC1155 with Supply tracking + optional Pause.
/// Deployed via pharos-token-factory skill.
contract StandardERC1155 is ERC1155, ERC1155Pausable, ERC1155Supply, Ownable {
    string public name;
    string public symbol;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_,
        address initialOwner
    ) ERC1155(uri_) Ownable(initialOwner) {
        name = name_;
        symbol = symbol_;
    }

    /// @notice Mint tokens. Only callable by owner.
    function mint(address to, uint256 id, uint256 amount, bytes memory data)
        external
        onlyOwner
    {
        _mint(to, id, amount, data);
    }

    /// @notice Batch mint. Only callable by owner.
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setURI(string memory newURI) external onlyOwner {
        _setURI(newURI);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Pausable, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
