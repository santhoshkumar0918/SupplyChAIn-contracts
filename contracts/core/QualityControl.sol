// contracts/core/QualityControl.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IQuatlityControl.sol";

contract QualityControl is IQualityControl, Ownable {
    // State variables
    mapping(uint256 => QualityCheck[]) private qualityChecks;
    mapping(address => bool) private authorizedInspectors;
    
    uint256 public constant MINIMUM_ACCEPTABLE_SCORE = 70;
    uint256 public constant MAXIMUM_SCORE = 100;

    event InspectorAdded(address indexed inspector);
    event InspectorRemoved(address indexed inspector);

    // Constructor with Ownable initialization
    constructor() Ownable(msg.sender) {
        // Initialize contract
    }

    modifier onlyAuthorizedInspector() {
        require(authorizedInspectors[msg.sender], "Not authorized inspector");
        _;
    }

    function addInspector(address inspector) external onlyOwner {
        require(inspector != address(0), "Invalid address");
        require(!authorizedInspectors[inspector], "Already authorized");
        authorizedInspectors[inspector] = true;
        emit InspectorAdded(inspector);
    }

    function removeInspector(address inspector) external onlyOwner {
        require(authorizedInspectors[inspector], "Not an inspector");
        authorizedInspectors[inspector] = false;
        emit InspectorRemoved(inspector);
    }

    function performQualityCheck(
        uint256 shipmentId,
        uint256 score,
        string memory notes
    ) external override onlyAuthorizedInspector {
        require(score <= MAXIMUM_SCORE, "Invalid score");
        
        QualityCheck memory check = QualityCheck({
            timestamp: block.timestamp,
            score: score,
            notes: notes,
            inspector: msg.sender
        });

        qualityChecks[shipmentId].push(check);

        emit QualityCheckPerformed(shipmentId, score);

        if (score < MINIMUM_ACCEPTABLE_SCORE) {
            emit QualityAlert(shipmentId, "Quality score below minimum threshold");
        }
    }

    function getQualityHistory(
        uint256 shipmentId
    ) external view override returns (QualityCheck[] memory) {
        return qualityChecks[shipmentId];
    }

    function getLatestQualityScore(
        uint256 shipmentId
    ) external view override returns (uint256) {
        QualityCheck[] storage checks = qualityChecks[shipmentId];
        if (checks.length == 0) return 0;
        return checks[checks.length - 1].score;
    }

    function isInspector(address account) external view returns (bool) {
        return authorizedInspectors[account];
    }

    function getChecksCount(uint256 shipmentId) external view returns (uint256) {
        return qualityChecks[shipmentId].length;
    }

    function getAverageScore(uint256 shipmentId) external view returns (uint256) {
        QualityCheck[] storage checks = qualityChecks[shipmentId];
        if (checks.length == 0) return 0;
        
        uint256 total = 0;
        for (uint256 i = 0; i < checks.length; i++) {
            total += checks[i].score;
        }
        return total / checks.length;
    }
}