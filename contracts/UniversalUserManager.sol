// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

// TODO: add requireGuidelineCheck to StrategyNode
// TODO: add requireGuidelineCheck to UserManager for users

contract UniversalUserManager {
    address public owner;

    struct StrategyNode {
        address executor;
        address provider;
        bool isActive;
        bool needsApproval;
        bool isOnline;
    }

    // strategyNode => baseAsset => bool
    mapping(address => mapping(address => bool)) public allowedBaseAssets;
    // strategyNode => user => baseAsset
    mapping(address => mapping(address => uint256)) public baseAssetAmount;
    // baseAsset => total amount subscribed
    mapping(address => uint256) public baseAssetTotalSubscriptionAmount;
    // strategyNode => StrategyNode
    mapping(address => StrategyNode) public strategyNodes;
    // user => strategyNode => baseAsset
    mapping(address => mapping(address => address)) public userBaseAsset;
    // user => strategyNode => bool
    mapping(address => mapping(address => bool)) public isUserSubscribed;
    // user => strategyNode => bool
    mapping(address => mapping(address => bool)) public isUserApproved;
    // user => strategyNode => uint256
    mapping(address => mapping(address => uint256)) public userLastExecution;
    // user => strategyNode => uint256
    mapping(address => mapping(address => uint256))
        public userSubscriptionAmount;
    // user => strategyNode => address[]
    mapping(address => mapping(address => address[])) public userAssets;
    // user => strategyNode => uint256[]
    mapping(address => mapping(address => uint256[])) public userAssetWeights;
    // user => strategyNode => bool
    mapping(address => mapping(address => bool))
        public isGuidelineCheckRequired;

    uint256 constant TOTAL_BASIS_POINTS = 10000;

    event StrategyNodeUpdated(
        address indexed strategyNode,
        address indexed provider,
        bool isActive,
        bool needsApproval,
        bool isOnline
    );

    event StrategyNodeCreated(
        address indexed strategyNode,
        address indexed provider
    );
    event StrategyNodeDeactivated(
        address indexed strategyNode,
        address indexed provider
    );
    event StrategyNodeActivated(
        address indexed strategyNode,
        address indexed provider
    );

    event UserApproved(address indexed user, address indexed strategyNode);
    event UserSubscribed(
        address indexed user,
        address indexed strategyNode,
        address baseAsset,
        uint256 amount
    );
    event UserUnsubscribed(
        address indexed user,
        address indexed strategyNode,
        address baseAsset,
        uint256 amount
    );

    event UserAssetUpdated(
        address indexed user,
        address indexed strategyNode,
        address baseAsset,
        address[] assets,
        uint256[] weights
    );

    event UserBaseAssetUpdated(
        address indexed user,
        address indexed strategyNode,
        address baseAsset,
        uint256 amount
    );

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

    modifier onlyOwnerOrProvider(address strategyNode) {
        require(
            msg.sender == owner ||
                msg.sender == strategyNodes[strategyNode].provider,
            "Only the owner or provider can perform this action"
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

    function toggleActiveState(
        address[] calldata strategyNodeAddresses,
        bool state
    ) public onlyOwner {
        for (uint256 i = 0; i < strategyNodeAddresses.length; i++) {
            StrategyNode storage node = strategyNodes[strategyNodeAddresses[i]];
            node.isActive = state;
            emit StrategyNodeUpdated(
                strategyNodeAddresses[i],
                node.provider,
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
                node.executor,
                node.provider,
                node.isActive,
                node.needsApproval,
                state
            );
        }
    }

    function approveBaseAsset(
        address strategyNode,
        address[] calldata baseAssets
    ) public onlyOwner {
        for (uint256 i = 0; i < baseAssets.length; i++) {
            allowedBaseAssets[strategyNode][baseAssets[i]] = true;
        }
    }

    function removeBaseAsset(
        address strategyNode,
        address[] calldata baseAssets
    ) public onlyOwner {
        for (uint256 i = 0; i < baseAssets.length; i++) {
            allowedBaseAssets[strategyNode][baseAssets[i]] = false;
        }
    }

    function providerToggleOnline(
        address strategyNodeAddress
    ) public onlyProvider(strategyNodeAddress) {
        StrategyNode storage node = strategyNodes[strategyNodeAddress];
        node.isOnline = false; // Provider can only set online to false.
        emit StrategyNodeUpdated(
            node.executor,
            node.provider,
            node.isActive,
            node.needsApproval,
            false
        );
    }

    function createStrategyNode(
        address strategyNodeAddress,
        address provider,
        bool isActive,
        bool isOnline,
        bool needsApproval
    ) public onlyOwner {
        StrategyNode storage node = strategyNodes[strategyNodeAddress];
        node.provider = provider;
        node.isActive = isActive;
        node.needsApproval = needsApproval;
        node.isOnline = isOnline;
        node.executor = strategyNodeAddress;
        emit StrategyNodeCreated(strategyNodeAddress, msg.sender);
    }

    function deactivateStrategyNode(
        address strategyNodeAddress
    ) public onlyOwnerOrProvider(strategyNodeAddress) {
        StrategyNode storage node = strategyNodes[strategyNodeAddress];
        node.isActive = false;
        emit StrategyNodeDeactivated(strategyNodeAddress, msg.sender);
    }

    function activateStrategyNode(
        address strategyNodeAddress
    ) public onlyOwner {
        StrategyNode storage node = strategyNodes[strategyNodeAddress];
        node.isActive = true;
        emit StrategyNodeActivated(strategyNodeAddress, msg.sender);
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

    function activateUserApproval(
        address strategyNode
    ) public onlyProvider(strategyNode) {
        StrategyNode storage node = strategyNodes[strategyNode];
        node.needsApproval = true;
    }

    // Original subscribe function preserved
    function subscribe(
        address strategyNode,
        address[] calldata assetAddress,
        uint256[] calldata assetWeights,
        address baseAsset,
        uint256 amount,
        bool requireGuidelineCheck
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
        // set user subscription amount
        userSubscriptionAmount[msg.sender][strategyNode] = amount;
        // set user asset allocation
        userAssets[msg.sender][strategyNode] = assetAddress;
        // set user asset weights
        userAssetWeights[msg.sender][strategyNode] = assetWeights;
        // set subscription status to true
        isUserSubscribed[msg.sender][strategyNode] = true;
        // set last execution time
        userLastExecution[msg.sender][strategyNode] = block.timestamp;
        // set user base asset
        userBaseAsset[msg.sender][strategyNode] = baseAsset;
        // set base asset amount on strategy node
        baseAssetAmount[strategyNode][msg.sender] = amount;
        // add amount total total subscription amount
        baseAssetTotalSubscriptionAmount[
            userBaseAsset[msg.sender][strategyNode]
        ] += amount;
        // set guideline check requirement
        isGuidelineCheckRequired[msg.sender][
            strategyNode
        ] = requireGuidelineCheck;
        emit UserSubscribed(msg.sender, strategyNode, baseAsset, amount);
    }

    function unsubscribe(address strategyNode) public {
        require(
            isUserSubscribed[msg.sender][strategyNode],
            "User is not subscribed to this StrategyNode"
        );
        isUserSubscribed[msg.sender][strategyNode] = false;
        userSubscriptionAmount[msg.sender][strategyNode] = 0;
        baseAssetTotalSubscriptionAmount[
            userBaseAsset[msg.sender][strategyNode]
        ] -= baseAssetAmount[strategyNode][msg.sender];
        emit UserUnsubscribed(
            msg.sender,
            strategyNode,
            userBaseAsset[strategyNode][msg.sender],
            0
        );
    }

    function changeSubscriptionAmount(
        address strategyNode,
        uint256 amount
    ) public {
        require(
            isUserSubscribed[msg.sender][strategyNode],
            "User is not subscribed to this StrategyNode"
        );
        userSubscriptionAmount[msg.sender][strategyNode] = amount;
        emit UserSubscribed(
            msg.sender,
            strategyNode,
            userBaseAsset[msg.sender][strategyNode],
            amount
        );
    }

    function changeGuidelinCheckRequirement(
        address strategyNode,
        bool requireGuidelineCheck
    ) public {
        require(
            isUserSubscribed[msg.sender][strategyNode],
            "User is not subscribed to this StrategyNode"
        );
        isGuidelineCheckRequired[msg.sender][
            strategyNode
        ] = requireGuidelineCheck;
    }

    function changeBaseAsset(
        address strategyNode,
        address baseAsset,
        uint256 amount
    ) public {
        require(
            isUserSubscribed[msg.sender][strategyNode],
            "User is not subscribed to this StrategyNode"
        );
        require(
            allowedBaseAssets[strategyNode][baseAsset],
            "Base asset is not allowed by the operator"
        );
        userBaseAsset[msg.sender][strategyNode] = baseAsset;
        baseAssetAmount[strategyNode][msg.sender] = amount;
        // reduce previous subscription amount
        baseAssetTotalSubscriptionAmount[
            userBaseAsset[msg.sender][strategyNode]
        ] -= baseAssetAmount[strategyNode][msg.sender];
        baseAssetTotalSubscriptionAmount[baseAsset] += amount;
        emit UserBaseAssetUpdated(msg.sender, strategyNode, baseAsset, amount);
    }

    function unsubscribeUser(
        address user,
        address strategyNode
    ) public onlyProvider(strategyNode) {
        require(
            isUserSubscribed[user][strategyNode],
            "User is not subscribed to this StrategyNode"
        );
        isUserSubscribed[user][strategyNode] = false;
        userSubscriptionAmount[user][strategyNode] = 0;
        baseAssetTotalSubscriptionAmount[
            userBaseAsset[user][strategyNode]
        ] -= baseAssetAmount[user][strategyNode];
        emit UserUnsubscribed(
            user,
            strategyNode,
            userBaseAsset[user][strategyNode],
            0
        );
    }

    function changeAssetComposition(
        address strategyNode,
        address[] calldata assetAddress,
        uint256[] calldata assetWeights
    ) public {
        require(
            isUserSubscribed[msg.sender][strategyNode],
            "User is not subscribed to this StrategyNode"
        );
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
        userAssets[msg.sender][strategyNode] = assetAddress;
        userAssetWeights[msg.sender][strategyNode] = assetWeights;
        emit UserAssetUpdated(
            msg.sender,
            userBaseAsset[msg.sender][strategyNode],
            strategyNode,
            assetAddress,
            assetWeights
        );
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
