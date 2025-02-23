// contracts/core/BerryTempAgent.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBerryTempAgent.sol";

contract BerryTempAgent is IBerryTempAgent, Ownable {
    // Structs
    struct TemperatureReading {
        uint256 timestamp;
        int256 temperature;
        string location;
        bool isBreached;
        uint256 predictedImpact;
    }

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

        bool isBreached = checkTemperatureBreach(temperature);
        uint256 predictedImpact = calculatePredictedImpact(temperature);

        TemperatureReading memory reading = TemperatureReading({
            timestamp: block.timestamp,
            temperature: temperature,
            location: location,
            isBreached: isBreached,
            predictedImpact: predictedImpact
        });

        tempReadings[batchId].push(reading);
        emit TemperatureRecorded(batchId, temperature, isBreached);

        analyzeAndAct(batchId, reading);
    }

    function analyzeAndAct(
        uint256 batchId, 
        TemperatureReading memory reading
    ) internal {
        BerryBatch storage batch = berryBatches[batchId];
        
        if (reading.isBreached) {
            batch.qualityScore = batch.qualityScore > BREACH_PENALTY ? 
                batch.qualityScore - BREACH_PENALTY : 0;

            uint256 shelfLifeImpact = calculateShelfLifeImpact(reading);
            batch.predictedShelfLife = batch.predictedShelfLife > shelfLifeImpact ?
                batch.predictedShelfLife - shelfLifeImpact : 0;

            AgentAction action = determineAgentAction(batch, reading);
            string memory actionMsg = getActionMessage(action);

            // Record prediction
            agentPredictions[batchId].push(AgentPrediction({
                timestamp: block.timestamp,
                predictedQuality: batch.qualityScore,
                recommendedAction: uint256(action),
                actionDescription: actionMsg
            }));

            emit AgentAlert(batchId, actionMsg, action);
        }

        emit QualityUpdated(batchId, batch.qualityScore, batch.predictedShelfLife);
    }

    function determineAgentAction(
        BerryBatch memory batch,
        TemperatureReading memory reading
    ) internal pure returns (AgentAction) {
        if (batch.qualityScore < 60) {
            return AgentAction.Reject;
        } else if (batch.qualityScore < 70) {
            return AgentAction.Reroute;
        } else if (batch.qualityScore < 80) {
            return AgentAction.Expedite;
        } else if (reading.isBreached) {
            return AgentAction.Alert;
        }
        return AgentAction.NoAction;
    }

    function getActionMessage(
        AgentAction action
    ) internal pure returns (string memory) {
        if (action == AgentAction.Reject) {
            return "Critical quality loss - Reject batch";
        } else if (action == AgentAction.Reroute) {
            return "Significant quality impact - Reroute to nearest location";
        } else if (action == AgentAction.Expedite) {
            return "Quality concern - Expedite delivery";
        } else if (action == AgentAction.Alert) {
            return "Temperature breach detected - Monitor closely";
        }
        return "No action required";
    }

    function calculatePredictedImpact(
        int256 temperature
    ) internal pure returns (uint256) {
        if (temperature > MAX_TEMP) {
            return uint256(temperature - MAX_TEMP) * 2;
        } else if (temperature < MIN_TEMP) {
            return uint256(MIN_TEMP - temperature) * 2;
        }
        return 0;
    }

    function calculateShelfLifeImpact(
        TemperatureReading memory reading
    ) internal pure returns (uint256) {
        if (!reading.isBreached) return 0;
        
        uint256 baseImpact = 1 hours;
        return baseImpact * reading.predictedImpact;
    }

    function checkTemperatureBreach(
        int256 temperature
    ) internal pure returns (bool) {
        return temperature > MAX_TEMP || temperature < MIN_TEMP;
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