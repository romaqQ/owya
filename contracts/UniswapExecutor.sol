// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.18;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract UniswapExecutor {

    function swapExactInputSingle(uint256 amountIn, address _swapRouterAdress, address _tokenIn, address _tokenOut)
        external
        returns (uint256 amountOut)
    {
        ISwapRouter swapRouter = ISwapRouter(_swapRouterAdress);
        uint24 poolFee = 3000;
        IERC20 tokenIn = IERC20(_tokenIn);

        tokenIn.approve(address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: _tokenIn,
                tokenOut: _tokenOut,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        amountOut = swapRouter.exactInputSingle(params);
    }

    function swapExactOutputSingle(uint256 amountOut, uint256 amountInMaximum, address _swapRouterAdress, address _tokenIn, address _tokenOut)
        external
        returns (uint256 amountIn)
    {
        ISwapRouter swapRouter = ISwapRouter(_swapRouterAdress);
        uint24 poolFee = 3000;
        IERC20 tokenIn = IERC20(_tokenIn);

        tokenIn.approve(address(swapRouter), amountIn);

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: _tokenIn,
                tokenOut: _tokenOut,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum,
                sqrtPriceLimitX96: 0
            });

        amountIn = swapRouter.exactOutputSingle(params);

        if (amountIn < amountInMaximum) {
            tokenIn.approve(address(swapRouter), 0);
            tokenIn.transfer(address(this), amountInMaximum - amountIn);
        }
    }
}