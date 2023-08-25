// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "solady/utils/ECDSA.sol";
import "kernel/interfaces/IValidator.sol";


contract SimpleValidator is IKernelValidator {

    function disable(bytes calldata) external payable override {
    }

    function enable(bytes calldata _data) external payable override {
      
    }

    function validateUserOp(UserOperation calldata _userOp, bytes32 _userOpHash, uint256)
        external
        payable
        override
        returns (ValidationData validationData)
    {
        return ValidationData.wrap(0);
    }

    function validateSignature(bytes32 hash, bytes calldata signature) public view override returns (ValidationData) {
        return ValidationData.wrap(0);
    }

    function validCaller(address _caller, bytes calldata) external view override returns (bool) {
        return true;
    }
}