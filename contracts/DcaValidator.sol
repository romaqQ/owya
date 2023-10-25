// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "solady/utils/ECDSA.sol";
import "kernel/interfaces/IValidator.sol";

struct ThirdPartyStorage {
    address provider;
    address executor;
}

contract DcaValidator is IKernelValidator {
    event ProviderAdded(
        address indexed kernel,
        address indexed provider,
        address indexed executor
    );
    event ProviderRemoved(
        address indexed kernel,
        address indexed provider,
        address indexed executor
    );
    event Log(
        address dcaContract,
        address executor,
        address sender,
        address provider,
        bytes4 functionSignature
    );

    mapping(address => ThirdPartyStorage) public thirdPartyStorage;
    mapping(address => address) public owner;
    mapping(address => address) public executor;

    constructor(address _executor) {
        executor[msg.sender] = _executor;
        owner[msg.sender] = msg.sender;
    }

    function enable(bytes calldata _data) external payable override {
        address _provider = address(bytes20(_data[12:32]));
        require(_provider != address(0));
        thirdPartyStorage[msg.sender].provider = _provider;
        address _exectutor = address(bytes20(_data[44:64]));
        thirdPartyStorage[msg.sender].executor = _exectutor;
        emit ProviderAdded(msg.sender, _provider, _exectutor);
    }

    function disable(bytes calldata) external payable override {
        address _provider = thirdPartyStorage[msg.sender].provider;
        address _executor = thirdPartyStorage[msg.sender].executor;
        delete thirdPartyStorage[msg.sender];
        emit ProviderRemoved(msg.sender, _provider, _executor);
    }

    function viewExecutor() external view returns (address) {
        return executor[msg.sender];
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
        // dcaContract = address(bytes20(userOpCallData[16:36]));
        // but we use assembly to avoid copying the data to memory

        address dcaContract = address(bytes20(userOpCallData[16:36]));
        bytes4 functionSignature = bytes4(userOpCallData[0:4]);

        emit Log(
            dcaContract,
            thirdPartyStorage[msg.sender].executor,
            msg.sender,
            thirdPartyStorage[msg.sender].provider,
            functionSignature
        );
        // check if the provided dcaContract is the same as the one stored in the executor mapping
        if (dcaContract != thirdPartyStorage[msg.sender].executor) {
            return ValidationData.wrap(1); //Validation failed
        }
        address signer = ECDSA.recover(_userOpHash, _userOp.signature);
        if (thirdPartyStorage[msg.sender].provider == signer) {
            return ValidationData.wrap(0);
        }
        //TODO: do we need this?
        bytes32 hash = ECDSA.toEthSignedMessageHash(_userOpHash);
        signer = ECDSA.recover(hash, _userOp.signature);
        if (thirdPartyStorage[msg.sender].provider == signer) {
            return ValidationData.wrap(0);
        }
        return ValidationData.wrap(1); //Validation failed
    }

    function validateSignature(
        bytes32 hash,
        bytes calldata signature
    ) public view override returns (ValidationData) {
        address signer = ECDSA.recover(hash, signature);
        if (thirdPartyStorage[msg.sender].provider == signer) {
            return ValidationData.wrap(0);
        }
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(hash);
        signer = ECDSA.recover(ethHash, signature);
        if (thirdPartyStorage[msg.sender].provider == signer) {
            return ValidationData.wrap(0);
        }
        return ValidationData.wrap(1); //Validation failed
    }

    function validCaller(
        address _caller,
        bytes calldata
    ) external view override returns (bool) {
        return (thirdPartyStorage[msg.sender].provider == _caller);
    }
}
