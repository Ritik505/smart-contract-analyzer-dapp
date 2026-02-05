// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract AnalyzerAccess {
    address public owner;
    uint256 public constant FEE = 0.1 ether; // 0.1 AVAX (1 AVAX = 1 ether on Avalanche C-Chain)

    event Paid(address indexed user, uint256 amount);

    constructor() {
        owner = 0x4550Ac76DC759A4F9AA71b8552582b96D06F516d;
    }

    function payToAnalyze() external payable {
        require(msg.value == FEE, "Must pay exactly 0.1 AVAX");
        (bool sent, ) = owner.call{value: msg.value}("");
        require(sent, "Failed to forward payment");
        emit Paid(msg.sender, msg.value);
    }

} 