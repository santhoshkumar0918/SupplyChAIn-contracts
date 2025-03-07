// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBerryTempAgent.sol";
import "../interfaces/IBerryManager.sol";

contract BerryManager is IBerryManager, Ownable {
    // State variables
    IBerryTempAgent public berryAgent;
    mapping(address => Supplier) public suppliers;
    mapping(address => AgentRecommendation[]) public supplierRecommendations;
    
    // Constants
    uint256 public constant MIN_REPUTATION = 0;
    uint256 public constant MAX_REPUTATION = 100;
    uint256 public constant INITIAL_REPUTATION = 80;

    constructor(address _berryAgent) Ownable(msg.sender) {
        berryAgent = IBerryTempAgent(_berryAgent);
    }

    modifier onlyRegisteredSupplier() {
        require(suppliers[msg.sender].isRegistered, "Not registered");
        _;
    }

    function registerSupplier() external override {
        require(!suppliers[msg.sender].isRegistered, "Already registered");

        suppliers[msg.sender] = Supplier({
            account: msg.sender,
            isRegistered: true,
            reputation: INITIAL_REPUTATION,
            totalBatches: 0,
            successfulBatches: 0,
            lastActionTime: block.timestamp
        });

        emit SupplierRegistered(msg.sender);
    }

    function processAgentRecommendation(
        uint256 batchId
    ) external override onlyRegisteredSupplier {
        // Get batch details and predictions from BerryTempAgent
        IBerryTempAgent.BerryBatch memory batch = berryAgent.getBatchDetails(batchId);
        IBerryTempAgent.AgentPrediction[] memory predictions = berryAgent.getAgentPredictions(batchId);
        
        // Improved error handling - emit event if no predictions
        if (predictions.length == 0) {
            emit AgentRecommendationMade(batchId, "No predictions available for this batch");
            return;
        }

        // Get latest prediction
        IBerryTempAgent.AgentPrediction memory latestPrediction = predictions[predictions.length - 1];
        
        // Create recommendation
        AgentRecommendation memory recommendation = AgentRecommendation({
            timestamp: block.timestamp,
            batchId: batchId,
            recommendedAction: latestPrediction.recommendedAction,
            actionDescription: latestPrediction.actionDescription,
            isImplemented: false
        });

        // Store recommendation
        supplierRecommendations[msg.sender].push(recommendation);
        
        // Update supplier reputation based on batch quality
        updateSupplierReputation(msg.sender, batch.qualityScore);

        emit AgentRecommendationMade(batchId, recommendation.actionDescription);
    }

    function updateSupplierReputation(
        address supplier,
        uint256 batchQuality
    ) internal {
        Supplier storage sup = suppliers[supplier];
        uint256 oldReputation = sup.reputation;

        // Update reputation based on batch quality
        if (batchQuality >= 90) {
            sup.reputation = min(sup.reputation + 5, MAX_REPUTATION);
            sup.successfulBatches++;
            takeSupplierAction(supplier, SupplierAction.Reward);
        } else if (batchQuality < 70) {
            sup.reputation = max(sup.reputation - 10, MIN_REPUTATION);
            takeSupplierAction(supplier, SupplierAction.Warn);
        }

        if (sup.reputation != oldReputation) {
            emit ReputationUpdated(supplier, sup.reputation);
        }
    }

    function takeSupplierAction(
        address supplier,
        SupplierAction action
    ) internal {
        Supplier storage sup = suppliers[supplier];
        
        if (action == SupplierAction.Warn && sup.reputation < 50) {
            action = SupplierAction.Probation;
        }
        
        if (action == SupplierAction.Probation && sup.reputation < 30) {
            action = SupplierAction.Suspend;
        }

        sup.lastActionTime = block.timestamp;
        emit SupplierActionTaken(supplier, action);
    }

    function getSupplierDetails(
        address supplier
    ) external view override returns (Supplier memory) {
        return suppliers[supplier];
    }

    function getSupplierRecommendations(
        address supplier
    ) external view override returns (AgentRecommendation[] memory) {
        return supplierRecommendations[supplier];
    }

    // Helper functions
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}