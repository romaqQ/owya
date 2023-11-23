// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "solady/utils/ECDSA.sol";
import "kernel/interfaces/IValidator.sol";

import "hardhat/console.sol";
struct ThirdPartyStorage {
    address provider;
    uint256 validUntil;
    uint256 validAfter;
}

// TODO: Check if ECDSA is required to retrieve userOp sender signature check
//       i.e. is it required to check the signature or is it enough to check the sender address
// TODO: Check the appropriate subscribed amount of base asset that is passed as calldata

contract UniversalValidator is IKernelValidator {
    event StrategyAdded(
        address indexed kernel,
        address indexed provider,
        address indexed executor
    );
    event StrategyRemoved(
        address indexed kernel,
        address indexed provider,
        address indexed executor
    );
    event Log(
        address executor,
        address sender,
        address provider,
        bytes4 functionSignature,
        address userOpSender,
        address signer
    );
    mapping(address => address) public owner;
    // executor => kernel => provider
    mapping(address => mapping(address => ThirdPartyStorage))
        public executorProvider;

    constructor(address _executor) {
        owner[msg.sender] = msg.sender;
    }

    function enable(bytes calldata _data) external payable override {
        address _provider = address(bytes20(_data[12:32]));
        require(_provider != address(0));
        address _executor = address(bytes20(_data[44:64]));
        executorProvider[_executor][msg.sender].provider = _provider;

        // executorProvider[_executor][msg.sender] = _provider;
        emit StrategyAdded(msg.sender, _provider, _executor);
    }

    function disable(bytes calldata _data) external payable override {
        address _executor = address(bytes20(_data[12:32]));
        require(_executor != address(0));
        address _provider = executorProvider[_executor][msg.sender].provider;
        delete executorProvider[_executor][msg.sender];
        emit StrategyRemoved(msg.sender, _provider, _executor);
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner[msg.sender],
            "Only owner can call this function"
        );
        _;
    }

    function validateUserOp(
        UserOperation calldata _userOp,
        bytes32 _userOpHash,
        uint256
    ) external payable override returns (ValidationData validationData) {
        // the function signature of the function being called by DelegateHandler
        // "delegateExecute(address,uint256,uint256[])" is represented by the first 4 bytes of the calldata
        // the first 4 bytes of the calldata is the function signature of the function being called by DelegateHandler
        // the next 32 bytes represent the address of the DCA contract padded to 32 bytes, which is the first argument of the function being called by DelegateHandler
        // the next 32 bytes represent the totalAmountInEth, which is the second argument of the function being called by DelegateHandler
        // the next 32 bytes represent the length of the amountsInETH array, which is the third argument of the function being called by DelegateHandler

        uint256 userOpEndOffset;
        bytes calldata userOpCallData;
        assembly {
            userOpEndOffset := add(calldataload(0x04), 0x24)
            userOpCallData.offset := add(
                calldataload(add(userOpEndOffset, 0x40)),
                userOpEndOffset
            )
            userOpCallData.length := calldataload(
                sub(userOpCallData.offset, 0x20)
            )
        }
        // this is the same as doing:
        // bytes calldata userOpCallData = _userOp.callData;
        // executor = address(bytes20(userOpCallData[16:36]));
        // but we use assembly to avoid copying the data to memory

        address executor = address(bytes20(userOpCallData[16:36]));
        bytes4 functionSignature = bytes4(userOpCallData[0:4]);

        // check if the provided dcaContract is the same as the one stored in the executor mapping
        //TODO: do we need to check for the userOP sender or signer or is it irrelevant?
        bytes32 hash = ECDSA.toEthSignedMessageHash(_userOpHash);
        address signer = ECDSA.recover(hash, _userOp.signature);
        emit Log(
            executor,
            msg.sender,
            executorProvider[executor][msg.sender].provider,
            functionSignature,
            _userOp.sender,
            signer
        );

        if (executorProvider[executor][msg.sender].provider == signer) {
            return ValidationData.wrap(0);
        }
        return ValidationData.wrap(1); //Validation failed
    }

    // only relevant if one wants to use the validator as the default validator for a given kernel
    // in that sense we only care about if the owner of the validator is the caller
    function validateSignature(
        bytes32 hash,
        bytes calldata signature
    ) public view override returns (ValidationData) {
        address signer = ECDSA.recover(hash, signature);
        if (owner[msg.sender] == signer) {
            return ValidationData.wrap(0);
        }
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(hash);
        signer = ECDSA.recover(ethHash, signature);
        if (owner[msg.sender] == signer) {
            return ValidationData.wrap(0);
        }
        return ValidationData.wrap(1); //Validation failed
    }

    function validCaller(
        address _caller,
        bytes calldata
    ) external view override returns (bool) {
        revert("not implemented");
        // return (thirdPartyStorage[msg.sender].provider == _caller);
    }
}
