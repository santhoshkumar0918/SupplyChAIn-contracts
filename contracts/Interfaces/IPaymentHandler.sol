// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPaymentHandler {
    struct Payment {
        uint256 amount;
        uint256 deadline;
        bool isPaid;
        uint256 paidAt;
    }

    event PaymentCreated(uint256 indexed shipmentId, uint256 amount);
    event PaymentProcessed(uint256 indexed shipmentId, address to, uint256 amount);
    event PaymentFailed(uint256 indexed shipmentId, string reason);

    function createPayment(uint256 shipmentId, uint256 amount) external;
    function processPayment(uint256 shipmentId) external;
    function getPayment(uint256 shipmentId) external view returns (Payment memory);
}