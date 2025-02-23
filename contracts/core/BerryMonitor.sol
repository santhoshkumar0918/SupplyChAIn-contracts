// contracts/core/TemperatureMonitor.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ITemperatureMonitor.sol";

contract TemperatureMonitor is ITemperatureMonitor, Ownable {
    // State variables
    mapping(uint256 => TemperatureRecord[]) private temperatureRecords;
    mapping(uint256 => uint256) private breachCounts;
    mapping(address => bool) private authorizedDevices;
    
    // Constants
    int256 public constant MINIMUM_TEMPERATURE = 2;  // 2°C
    int256 public constant MAXIMUM_TEMPERATURE = 8;  // 8°C
    uint256 public constant BREACH_THRESHOLD_DURATION = 30 minutes;

    // Events
    event DeviceAuthorized(address indexed device);
    event DeviceDeauthorized(address indexed device);
    event CriticalTemperatureBreach(uint256 indexed shipmentId, int256 temperature);

    constructor() Ownable(msg.sender) {
        // Initialize contract
    }

    modifier onlyAuthorizedDevice() {
        require(authorizedDevices[msg.sender], "Not authorized device");
        _;
    }

    function authorizeDevice(address device) external onlyOwner {
        require(device != address(0), "Invalid device address");
        require(!authorizedDevices[device], "Device already authorized");
        authorizedDevices[device] = true;
        emit DeviceAuthorized(device);
    }

    function deauthorizeDevice(address device) external onlyOwner {
        require(authorizedDevices[device], "Device not authorized");
        authorizedDevices[device] = false;
        emit DeviceDeauthorized(device);
    }

    function recordTemperature(
        uint256 shipmentId,
        int256 temperature
    ) external override onlyAuthorizedDevice {
        bool isBreached = isTemperatureBreach(temperature);

        TemperatureRecord memory record = TemperatureRecord({
            timestamp: block.timestamp,
            temperature: temperature,
            isBreached: isBreached
        });

        temperatureRecords[shipmentId].push(record);
        
        if (isBreached) {
            breachCounts[shipmentId]++;
            emit TemperatureBreach(shipmentId, temperature);
            
            if (isCriticalBreach(temperature)) {
                emit CriticalTemperatureBreach(shipmentId, temperature);
            }
        }

        emit TemperatureRecorded(shipmentId, temperature);
    }

    function getTemperatureHistory(
        uint256 shipmentId
    ) external view override returns (TemperatureRecord[] memory) {
        return temperatureRecords[shipmentId];
    }

    function getBreachCount(
        uint256 shipmentId
    ) external view override returns (uint256) {
        return breachCounts[shipmentId];
    }

    function isTemperatureBreach(int256 temperature) public pure returns (bool) {
        return temperature < MINIMUM_TEMPERATURE || temperature > MAXIMUM_TEMPERATURE;
    }

    function isCriticalBreach(int256 temperature) public pure returns (bool) {
        return temperature < MINIMUM_TEMPERATURE - 2 || temperature > MAXIMUM_TEMPERATURE + 2;
    }

    function getAverageTemperature(uint256 shipmentId) external view returns (int256) {
        TemperatureRecord[] storage records = temperatureRecords[shipmentId];
        if (records.length == 0) return 0;

        int256 total = 0;
        for (uint256 i = 0; i < records.length; i++) {
            total += records[i].temperature;
        }
        return total / int256(records.length);
    }

    function getLastTemperature(uint256 shipmentId) external view returns (int256) {
        TemperatureRecord[] storage records = temperatureRecords[shipmentId];
        if (records.length == 0) revert("No temperature records");
        return records[records.length - 1].temperature;
    }

    function getTemperatureRange(uint256 shipmentId) external view returns (int256, int256) {
        TemperatureRecord[] storage records = temperatureRecords[shipmentId];
        if (records.length == 0) revert("No temperature records");

        int256 minTemp = records[0].temperature;
        int256 maxTemp = records[0].temperature;

        for (uint256 i = 1; i < records.length; i++) {
            if (records[i].temperature < minTemp) {
                minTemp = records[i].temperature;
            }
            if (records[i].temperature > maxTemp) {
                maxTemp = records[i].temperature;
            }
        }

        return (minTemp, maxTemp);
    }

    function isDeviceAuthorized(address device) external view returns (bool) {
        return authorizedDevices[device];
    }
}