// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

// TODO: add requireGuidelineCheck to StrategyNode
// TODO: add requireGuidelineCheck to UserManager for users

contract UserManager {
    address public owner;

    struct StrategyNode {
        address provider;
        bool isActive;
        bool needsApproval;
        bool isOnline;
    }

    mapping(address => StrategyNode) public strategyNodes;
    mapping(address => mapping(address => bool)) public isUserSubscribed;
    mapping(address => mapping(address => bool)) public isUserApproved;
    mapping(address => mapping(address => uint256)) public userLastExecution;
    mapping(address => mapping(address => uint256))
        public userSubscriptionAmount;
    mapping(address => mapping(address => address[])) public userAssets;
    mapping(address => mapping(address => uint256[])) public userAssetWeights;
    uint256 constant TOTAL_BASIS_POINTS = 10000;

    event StrategyNodeUpdated(
        address indexed strategyNode,
        bool isActive,
        bool needsApproval,
        bool isOnline
    );
    event UserApproved(address indexed user, address indexed strategyNode);
    event UserSubscribed(address indexed user, address indexed strategyNode);
    event UserUnsubscribed(address indexed user, address indexed strategyNode);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    modifier onlyProvider(address strategyNode) {
        require(
            msg.sender == strategyNodes[strategyNode].provider,
            "Only the provider can perform this action"
        );
        _;
    }

    modifier canSubscribe(address strategyNode) {
        require(
            strategyNodes[strategyNode].isActive,
            "Subscriptions are disabled for this StrategyNode"
        );
        if (strategyNodes[strategyNode].needsApproval) {
            require(
                isUserApproved[msg.sender][strategyNode],
                "User is not approved for this StrategyNode"
            );
        }
        _;
    }

    function setStrategyNode(
        address strategyNodeAddress,
        address provider,
        bool isActive,
        bool needsApproval,
        bool isOnline
    ) public onlyOwner {
        StrategyNode storage node = strategyNodes[strategyNodeAddress];
        node.provider = provider;
        node.isActive = isActive;
        node.needsApproval = needsApproval;
        node.isOnline = isOnline;
        emit StrategyNodeUpdated(
            strategyNodeAddress,
            isActive,
            needsApproval,
            isOnline
        );
    }

    function toggleActiveState(
        address[] calldata strategyNodeAddresses,
        bool state
    ) public onlyOwner {
        for (uint256 i = 0; i < strategyNodeAddresses.length; i++) {
            StrategyNode storage node = strategyNodes[strategyNodeAddresses[i]];
            node.isActive = state;
            emit StrategyNodeUpdated(
                strategyNodeAddresses[i],
                state,
                node.needsApproval,
                node.isOnline
            );
        }
    }

    function toggleOnlineState(
        address[] calldata strategyNodeAddresses,
        bool state
    ) public onlyOwner {
        for (uint256 i = 0; i < strategyNodeAddresses.length; i++) {
            StrategyNode storage node = strategyNodes[strategyNodeAddresses[i]];
            node.isOnline = state;
            emit StrategyNodeUpdated(
                strategyNodeAddresses[i],
                node.isActive,
                node.needsApproval,
                state
            );
        }
    }

    function providerToggleOnline(
        address strategyNodeAddress
    ) public onlyProvider(strategyNodeAddress) {
        StrategyNode storage node = strategyNodes[strategyNodeAddress];
        node.isOnline = false; // Provider can only set online to false.
        emit StrategyNodeUpdated(
            strategyNodeAddress,
            node.isActive,
            node.needsApproval,
            false
        );
    }

    function approveUser(
        address user,
        address strategyNode
    ) public onlyProvider(strategyNode) {
        require(
            strategyNodes[strategyNode].needsApproval,
            "StrategyNode does not require approval"
        );
        isUserApproved[user][strategyNode] = true;
        emit UserApproved(user, strategyNode);
    }

    function removeUserApproval(
        address user,
        address strategyNode
    ) public onlyProvider(strategyNode) {
        isUserApproved[user][strategyNode] = false;
    }

    // Original subscribe function preserved
    function subscribe(
        address strategyNode,
        address[] calldata assetAddress,
        uint256[] calldata assetWeights,
        uint256 amount
    ) public canSubscribe(strategyNode) {
        require(
            assetAddress.length == assetWeights.length,
            "Length of assets and weights must match"
        );
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < assetWeights.length; i++) {
            totalWeight += assetWeights[i];
        }
        require(
            totalWeight == TOTAL_BASIS_POINTS,
            "Total weights must equal 10,000 basis points"
        );

        userSubscriptionAmount[msg.sender][strategyNode] = amount;
        userAssets[msg.sender][strategyNode] = assetAddress;
        userAssetWeights[msg.sender][strategyNode] = assetWeights;
        isUserSubscribed[msg.sender][strategyNode] = true;
        userLastExecution[msg.sender][strategyNode] = block.timestamp; // Assuming this is for tracking the last execution time.
        emit UserSubscribed(msg.sender, strategyNode);
    }

    function unsubscribe(address strategyNode) public {
        require(
            isUserSubscribed[msg.sender][strategyNode],
            "User is not subscribed to this StrategyNode"
        );
        isUserSubscribed[msg.sender][strategyNode] = false;
        emit UserUnsubscribed(msg.sender, strategyNode);
    }

    // function to view user allocations
    function viewUserAllocation(
        address user,
        address strategyNode
    ) public view returns (address[] memory, uint256[] memory) {
        return (
            userAssets[user][strategyNode],
            userAssetWeights[user][strategyNode]
        );
    }
}
