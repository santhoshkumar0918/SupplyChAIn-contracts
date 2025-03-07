// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBerryTempAgent.sol";

contract BerryTempAgent is IBerryTempAgent, Ownable {
    // State variables
    mapping(uint256 => BerryBatch) public berryBatches;
    mapping(uint256 => TemperatureReading[]) public tempReadings;
    mapping(uint256 => AgentPrediction[]) public agentPredictions;
    uint256 public batchCount;

    // Constants for berry temperature monitoring
    int256 public constant OPTIMAL_TEMP = 2;  
    int256 public constant MAX_TEMP = 4;      
    int256 public constant MIN_TEMP = 0;     
    uint256 public constant BREACH_PENALTY = 5;
    uint256 public constant SHELF_LIFE_BASE = 72 hours;

    // Events for the completeShipment function
    event ShipmentCompleted(uint256 indexed batchId, uint256 qualityScore, uint256 finalShelfLife);

    constructor() Ownable(msg.sender) {}

    function createBatch(
        string memory berryType
    ) external returns (uint256) {
        uint256 batchId = batchCount++;
        berryBatches[batchId] = BerryBatch({
            batchId: batchId,
            berryType: berryType,
            startTime: block.timestamp,
            endTime: 0,
            isActive: true,
            status: BatchStatus.Created,
            qualityScore: 100,
            predictedShelfLife: SHELF_LIFE_BASE
        });

        emit BatchCreated(batchId, berryType);
        return batchId;
    }

    function recordTemperature(
        uint256 batchId,
        int256 temperature,
        string memory location
    ) external {
        require(berryBatches[batchId].isActive, "Batch not active");

        // Calculate breach and impact in memory
        bool isBreached = temperature > MAX_TEMP || temperature < MIN_TEMP;
        uint256 predictedImpact = 0;
        
        if (isBreached) {
            predictedImpact = temperature > MAX_TEMP 
                ? uint256(temperature - MAX_TEMP) * 2 
                : uint256(MIN_TEMP - temperature) * 2;
        }

        // Store temperature reading
        tempReadings[batchId].push(TemperatureReading({
            timestamp: block.timestamp,
            temperature: temperature,
            location: location,
            isBreached: isBreached,
            predictedImpact: predictedImpact
        }));

        emit TemperatureRecorded(batchId, temperature, isBreached);

        // Only handle breach if necessary
        if (isBreached) {
            _handleTemperatureBreach(batchId, predictedImpact);
        }
    }

    function _handleTemperatureBreach(
        uint256 batchId, 
        uint256 predictedImpact
    ) internal {
        BerryBatch storage batch = berryBatches[batchId];
        
        // Update quality score
        if (batch.qualityScore > BREACH_PENALTY) {
            batch.qualityScore -= BREACH_PENALTY;
        } else {
            batch.qualityScore = 0;
        }

        // Calculate shelf life impact
        uint256 shelfLifeImpact = predictedImpact * 1 hours;
        
        // Update predicted shelf life
        if (batch.predictedShelfLife > shelfLifeImpact) {
            batch.predictedShelfLife -= shelfLifeImpact;
        } else {
            batch.predictedShelfLife = 0;
        }

        // Determine action based on quality
        AgentAction action;
        string memory actionMsg;
        
        if (batch.qualityScore < 60) {
            action = AgentAction.Reject;
            actionMsg = "Critical quality loss - Reject batch";
        } else if (batch.qualityScore < 70) {
            action = AgentAction.Reroute;
            actionMsg = "Significant quality impact - Reroute to nearest location";
        } else if (batch.qualityScore < 80) {
            action = AgentAction.Expedite;
            actionMsg = "Quality concern - Expedite delivery";
        } else {
            action = AgentAction.Alert;
            actionMsg = "Temperature breach detected - Monitor closely";
        }

        // Record prediction
        agentPredictions[batchId].push(AgentPrediction({
            timestamp: block.timestamp,
            predictedQuality: batch.qualityScore,
            recommendedAction: uint256(action),
            actionDescription: actionMsg
        }));

        emit AgentAlert(batchId, actionMsg, action);
        emit QualityUpdated(batchId, batch.qualityScore, batch.predictedShelfLife);
    }

    // New function to complete a shipment
    function completeShipment(uint256 batchId) external returns (bool) {
        BerryBatch storage batch = berryBatches[batchId];
        
        // Validate batch
        require(batch.isActive, "Batch is not active");
        require(batch.status != BatchStatus.Completed, "Batch already completed");
        
        // Update batch status
        batch.isActive = false;
        batch.status = BatchStatus.Completed;
        batch.endTime = block.timestamp;
        
        // Calculate final quality metrics based on temperature history
        uint256 finalQualityScore = batch.qualityScore;
        uint256 finalShelfLife = batch.predictedShelfLife;
        
        // Emit completion event
        emit ShipmentCompleted(batchId, finalQualityScore, finalShelfLife);
        
        return true;
    }

    function getBatchDetails(
        uint256 batchId
    ) external view returns (BerryBatch memory) {
        return berryBatches[batchId];
    }

    function getTemperatureHistory(
        uint256 batchId
    ) external view returns (TemperatureReading[] memory) {
        return tempReadings[batchId];
    }

    function getAgentPredictions(
        uint256 batchId
    ) external view returns (AgentPrediction[] memory) {
        return agentPredictions[batchId];
    }
}