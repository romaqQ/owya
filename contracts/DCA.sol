// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./UserManager.sol";
import "hardhat/console.sol";
import "./token/IERC20.sol";
import "./uniswap/ISwapRouter.sol";

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint wad) external;
}

contract DCAv1 {
    ISwapRouter public swapRouter;
    UserManager public userManager;
    uint24 public fee = 3000; // 0.3% fee tier
    address owner;
    IWETH public weth;

    event LogMe(
        address indexed user,
        address wethAddress,
        uint256 value
        // address[] assets,
        // bool userSubscribed,
        // uint256 assetLength,
        // uint256 amountLength
    );

    event TokenBought(address indexed user, address token, uint256 amount);

    constructor(address _uniswapV3Router, address _weth, address _userManager) {
        swapRouter = ISwapRouter(_uniswapV3Router);
        weth = IWETH(_weth);
        // weth = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); // mainnet
        userManager = UserManager(_userManager);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setUniswapV3Router(address _uniswapV3Router) external onlyOwner {
        swapRouter = ISwapRouter(_uniswapV3Router);
    }

    function setFee(uint24 _fee) external onlyOwner {
        fee = _fee;
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    function checkGuidelines(
        address user,
        uint256[] calldata amounts
    ) public view returns (bool) {
        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        (address[] memory assets, uint256[] memory weights) = userManager
            .viewUserAllocations(user);

        for (uint i = 0; i < assets.length; i++) {
            uint256 targetWeight = weights[i];
            uint256 actualWeight = amounts[i] / totalAmount;
            //if (actualWeight != targetWeight) {
            //    return false;
            //}
        }

        return true;
    }

    function testExecute(
        address user,
        uint256[] calldata amounts
    ) external payable {
        // Emit Event
        console.log(user, amounts[0], amounts[0], msg.value);

        (address[] memory assets, uint256[] memory weights) = userManager
            .viewUserAllocations(user);

        // emit TestExecuted(user, amounts, msg.value, assets);

        require(
            assets.length == amounts.length,
            "Amounts length must match assets length"
        );
        uint256 EthAmount = msg.value;

        // // Convert the received ETH to WETH first
        // // the owner is now this contract (DCAv1) as an intermediary step
        weth.deposit{value: EthAmount}();

        // // now we approve the weth to be spent by the uniswap router on behalf of this contract and then we swap it for the token
        // // after the token swap, the user will receive the token
        weth.approve(address(swapRouter), EthAmount);
    }

    function execute(
        address user,
        uint256[] calldata amounts
    ) external payable {
        require(userManager.isUserSubscribed(user), "User is not subscribed");

        bool shouldCheckGuidelines = userManager.requireGuidelines(user);
        if (shouldCheckGuidelines) {
            require(
                checkGuidelines(user, amounts),
                "Does not meet investment guidelines"
            );
        }

        (address[] memory assets, uint256[] memory weights) = userManager
            .viewUserAllocations(user);
        require(
            assets.length == amounts.length,
            "Amounts length must match assets length"
        );
        uint256 ethAmount = msg.value;

        // Convert the received ETH to WETH first
        // the owner is now this contract (DCAv1) as an intermediary step
        weth.deposit{value: ethAmount}();

        // // now we approve the weth to be spent by the uniswap router on behalf of this contract and then we swap it for the token
        // // after the token swap, the user will receive the token
        weth.approve(address(swapRouter), ethAmount);
        for (uint i = 0; i < assets.length; i++) {
            if (assets[i] != address(0)) {
                uint256 amountOut = _buyToken(
                    user,
                    address(weth),
                    assets[i],
                    amounts[i]
                );
                emit TokenBought(user, assets[i], amountOut);
            }
        }
    }

    function _buyToken(
        address recipient,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        uint256 deadline = block.timestamp + 15;
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }
}
