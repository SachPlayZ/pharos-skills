// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/StandardERC20.sol";
import "../src/StandardERC721.sol";
import "../src/StandardERC1155.sol";
import "../src/SpendLimitGuard.sol";

contract StandardERC20Test is Test {
    StandardERC20 token;
    address owner = address(this);

    function setUp() public {
        token = new StandardERC20("Test", "TST", 18, 1000e18, 0, owner);
    }

    function test_nameSymbolDecimals() public view {
        assertEq(token.name(), "Test");
        assertEq(token.symbol(), "TST");
        assertEq(token.decimals(), 18);
    }

    function test_initialSupply() public view {
        assertEq(token.totalSupply(), 1000e18);
        assertEq(token.balanceOf(owner), 1000e18);
    }

    function test_mint() public {
        token.mint(address(1), 500e18);
        assertEq(token.balanceOf(address(1)), 500e18);
    }

    function test_burn() public {
        token.burn(100e18);
        assertEq(token.totalSupply(), 900e18);
    }

    function test_pause() public {
        token.pause();
        vm.expectRevert();
        token.transfer(address(1), 1e18);
    }

    function test_cap() public {
        StandardERC20 capped = new StandardERC20("C", "C", 18, 100e18, 1000e18, owner);
        vm.expectRevert();
        capped.mint(owner, 901e18); // exceeds cap
    }

    function test_revertDecimalsOver18() public {
        vm.expectRevert("StandardERC20: decimals > 18");
        new StandardERC20("X", "X", 19, 0, 0, owner);
    }

    function test_revertSupplyOverCap() public {
        vm.expectRevert("StandardERC20: initialSupply > cap");
        new StandardERC20("X", "X", 18, 1001e18, 1000e18, owner);
    }
}

contract StandardERC721Test is Test {
    StandardERC721 nft;
    address owner = address(this);

    function setUp() public {
        nft = new StandardERC721("TestNFT", "TNFT", "https://meta.example/", owner);
    }

    function test_safeMint() public {
        uint256 id = nft.safeMint(address(1), "token0.json");
        assertEq(nft.ownerOf(id), address(1));
    }

    function test_pause() public {
        // Mint to plain EOA (address(1), no contract code — passes _safeMint receiver check)
        uint256 id = nft.safeMint(address(1), "t.json");
        nft.pause();
        vm.prank(address(1));
        vm.expectRevert();
        nft.transferFrom(address(1), address(2), id);
    }
}

contract StandardERC1155Test is Test {
    StandardERC1155 token;
    address owner = address(this);

    function setUp() public {
        token = new StandardERC1155("Multi", "MLT", "https://meta.example/{id}.json", owner);
    }

    function test_mint() public {
        token.mint(address(1), 1, 100, "");
        assertEq(token.balanceOf(address(1), 1), 100);
    }

    function test_mintBatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = 1; ids[1] = 2;
        amounts[0] = 10; amounts[1] = 20;
        token.mintBatch(address(1), ids, amounts, "");
        assertEq(token.balanceOf(address(1), 2), 20);
    }
}

contract SpendLimitGuardTest is Test {
    SpendLimitGuard guard;
    address owner = address(this);

    function setUp() public {
        guard = new SpendLimitGuard(1 ether, 1 days, owner);
    }

    function test_allowsUnderLimit() public {
        guard.checkTransaction(address(1), 0.5 ether, "", 0, 0, 0, 0, address(0), payable(address(0)), "", address(0));
    }

    function test_revertsOverLimit() public {
        guard.checkTransaction(address(1), 0.9 ether, "", 0, 0, 0, 0, address(0), payable(address(0)), "", address(0));
        vm.expectRevert("SpendLimitGuard: period spend limit exceeded");
        guard.checkTransaction(address(1), 0.2 ether, "", 0, 0, 0, 0, address(0), payable(address(0)), "", address(0));
    }

    function test_resetsAfterPeriod() public {
        guard.checkTransaction(address(1), 1 ether, "", 0, 0, 0, 0, address(0), payable(address(0)), "", address(0));
        vm.warp(block.timestamp + 1 days + 1);
        guard.checkTransaction(address(1), 1 ether, "", 0, 0, 0, 0, address(0), payable(address(0)), "", address(0));
    }
}
