// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITemperatureMonitor {
    struct TemperatureRecord {
        uint256 timestamp;
        int256 temperature;
        bool isBreached;
    }

    event TemperatureRecorded(uint256 indexed shipmentId, int256 temperature);
    event TemperatureBreach(uint256 indexed shipmentId, int256 temperature);

    function recordTemperature(uint256 shipmentId, int256 temperature) external;
    function getTemperatureHistory(uint256 shipmentId) external view returns (TemperatureRecord[] memory);
    function getBreachCount(uint256 shipmentId) external view returns (uint256);
}