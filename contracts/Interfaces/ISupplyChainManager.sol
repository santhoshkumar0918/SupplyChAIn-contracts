// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISupplyChainManager {
    
    enum ShipmentStatus { Created, InTransit, Completed, Rejected }
    enum ParticipantRole { Supplier, Distributor, Retailer }


    struct Participant {
        address account;
        ParticipantRole role;
        bool isActive;
        uint256 reputationScore;
    }

    struct Shipment {
        uint256 id;
        address supplier;
        address receiver;
        uint256 price;
        string[] products;
        ShipmentStatus status;
        uint256 deadline;
        uint256 createdAt;
        bool temperatureControlled;
        uint256 minTemp;
        uint256 maxTemp;
    }

    // Events
    event ParticipantRegistered(address indexed account, ParticipantRole role);
    event ShipmentCreated(uint256 indexed shipmentId, address supplier, address receiver);
    event ShipmentUpdated(uint256 indexed shipmentId, ShipmentStatus status);
    event PaymentProcessed(uint256 indexed shipmentId, address to, uint256 amount);

    // Functions
    function registerParticipant(ParticipantRole role) external;
    function createShipment(
        address receiver,
        string[] memory products,
        uint256 price,
        uint256 deadline
    ) external returns (uint256);

    function updateShipmentStatus(uint256 shipmentId, ShipmentStatus status) external;
    function getShipment(uint256 shipmentId) external view returns (Shipment memory);
    function getParticipant(address account) external view returns (Participant memory);
}
