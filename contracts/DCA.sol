// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./UniversalUserManager.sol";
import "hardhat/console.sol";
import "./token/IERC20.sol";
import "./uniswap/ISwapRouter.sol";

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint wad) external;
}

// TODO: Add a way to check if the user is subscribed to the strategy node
// TODO: Add a way to check if the user is approved by the strategy node

contract DCAv1 {
    ISwapRouter public swapRouter;
    UniversalUserManager public userManager;
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
        userManager = UniversalUserManager(_userManager);
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
            .viewUserAllocation(user, address(this));

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
            .viewUserAllocation(user, address(this));

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

    function executeErc20(
        address user,
        address tokenAddress,
        uint256[] calldata amounts,
        uint256 totalAmount
    ) external payable {
        require(
            userManager.isUserSubscribed(user, address(this)),
            "User is not subscribed"
        );

        // call the viewUserBaseAsset function of the UserManager contract
        // where teh mapping looks like this:     mapping(address => mapping(address => address)) public userBaseAsset;

        require(
            userManager.userBaseAsset(user, address(this)) == tokenAddress,
            "Provided token address does not match subscribed base asset address"
        );

        IERC20 ierc20 = IERC20(tokenAddress);

        // Approve the Uniswap contract to spend the base asset
        // to be spent by the uniswap router on behalf of this contract and then we swap it for the token
        require(
            ierc20.approve(address(swapRouter), totalAmount),
            "Token approval failed"
        );

        bool shouldCheckGuidelines = userManager.isGuidelineCheckRequired(
            user,
            address(this)
        );
        if (shouldCheckGuidelines) {
            require(
                checkGuidelines(user, amounts),
                "Does not meet investment guidelines"
            );
        }

        (address[] memory assets, uint256[] memory weights) = userManager
            .viewUserAllocation(user, address(this));
        require(
            assets.length == amounts.length,
            "Amounts length must match assets length"
        );

        // // after the token swap, the user will receive the token
        for (uint i = 0; i < assets.length; i++) {
            if (assets[i] != address(0)) {
                uint256 amountOut = _buyToken(
                    user,
                    address(ierc20),
                    assets[i],
                    amounts[i]
                );
                emit TokenBought(user, assets[i], amountOut);
            }
        }
    }

    function execute(
        address user,
        uint256[] calldata amounts
    ) external payable {
        require(
            userManager.isUserSubscribed(user, address(this)),
            "User is not subscribed"
        );

        bool shouldCheckGuidelines = userManager.isGuidelineCheckRequired(
            user,
            address(this)
        );

        if (shouldCheckGuidelines) {
            require(
                checkGuidelines(user, amounts),
                "Does not meet investment guidelines"
            );
        }

        (address[] memory assets, uint256[] memory weights) = userManager
            .viewUserAllocation(user, address(this));
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
