pragma solidity ^0.8.18;

import "./Counter.sol";

contract SimpleExecutor {
    event Toggled(address);

    function toggleCounter(address _counter) external {
        emit Toggled(msg.sender);
        Counter(_counter).increaseNumber();
    }
}