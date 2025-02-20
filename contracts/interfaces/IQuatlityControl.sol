// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IQualityControl {
    struct QualityCheck {
        uint256 timestamp;
        uint256 score;
        string notes;
        address inspector;
    }

    event QualityCheckPerformed(uint256 indexed shipmentId, uint256 score);
    event QualityAlert(uint256 indexed shipmentId, string message);

    function performQualityCheck(uint256 shipmentId, uint256 score, string memory notes) external;
    function getQualityHistory(uint256 shipmentId) external view returns (QualityCheck[] memory);
    function getLatestQualityScore(uint256 shipmentId) external view returns (uint256);
}