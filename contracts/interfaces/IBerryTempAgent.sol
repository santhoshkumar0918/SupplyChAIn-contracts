// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBerryTempAgent {
    struct BerryBatch {
        uint256 batchId;
        string berryType;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        BatchStatus status;
        uint256 qualityScore;
        uint256 predictedShelfLife;
    }

    struct TemperatureReading {
        uint256 timestamp;
        int256 temperature;
        string location;
        bool isBreached;
        uint256 predictedImpact;
    }

    struct AgentPrediction {
        uint256 timestamp;
        uint256 predictedQuality;
        uint256 recommendedAction;
        string actionDescription;
    }

    enum BatchStatus { Created, InTransit, Delivered, Rejected }
    enum AgentAction { NoAction, Alert, Reroute, Expedite, Reject }

    event BatchCreated(uint256 indexed batchId, string berryType);
    event AgentAlert(uint256 indexed batchId, string alertMessage, AgentAction action);
    event QualityUpdated(uint256 indexed batchId, uint256 newScore, uint256 predictedShelfLife);
    event TemperatureRecorded(uint256 indexed batchId, int256 temperature, bool isBreached);

    function getBatchDetails(uint256 batchId) external view returns (BerryBatch memory);
    function getAgentPredictions(uint256 batchId) external view returns (AgentPrediction[] memory);
    function createBatch(string memory berryType) external returns (uint256);
    function recordTemperature(uint256 batchId, int256 temperature, string memory location) external;
}