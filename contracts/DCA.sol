// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./UserManager.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    function exactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 deadline,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external payable returns (uint256 amountOut);
}

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint wad) external;
}

contract DCAv1 {
    IUniswapV3Router public uniswapV3Router;
    UserManager public userManager;
    uint24 public fee = 3000; // 0.3% fee tier
    address owner;
    IWETH public weth;

    event TokenBought(
        address indexed user,
        address indexed token,
        uint256 amountInETH
    );

    constructor(address _uniswapV3Router, address _weth, address _userManager) {
        uniswapV3Router = IUniswapV3Router(_uniswapV3Router);
        weth = IWETH(_weth);
        userManager = UserManager(_userManager);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setUniswapV3Router(address _uniswapV3Router) external onlyOwner {
        uniswapV3Router = IUniswapV3Router(_uniswapV3Router);
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

    function execute(
        address user,
        uint256[] calldata amounts
    ) external payable {
        require(userManager.isUserSubscribed(user), "User is not subscribed");

        // bool shouldCheckGuidelines = userManager.requireGuidelines(user);
        // if (shouldCheckGuidelines) {
        //     require(
        //         checkGuidelines(user, amounts),
        //         "Does not meet investment guidelines"
        //     );
        // }

        (address[] memory assets, uint256[] memory weights) = userManager
            .viewUserAllocations(user);
        require(
            assets.length == amounts.length,
            "Amounts length must match assets length"
        );
        uint256 EthAmount = msg.value;

        // Convert the received ETH to WETH first
        // the owner is now this contract (DCAv1) as an intermediary step
        weth.deposit{value: EthAmount}();

        // now we approve the weth to be spent by the uniswap router on behalf of this contract and then we swap it for the token
        // after the token swap, the user will receive the token
        weth.approve(address(uniswapV3Router), EthAmount);

        for (uint i = 0; i < assets.length; i++) {
            if (assets[i] != address(0)) {
                emit TokenBought(user, assets[i], amounts[i]);
                // _buyToken(user, assets[i], amounts[i]);
            }
        }
    }

    function _buyToken(
        address recipient,
        address token,
        uint256 amountInETH
    ) private {
        uint256 deadline = block.timestamp + 15;
        uniswapV3Router.exactInputSingle{value: amountInETH}(
            address(weth),
            token,
            fee,
            recipient,
            deadline,
            amountInETH,
            0,
            0
        );
    }
}
