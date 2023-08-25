pragma solidity ^0.8.18;

import "./Counter.sol";

contract SimpleExecutor {
    Counter counter;


    // Function to get the wallet kernel storage
    constructor (address _counterAddress) {
       counter = Counter(_counterAddress);
    }

    function toggleCounter() external {
        counter.increaseNumber();
    }
}