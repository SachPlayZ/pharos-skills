// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Optional Gnosis Safe Guard that enforces per-period native spend limits.
/// Install on a Safe via `setGuard(address(this))`. Agent-wallet skill bonus module.
interface ISafeGuard {
    function checkTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes calldata signatures,
        address msgSender
    ) external;

    function checkAfterExecution(bytes32 txHash, bool success) external;
}

contract SpendLimitGuard is ISafeGuard, Ownable {
    uint256 public periodSeconds;
    uint256 public limitPerPeriod;

    uint256 public periodStart;
    uint256 public spentThisPeriod;

    event SpendChecked(address indexed to, uint256 value, uint256 spentThisPeriod);
    event LimitUpdated(uint256 newLimit, uint256 newPeriod);

    constructor(
        uint256 _limitPerPeriod,
        uint256 _periodSeconds,
        address _owner
    ) Ownable(_owner) {
        limitPerPeriod = _limitPerPeriod;
        periodSeconds = _periodSeconds;
        periodStart = block.timestamp;
    }

    function setLimit(uint256 _limitPerPeriod, uint256 _periodSeconds) external onlyOwner {
        limitPerPeriod = _limitPerPeriod;
        periodSeconds = _periodSeconds;
        emit LimitUpdated(_limitPerPeriod, _periodSeconds);
    }

    function _resetIfNewPeriod() internal {
        if (block.timestamp >= periodStart + periodSeconds) {
            periodStart = block.timestamp;
            spentThisPeriod = 0;
        }
    }

    function checkTransaction(
        address to,
        uint256 value,
        bytes calldata,
        uint8,
        uint256,
        uint256,
        uint256,
        address,
        address payable,
        bytes calldata,
        address
    ) external override {
        _resetIfNewPeriod();
        require(
            spentThisPeriod + value <= limitPerPeriod,
            "SpendLimitGuard: period spend limit exceeded"
        );
        spentThisPeriod += value;
        emit SpendChecked(to, value, spentThisPeriod);
    }

    function checkAfterExecution(bytes32, bool) external override {}
}
