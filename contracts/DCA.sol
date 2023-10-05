// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

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

    UserManager.Asset public UAsset;

    constructor(address _uniswapV3Router, address _userManager) {
        uniswapV3Router = _uniswapV3Router;
        userManager = UserManager(_userManager);
    }

    function checkGuidelines(address user, uint256[] calldata amounts) public view returns (bool) {
        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        UserManager.Asset[] memory assets = userManager.viewUserAllocations(user);

        for (uint i = 0; i < assets.length; i++) {
            uint256 targetWeight = assets[i].weight;
            uint256 actualWeight = amounts[i] / totalAmount;
            //if (actualWeight != targetWeight) {
            //    return false;
            //}
        }

        return true;
    }

    function executeDCA(address user, uint256[] calldata amounts) external payable {
        require(userManager.isUserSubscribed(msg.sender), "User is not subscribed");

        bool shouldCheckGuidelines = userManager.requireGuidelines(user);
        if (shouldCheckGuidelines) {
            require(checkGuidelines(msg.sender, amounts), "Does not meet investment guidelines");
        }

        UserManager.Asset[] memory assets = userManager.viewUserAllocations(user);
        require(assets.length == amounts.length, "Amounts length must match assets length");

        for (uint i = 0; i < assets.length; i++) {
            if (assets[i].asset != address(0)) {
                _buyToken(assets[i].asset, amounts[i]);
            }
        }
    }

    function _buyToken(address token, uint256 amountInETH) private {
        uint256 deadline = block.timestamp + 15;
        IUniswapV3Router(uniswapV3Router).exactInputSingle{value: amountInETH}(
            address(0),
            token,
            fee,
            msg.sender,
            deadline,
            amountInETH,
            0,
            0
        );
    }
}
