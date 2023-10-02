// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserManager {
    address public owner;
    bool public subscriptionsEnabled;
    mapping(address => bool) public isUserSubscribed;
    mapping(address => mapping(address => uint256)) public userTargetWeights;
    mapping(address => address[]) public userAssets;
    mapping(address => bool) public requireGuidelines;
    mapping(address => bool) public isAssetAllowed;
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

    function addAllowedAsset(address asset) public onlyOwner {
        isAssetAllowed[asset] = true;
    }

    function removeAllowedAsset(address asset) public onlyOwner {
        isAssetAllowed[asset] = false;
    }

    function setUserAllocation(address[] memory assets, uint256[] memory weights, bool checkGuidelines) public canSubscribe {
        require(assets.length == weights.length, "Mismatch between assets and weights length");
        
        uint256 totalWeight = 0;
        for (uint i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        require(totalWeight == TOTAL_BASIS_POINTS, "Total weights must equal 10,000 basis points");
        
        for (uint i = 0; i < assets.length; i++) {
            require(isAssetAllowed[assets[i]], "Asset not allowed");
            userTargetWeights[msg.sender][assets[i]] = weights[i];
        }
        
        userAssets[msg.sender] = assets;
        requireGuidelines[msg.sender] = checkGuidelines;
        isUserSubscribed[msg.sender] = true;
    }

    function changeUserAllocation(address[] memory newAssets, uint256[] memory newWeights) public {
        require(isUserSubscribed[msg.sender], "User is not subscribed");
        require(newAssets.length == newWeights.length, "Mismatch between newAssets and newWeights length");
        
        uint256 newTotalWeight = 0;
        for (uint i = 0; i < newWeights.length; i++) {
            newTotalWeight += newWeights[i];
        }
        require(newTotalWeight == TOTAL_BASIS_POINTS, "Total newWeights must equal 10,000 basis points");
        
        for (uint i = 0; i < newAssets.length; i++) {
            require(isAssetAllowed[newAssets[i]], "New asset not allowed");
            userTargetWeights[msg.sender][newAssets[i]] = newWeights[i];
        }

        userAssets[msg.sender] = newAssets;
    }

    function toggleSubscription() public {
        isUserSubscribed[msg.sender] = !isUserSubscribed[msg.sender];
    }
}
