// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "solady/utils/ECDSA.sol";
import "kernel/interfaces/IValidator.sol";

struct ThirdPartyStorage {
    address provider;
}

contract DcaValidatorOrig is IKernelValidator {
    event ProviderAdded(address indexed kernel, address indexed provider);
    event ProviderRemoved(address indexed kernel, address indexed provider);

    mapping(address => ThirdPartyStorage) public thirdPartyStorage;
    mapping(address => address) public executor;
    mapping(address => address) public owner;

    constructor(address _executor) {
        executor[msg.sender] = _executor;
        owner[msg.sender] = msg.sender;
    }

    function enable(bytes calldata _data) external payable override {
        address _provider = address(bytes20(_data[0:20]));
        require(_provider != address(0));
        thirdPartyStorage[msg.sender].provider = _provider;
        emit ProviderAdded(msg.sender, _provider);
    }

    function disable(bytes calldata) external payable override {
        address _provider = thirdPartyStorage[msg.sender].provider;
        delete thirdPartyStorage[msg.sender];
        emit ProviderRemoved(msg.sender, _provider);
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

    function setExecutor(address _executor) external onlyOwner {
        executor[msg.sender] = _executor;
    }

    function validateUserOp(
        UserOperation calldata _userOp,
        bytes32 _userOpHash,
        uint256
    ) external payable override returns (ValidationData validationData) {
        // the function signature of the function being called by DelegateHandler
        // "executeDCA(address,uint256[])" is represented by the first 4 bytes of the calldata
        // calldataload(0x4) means that we are reading from the 4th byte of the calldata
        // then we skip 0x24 = 32 bytes in hex (i.e. 36 bytes offset in total) to get the address of the user
        // the 32 bytes after the first 4 bytes represent the padded value of the length of dynamic data, if there is any
        // otherwise the 32 bytes are just 0s
        bytes memory data = _userOp.callData;
        address dcaContract;
        assembly {
            dcaContract := and(
                mload(add(data, 0x24)),
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
            )
        }

        if (dcaContract != executor[msg.sender]) {
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
