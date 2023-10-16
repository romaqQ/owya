// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract UserManager {
    address public owner;
    bool public subscriptionsEnabled;

    mapping(address => bool) public isUserSubscribed;
    mapping(address => uint256) public userLastExecution;
    mapping(address => uint256) public userSubscriptionAmount;
    mapping(address => address[]) public userAssets;
    mapping(address => uint256[]) public userAssetWeights;
    mapping(address => bool) public requireGuidelines;
    uint256 constant TOTAL_BASIS_POINTS = 10000;

    constructor() {
        owner = msg.sender;
        subscriptionsEnabled = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    modifier canSubscribe() {
        require(subscriptionsEnabled, "New subscriptions are disabled");
        _;
    }

    function subscribe(
        address[] calldata assetAddress,
        uint256[] calldata assetWeights,
        uint256 amount,
        bool checkGuidelines
    ) public canSubscribe {
        require(
            assetAddress.length == assetWeights.length,
            "Length of asset and weight arrays must match"
        );
        uint256 totalWeight = 0;
        for (uint i = 0; i < assetWeights.length; i++) {
            totalWeight += assetWeights[i];
        }
        console.log("TotalWeight:", totalWeight);
        require(
            totalWeight == TOTAL_BASIS_POINTS,
            "Total weights must equal 10,000 basis points"
        );

        userSubscriptionAmount[msg.sender] = amount;
        delete userAssets[msg.sender]; // clear current allocation
        delete userAssetWeights[msg.sender]; // clear current allocation
        for (uint i = 0; i < assetAddress.length; i++) {
            userAssets[msg.sender].push(assetAddress[i]);
            userAssetWeights[msg.sender].push(assetWeights[i]);
        }
        requireGuidelines[msg.sender] = checkGuidelines;
        isUserSubscribed[msg.sender] = true;
    }

    function changeUserAllocation(
        address[] calldata assetAddress,
        uint256[] calldata assetWeights
    ) public {
        require(
            assetAddress.length == assetWeights.length,
            "Length of asset and weight arrays must match"
        );
        require(isUserSubscribed[msg.sender], "User is not subscribed");

        uint256 newTotalWeight = 0;
        for (uint i = 0; i < assetWeights.length; i++) {
            newTotalWeight += assetWeights[i];
        }
        require(
            newTotalWeight == TOTAL_BASIS_POINTS,
            "Total newWeights must equal 10,000 basis points"
        );
        delete userAssets[msg.sender]; // clear current allocation
        delete userAssetWeights[msg.sender]; // clear current allocation
        for (uint i = 0; i < assetAddress.length; i++) {
            userAssets[msg.sender].push(assetAddress[i]);
            userAssetWeights[msg.sender].push(assetWeights[i]);
        }
    }

    function changeUserSubscriptionAmount(uint256 amount) public {
        require(isUserSubscribed[msg.sender], "User is not subscribed");
        userSubscriptionAmount[msg.sender] = amount;
    }

    function toggleSubscription() public {
        isUserSubscribed[msg.sender] = !isUserSubscribed[msg.sender];
    }

    function viewUserAllocations(
        address user
    ) public view returns (address[] memory, uint256[] memory) {
        return (userAssets[user], userAssetWeights[user]);
    }
}
