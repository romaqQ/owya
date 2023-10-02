// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './UserManager.sol';

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV3Router {
    function exactInputSingle(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) external payable returns (uint256 amountOut);
}

contract DCA {
    address public uniswapV3Router;
    UserManager public userManager;
    uint24 public fee = 3000;  // 0.3% fee tier
    uint256 constant TOTAL_BASIS_POINTS = 10000;

    constructor(address _uniswapV3Router, address _userManager) {
        uniswapV3Router = _uniswapV3Router;
        userManager = UserManager(_userManager);
    }

    function checkGuidelines(address user, uint256[] calldata amounts) public view returns (bool) {
        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        // retrieve the user's assets
        address[] memory assets = userManager.userAssets(user);
        for (uint i = 0; i < assets.length; i++) {
            uint256 targetWeight = userManager.userTargetWeights(user, assets[i]);
            uint256 actualWeight = (amounts[i] * 100) / totalAmount;
            if (actualWeight != targetWeight) {
                return false;
            }
        }

        return true;
    }

    function executeDCA(uint256[] calldata amounts) external payable {
        // check if the user is subscribed
        require(userManager.isUserSubscribed(msg.sender), "User is not subscribed");

        bool shouldCheckGuidelines = userManager.requireGuidelines(msg.sender);
        if (shouldCheckGuidelines) {
            require(checkGuidelines(msg.sender, amounts), "Does not meet investment guidelines");
        }

        address[] memory assets = userManager.userAssets(msg.sender);
        require(assets.length == amounts.length, "Amounts length must match assets length");

        for (uint i = 0; i < assets.length; i++) {
            if (assets[i] != address(0)) {
                _buyToken(assets[i], amounts[i]);
            }
        }
    }

    function _buyToken(address token, uint256 amountInETH) private {
        uint256 deadline = block.timestamp + 15; // 15 seconds from the current block time
        IUniswapV3Router(uniswapV3Router).exactInputSingle{value: amountInETH}(
            address(0),  // ETH is the input
            token,       // Token to buy
            fee,         // Fee tier
            msg.sender,  // Recipient
            deadline,    // Deadline
            amountInETH, // Amount in
            0,           // Minimum amount out
            0            // No price limit
        );
    }
}
