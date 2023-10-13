// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Import the UserManager interface
import "./UserManager.sol";

contract DcaTrigger {
    address public executorDelegateAddress;
    address public owner;
    UserManager public userManager;

    constructor(address _executorDelegateAddress, address _userManager) {
        executorDelegateAddress = _executorDelegateAddress;
        owner = msg.sender;
        userManager = UserManager(_userManager);
    }

    function triggerDelegate(
        address dcaContract,
        uint256 totalAmountInEth,
        uint256[] calldata amountsInETH
    ) external payable {
        (bool success, ) = executorDelegateAddress.delegatecall(
            abi.encodeWithSignature(
                "delegateExecute(address,uint256,uint256[])",
                dcaContract,
                totalAmountInEth,
                amountsInETH
            )
        );
        require(success, "Delegate call failed");
    }

    // call the subscribe function of the UserManager contract
    function subscribe(
        address[] memory assets,
        uint256[] memory weights,
        uint256 amount,
        bool checkGuidelines
    ) external {
        userManager.subscribe(assets, weights, amount, checkGuidelines);
    }

    receive() external payable {}

    fallback() external payable {}

    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw Ether");
        payable(owner).transfer(address(this).balance);
    }
}
