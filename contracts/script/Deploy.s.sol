// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/StandardERC20.sol";
import "../src/StandardERC721.sol";
import "../src/StandardERC1155.sol";
import "../src/SpendLimitGuard.sol";

// ── ERC20 ─────────────────────────────────────────────────────────────────────

contract DeployERC20 is Script {
    function run() external returns (address) {
        string memory name     = vm.envOr("TOKEN_NAME",     string("MyToken"));
        string memory symbol   = vm.envOr("TOKEN_SYMBOL",   string("MTK"));
        uint8  decimals_       = uint8(vm.envOr("TOKEN_DECIMALS", uint256(18)));
        uint256 supply         = vm.envOr("TOKEN_SUPPLY",   uint256(1_000_000e18));
        uint256 cap            = vm.envOr("TOKEN_CAP",      uint256(0));

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        StandardERC20 token = new StandardERC20(
            name, symbol, decimals_, supply, cap, deployer
        );
        vm.stopBroadcast();

        console2.log("StandardERC20 deployed at:", address(token));
        console2.log("  name:          ", token.name());
        console2.log("  symbol:        ", token.symbol());
        console2.log("  totalSupply:   ", token.totalSupply());
        console2.log("  owner:         ", token.owner());
        return address(token);
    }
}

// ── ERC721 ────────────────────────────────────────────────────────────────────

contract DeployERC721 is Script {
    function run() external returns (address) {
        string memory name     = vm.envOr("NFT_NAME",     string("MyNFT"));
        string memory symbol   = vm.envOr("NFT_SYMBOL",   string("MNFT"));
        string memory baseURI  = vm.envOr("NFT_BASE_URI", string("https://meta.example/"));

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        StandardERC721 nft = new StandardERC721(name, symbol, baseURI, deployer);
        vm.stopBroadcast();

        console2.log("StandardERC721 deployed at:", address(nft));
        console2.log("  name:   ", nft.name());
        console2.log("  symbol: ", nft.symbol());
        console2.log("  owner:  ", nft.owner());
        return address(nft);
    }
}

// ── ERC1155 ───────────────────────────────────────────────────────────────────

contract DeployERC1155 is Script {
    function run() external returns (address) {
        string memory name   = vm.envOr("MULTI_NAME",   string("MyMultiToken"));
        string memory symbol = vm.envOr("MULTI_SYMBOL", string("MMLT"));
        string memory uri    = vm.envOr("MULTI_URI",    string("https://meta.example/{id}.json"));

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        StandardERC1155 token = new StandardERC1155(name, symbol, uri, deployer);
        vm.stopBroadcast();

        console2.log("StandardERC1155 deployed at:", address(token));
        console2.log("  name:   ", token.name());
        console2.log("  symbol: ", token.symbol());
        console2.log("  owner:  ", token.owner());
        return address(token);
    }
}

// ── SpendLimitGuard ───────────────────────────────────────────────────────────

contract DeploySpendLimitGuard is Script {
    function run() external returns (address) {
        uint256 limitPerPeriod = vm.envOr("GUARD_LIMIT",   uint256(1 ether));
        uint256 periodSeconds  = vm.envOr("GUARD_PERIOD",  uint256(1 days));

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        SpendLimitGuard guard = new SpendLimitGuard(limitPerPeriod, periodSeconds, deployer);
        vm.stopBroadcast();

        console2.log("SpendLimitGuard deployed at:", address(guard));
        console2.log("  limit:  ", guard.limitPerPeriod());
        console2.log("  period: ", guard.periodSeconds());
        return address(guard);
    }
}
