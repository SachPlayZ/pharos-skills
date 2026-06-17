// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Configurable ERC20 with optional Mintable/Burnable/Pausable/Capped + Ownable.
/// Deployed via pharos-token-factory skill.
contract StandardERC20 is ERC20, ERC20Burnable, ERC20Pausable, ERC20Capped, Ownable {
    uint8 private _decimals;

    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param decimals_ Decimals (0–18)
    /// @param initialSupply Initial mint to owner (in smallest units)
    /// @param cap_ Max supply cap (in smallest units); 0 = no cap (uses type(uint256).max)
    /// @param initialOwner Address to receive ownership + initial supply
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        uint256 cap_,
        address initialOwner
    )
        ERC20(name_, symbol_)
        ERC20Capped(cap_ == 0 ? type(uint256).max : cap_)
        Ownable(initialOwner)
    {
        require(decimals_ <= 18, "StandardERC20: decimals > 18");
        require(
            cap_ == 0 || initialSupply <= cap_,
            "StandardERC20: initialSupply > cap"
        );
        _decimals = decimals_;
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint tokens. Only callable by owner.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Pause all transfers. Only callable by owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause transfers. Only callable by owner.
    function unpause() external onlyOwner {
        _unpause();
    }

    // Required override for ERC20Pausable + ERC20Capped
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
