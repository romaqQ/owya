// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DelegateHandler {
    function delegateExecuteDCA(address dcaContract, uint256 amountInETH) external {
        (bool success, ) = dcaContract.call(
            abi.encodeWithSignature("executeDCA(address,uint256)", msg.sender, amountInETH)
        );
        require(success, "DCA failed");
    }
}
