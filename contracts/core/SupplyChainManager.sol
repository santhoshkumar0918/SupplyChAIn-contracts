// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IPaymentHandler.sol";
import "../interfaces/ISupplyChainManager.sol";
import "../interfaces/IQuatlityControl.sol";
import "../interfaces/ITemperaureMonitor.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract SupplyChainManager is ISupplyChainManager, Ownable, ReentrancyGuard {
    // State variables
    mapping(address => Participant) private participants;
    mapping(uint256 => Shipment) private shipments;
    uint256 private shipmentCounter;

    IQualityControl public qualityControl;
    ITemperatureMonitor public temperatureMonitor;
    IPaymentHandler public paymentHandler;
    IERC20 public paymentToken;

    // Constants
    uint256 public constant MIN_REPUTATION = 0;
    uint256 public constant MAX_REPUTATION = 100;
    uint256 public constant INITIAL_REPUTATION = 80;
    uint256 public constant MIN_STAKE = 100 ether; // Minimum stake required

    constructor(
        address _qualityControl,
        address _temperatureMonitor,
        address _paymentHandler,
        address _paymentToken
    ) {
        qualityControl = IQualityControl(_qualityControl);
        temperatureMonitor = ITemperatureMonitor(_temperatureMonitor);
        paymentHandler = IPaymentHandler(_paymentHandler);
        paymentToken = IERC20(_paymentToken);
    }

    modifier onlyRegisteredParticipant() {
        require(participants[msg.sender].isActive, "Not a registered participant");
        _;
    }

    modifier onlyRole(ParticipantRole role) {
        require(participants[msg.sender].role == role, "Incorrect role");
        _;
    }

    function registerParticipant(
        ParticipantRole role
    ) external override {
        require(participants[msg.sender].account == address(0), "Already registered");
        require(
            paymentToken.transferFrom(msg.sender, address(this), MIN_STAKE),
            "Stake transfer failed"
        );

        participants[msg.sender] = Participant({
            account: msg.sender,
            role: role,
            isActive: true,
            reputationScore: INITIAL_REPUTATION
        });

        emit ParticipantRegistered(msg.sender, role);
    }

    function createShipment(
        address receiver,
        string[] memory products,
        uint256 price,
        uint256 deadline
    ) external override onlyRegisteredParticipant onlyRole(ParticipantRole.Supplier) returns (uint256) {
        require(participants[receiver].isActive, "Receiver not registered");
        require(deadline > block.timestamp, "Invalid deadline");
        require(price > 0, "Invalid price");

        uint256 shipmentId = shipmentCounter++;
        
        shipments[shipmentId] = Shipment({
            id: shipmentId,
            supplier: msg.sender,
            receiver: receiver,
            price: price,
            products: products,
            status: ShipmentStatus.Created,
            deadline: deadline,
            createdAt: block.timestamp,
            temperatureControlled: true,
            minTemp: 2,
            maxTemp: 8
        });

        // Lock payment
        require(
            paymentToken.transferFrom(receiver, address(paymentHandler), price),
            "Payment lock failed"
        );

        emit ShipmentCreated(shipmentId, msg.sender, receiver);
        return shipmentId;
    }

    function updateShipmentStatus(
        uint256 shipmentId,
        ShipmentStatus status
    ) external override onlyRegisteredParticipant {
        Shipment storage shipment = shipments[shipmentId];
        require(
            msg.sender == shipment.supplier || msg.sender == shipment.receiver,
            "Unauthorized"
        );
        require(status != shipment.status, "Status not changed");

        if (status == ShipmentStatus.Completed) {
            require(block.timestamp <= shipment.deadline, "Deadline exceeded");
            require(
                qualityControl.getLatestQualityScore(shipmentId) >= 70,
                "Quality check failed"
            );
            require(
                temperatureMonitor.getBreachCount(shipmentId) == 0,
                "Temperature breaches detected"
            );
            
            // Process payment
            paymentHandler.processPayment(shipmentId);
            
            // Update reputation
            _updateReputation(shipment.supplier, true);
            _updateReputation(shipment.receiver, true);
        }

        if (status == ShipmentStatus.Rejected) {
            _updateReputation(shipment.supplier, false);
        }

        shipment.status = status;
        emit ShipmentUpdated(shipmentId, status);
    }

    function getShipment(
        uint256 shipmentId
    ) external view override returns (Shipment memory) {
        require(shipmentId < shipmentCounter, "Invalid shipment ID");
        return shipments[shipmentId];
    }

    function getParticipant(
        address account
    ) external view override returns (Participant memory) {
        return participants[account];
    }

    function _updateReputation(address participant, bool increase) internal {
        if (increase) {
            if (participants[participant].reputationScore < MAX_REPUTATION) {
                participants[participant].reputationScore += 1;
            }
        } else {
            if (participants[participant].reputationScore > MIN_REPUTATION) {
                participants[participant].reputationScore -= 1;
            }
        }
    }

    // Emergency functions
    function setQualityControl(address _qualityControl) external onlyOwner {
        qualityControl = IQualityControl(_qualityControl);
    }

    function setTemperatureMonitor(address _temperatureMonitor) external onlyOwner {
        temperatureMonitor = ITemperatureMonitor(_temperatureMonitor);
    }

    function setPaymentHandler(address _paymentHandler) external onlyOwner {
        paymentHandler = IPaymentHandler(_paymentHandler);
    }

    function withdrawStake() external onlyRegisteredParticipant {
        require(
            getActiveShipmentCount(msg.sender) == 0,
            "Active shipments exist"
        );
        participants[msg.sender].isActive = false;
        require(
            paymentToken.transfer(msg.sender, MIN_STAKE),
            "Stake transfer failed"
        );
    }

    function getActiveShipmentCount(address participant) public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < shipmentCounter; i++) {
            if ((shipments[i].supplier == participant || shipments[i].receiver == participant) &&
                (shipments[i].status != ShipmentStatus.Completed && 
                 shipments[i].status != ShipmentStatus.Rejected)) {
                count++;
            }
        }
        return count;
    }
}