// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

abstract contract CallerContractInterface {
    function callback(uint256 _ethPrice, uint256 id) public virtual;
}
