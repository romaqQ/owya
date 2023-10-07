// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract UserManager {
    address public owner;
    bool public subscriptionsEnabled;

    struct Asset {
        address asset;
        string symbol;
        uint256 weight;
    }

    mapping(address => bool) public isUserSubscribed;
    mapping(address => uint256) public userLastExecution;
    mapping(address => uint256) public userSubscriptionAmount;
    mapping(address => Asset[]) public userAllocations;
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

    function subscribe(Asset[] memory assets, uint256 amount, bool checkGuidelines) public canSubscribe {
        _setUserAllocation(assets, amount, checkGuidelines);
    }

    function _setUserAllocation(Asset[] memory assets, uint256 amount, bool checkGuidelines) internal {
        uint256 totalWeight = 0;
        for (uint i = 0; i < assets.length; i++) {
            totalWeight += assets[i].weight;
        }
        require(totalWeight == TOTAL_BASIS_POINTS, "Total weights must equal 10,000 basis points");
        
        userSubscriptionAmount[msg.sender] = amount;
        userAllocations[msg.sender] = assets;
        requireGuidelines[msg.sender] = checkGuidelines;
        isUserSubscribed[msg.sender] = true;
    }

    function changeUserAllocation(Asset[] memory newAssets) public {
        require(isUserSubscribed[msg.sender], "User is not subscribed");

        uint256 newTotalWeight = 0;
        for (uint i = 0; i < newAssets.length; i++) {
            newTotalWeight += newAssets[i].weight;
        }
        require(newTotalWeight == TOTAL_BASIS_POINTS, "Total newWeights must equal 10,000 basis points");
        
        userAllocations[msg.sender] = newAssets;
    }

    function changeUserSubscriptionAmount(uint256 amount) public {
        require(isUserSubscribed[msg.sender], "User is not subscribed");
        userSubscriptionAmount[msg.sender] = amount;
    }
    
    function toggleSubscription() public {
        isUserSubscribed[msg.sender] = !isUserSubscribed[msg.sender];
    }

    function viewUserAllocations(address user) public view returns (Asset[] memory) {
        return userAllocations[user];
    }
}
