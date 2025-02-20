// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IPaymentHandler.sol";

contract PaymentHandler is IPaymentHandler, Ownable, ReentrancyGuard {
    // State variables
    mapping(uint256 => Payment) private payments;
    IERC20 public paymentToken;
    
    address public supplyChainManager;
    uint256 public constant PAYMENT_LOCK_PERIOD = 1 days;
    uint256 public constant PENALTY_PERCENTAGE = 10; // 10% penalty for breaches

    event PaymentLocked(uint256 indexed shipmentId, uint256 amount);
    event PenaltyApplied(uint256 indexed shipmentId, uint256 amount);
    event PaymentReleased(uint256 indexed shipmentId, address to, uint256 amount);

    constructor(
        address _paymentToken,
        address _supplyChainManager
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid token address");
        require(_supplyChainManager != address(0), "Invalid manager address");
        paymentToken = IERC20(_paymentToken);
        supplyChainManager = _supplyChainManager;
    }

    modifier onlySupplyChainManager() {
        require(msg.sender == supplyChainManager, "Only SupplyChainManager");
        _;
    }

    function createPayment(
        uint256 shipmentId,
        uint256 amount
    ) external override onlySupplyChainManager {
        require(amount > 0, "Invalid amount");
        require(payments[shipmentId].amount == 0, "Payment exists");

        payments[shipmentId] = Payment({
            amount: amount,
            deadline: block.timestamp + PAYMENT_LOCK_PERIOD,
            isPaid: false,
            paidAt: 0
        });

        emit PaymentCreated(shipmentId, amount);
    }

    function processPayment(
        uint256 shipmentId
    ) external override onlySupplyChainManager nonReentrant {
        Payment storage payment = payments[shipmentId];
        require(!payment.isPaid, "Already paid");
        require(payment.amount > 0, "Payment not found");

        uint256 amountToTransfer = payment.amount;
        address supplier = msg.sender;

        // Check for penalties
        uint256 penalty = calculatePenalty(shipmentId);
        if (penalty > 0) {
            amountToTransfer = payment.amount - penalty;
            emit PenaltyApplied(shipmentId, penalty);
        }

        // Transfer payment
        require(
            paymentToken.transfer(supplier, amountToTransfer),
            "Transfer failed"
        );

        payment.isPaid = true;
        payment.paidAt = block.timestamp;

        emit PaymentProcessed(shipmentId, supplier, amountToTransfer);
    }

    function getPayment(
        uint256 shipmentId
    ) external view override returns (Payment memory) {
        return payments[shipmentId];
    }

    function calculatePenalty(
        uint256 shipmentId
    ) public view returns (uint256) {
        Payment storage payment = payments[shipmentId];
        if (block.timestamp <= payment.deadline) return 0;
        
        uint256 delay = block.timestamp - payment.deadline;
        uint256 penaltyPercentage = (delay * PENALTY_PERCENTAGE) / 1 days;
        if (penaltyPercentage > 100) penaltyPercentage = 100;
        
        return (payment.amount * penaltyPercentage) / 100;
    }

    function updateSupplyChainManager(
        address _newManager
    ) external onlyOwner {
        require(_newManager != address(0), "Invalid address");
        supplyChainManager = _newManager;
    }

    function withdrawStuckTokens(
        address token,
        uint256 amount
    ) external onlyOwner {
        require(
            IERC20(token).transfer(owner(), amount),
            "Transfer failed"
        );
    }

    function getPendingPayments(
        address /* supplier */
    ) external view returns (uint256[] memory) {
        uint256 count = 0;
        uint256[] memory shipmentIds = new uint256[](100); // Arbitrary limit

        for (uint256 i = 0; i < 100; i++) {
            if (!payments[i].isPaid && payments[i].amount > 0) {
                shipmentIds[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = shipmentIds[i];
        }

        return result;
    }

    function extendPaymentDeadline(
        uint256 shipmentId,
        uint256 extension
    ) external onlySupplyChainManager {
        require(extension <= 7 days, "Max extension is 7 days");
        require(!payments[shipmentId].isPaid, "Already paid");
        
        payments[shipmentId].deadline += extension;
    }
}