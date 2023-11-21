// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Counter {
    uint public number;

    event Increased(address);

    function getNumber() public view returns (uint) {
        return number;
    }

    function increaseNumber() public {
        number = number + 1;
        emit Increased(msg.sender);
    }
}
