// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract ExecutorDelegate {
    function delegateExecute(
        address dcaContract,
        uint256 totalAmountInEth,
        uint256[] calldata amountsInETH
    ) external {
        (bool success, ) = dcaContract.call{value: totalAmountInEth}(
            abi.encodeWithSignature(
                "execute(address,uint256[])",
                msg.sender,
                amountsInETH
            )
        );
        require(success, "DCA failed");
    }
}
