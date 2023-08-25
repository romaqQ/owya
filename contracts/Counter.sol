// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


contract Counter {
    uint public number;
    address lastTriggerAddress;
    
    function increaseNumber() public {
        lastTriggerAddress = msg.sender;
        number = number + 1;
    }
}
