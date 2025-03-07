//contracts/interfaces/IBerryManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBerryManager {
    struct Supplier {
        address account;
        bool isRegistered;
        uint256 reputation;
        uint256 totalBatches;
        uint256 successfulBatches;
        uint256 lastActionTime;
    }

    struct AgentRecommendation {
        uint256 timestamp;
        uint256 batchId;
        uint256 recommendedAction;
        string actionDescription;
        bool isImplemented;
    }

    enum SupplierAction { None, Warn, Probation, Suspend, Reward }

    event SupplierRegistered(address indexed supplier);
    event SupplierActionTaken(address indexed supplier, SupplierAction action);
    event AgentRecommendationMade(uint256 indexed batchId, string recommendation);
    event ReputationUpdated(address indexed supplier, uint256 newReputation);
    event ShipmentCompleted(uint256 indexed batchId, address indexed supplier, uint256 timestamp);

    function registerSupplier() external;
    function processAgentRecommendation(uint256 batchId) external;
    function getSupplierDetails(address supplier) external view returns (Supplier memory);
    function getSupplierRecommendations(address supplier) external view returns (AgentRecommendation[] memory);
    function completeShipment(uint256 batchId) external returns (bool);
}