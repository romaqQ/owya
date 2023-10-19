// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "solady/utils/ECDSA.sol";
import "kernel/interfaces/IValidator.sol";

contract DcaValidator is IKernelValidator {
    mapping(address => address) public executor;
    mapping(address => address) public owner;

    constructor(address _executor) {
        executor[msg.sender] = _executor;
        owner[msg.sender] = msg.sender;
    }

    function disable(bytes calldata) external payable override {}

    function enable(bytes calldata _data) external payable override {}

    function validateUserOp(
        UserOperation calldata _userOp,
        bytes32 _userOpHash,
        uint256
    ) external payable override returns (ValidationData validationData) {
        return ValidationData.wrap(0);
    }

    function validateSignature(
        bytes32 hash,
        bytes calldata signature
    ) public view override returns (ValidationData) {
        return ValidationData.wrap(0);
    }

    function validCaller(
        address _caller,
        bytes calldata
    ) external view override returns (bool) {
        return true;
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
}
