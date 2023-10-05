// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract DelegateHandler {
    function delegateExecuteDCA(address dcaContract, uint256[] calldata amountsInETH) external {
        (bool success, ) = dcaContract.call(
            abi.encodeWithSignature("executeDCA(address,uint256[])", msg.sender, amountsInETH)
        );
        require(success, "DCA failed");
    }
}
