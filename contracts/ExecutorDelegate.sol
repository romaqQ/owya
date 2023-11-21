// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract ExecutorDelegate {
    function delegateExecute(
        address dcaContract,
        uint256 totalAmountInEth,
        uint256[] calldata amountsInETH
    ) external payable {
        (bool success, ) = dcaContract.call{value: totalAmountInEth}(
            abi.encodeWithSignature(
                "execute(address,uint256[])",
                address(this),
                amountsInETH
            )
        );
        require(success, "DCA failed");
    }

    function delegateExecuteErc20(
        address dcaContract,
        address baseAssetContract,
        uint256 totalAmountBaseAsset,
        uint256[] calldata amountsInBaseAsset
    ) external {
        // transfer the erc20 base asset to the DCA contract
        IERC20 token = IERC20(baseAssetContract);

        // Transfer the tokens to the DCA contract
        require(
            token.transfer(dcaContract, totalAmountBaseAsset),
            "Token transfer failed"
        );

        (bool success, ) = dcaContract.call(
            abi.encodeWithSignature(
                "executeErc20(address,uint256[],uint256)",
                address(this),
                amountsInBaseAsset,
                totalAmountBaseAsset
            )
        );
        require(success, "DCA failed");
    }
}
