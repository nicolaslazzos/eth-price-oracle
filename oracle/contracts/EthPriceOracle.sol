// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";
import "./CallerContractInterface.sol";

contract EthPriceOracle is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    uint256 private randNonce = 0;
    uint256 private modulus = 1000;
    uint256 private numOracles = 0;
    mapping(uint256 => bool) pendingRequests;

    event GetLatestEthPriceEvent(address callerAddress, uint256 id);
    event SetLatestEthPriceEvent(uint256 ethPrice, address callerAddress);
    event AddOracleEvent(address oracleAddress);
    event RemoveOracleEvent(address oracleAddress);

    constructor(address _owner) {
        _setRoleAdmin(ORACLE_ROLE, OWNER_ROLE);
        _setupRole(OWNER_ROLE, _owner);
    }

    function addOracle(address _oracle) public onlyRole(OWNER_ROLE) {
        require(!hasRole(ORACLE_ROLE, _oracle), "Already an oracle!");
        _setupRole(ORACLE_ROLE, _oracle);
        numOracles++;
        emit AddOracleEvent(_oracle);
    }

    function removeOracle(address _oracle) public onlyRole(OWNER_ROLE) {
        require(hasRole(ORACLE_ROLE, _oracle), "Not an oracle!");
        require(numOracles > 1, "Do not remove the last oracle!");
        revokeRole(ORACLE_ROLE, _oracle);
        numOracles--;
        emit RemoveOracleEvent(_oracle);
    }

    function getLatestEthPrice() public returns (uint256) {
        randNonce++;
        uint256 id = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))
        ) % modulus;
        pendingRequests[id] = true;
        emit GetLatestEthPriceEvent(msg.sender, id);
        return id;
    }

    function setLatestEthPrice(
        uint256 _ethPrice,
        address _callerAddress,
        uint256 _id
    ) public onlyRole(ORACLE_ROLE) {
        require(
            pendingRequests[_id],
            "This request is not in my pending list."
        );
        delete pendingRequests[_id];

        CallerContractInterface callerContractInstance;
        callerContractInstance = CallerContractInterface(_callerAddress);
        callerContractInstance.callback(_ethPrice, _id);
        emit SetLatestEthPriceEvent(_ethPrice, _callerAddress);
    }
}
