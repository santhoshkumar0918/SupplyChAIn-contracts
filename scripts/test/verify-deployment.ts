// scripts/test/verify-deployment.ts
import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  console.log("Starting deployment verification...");

  const ADDRESSES = {
    mockToken: "0x3a7daFbf66d7F7ea5DE65059E1DB5C848255A6c9",
    qualityControl: "0x325e878E623ef9C3C55795bA50733F918498761c",
    temperatureMonitor: "0xd04Cb51DBdEA269c0B6eB3250fDD5Aa2adC31F04",
    paymentHandler: "0x6cA11A73e8c93306E0dbaF5f1C62E0b62eEa278D",
    supplyChainManager: "0x4b63ec8dEDc5AE3EA8f99Cd29927f4Aa43e3E587",
  };

  try {
    const [signer] = await ethers.getSigners();
    console.log("Using account:", signer.address);

    // Get contract instances
    const MockTokenABI = await ethers.getContractFactory("MockToken");
    const SupplyChainManagerABI = await ethers.getContractFactory(
      "SupplyChainManager"
    );

    const mockToken = new Contract(
      ADDRESSES.mockToken,
      MockTokenABI.interface,
      signer
    );

    const supplyChainManager = new Contract(
      ADDRESSES.supplyChainManager,
      SupplyChainManagerABI.interface,
      signer
    );

    // Check Token Approval First
    console.log("\nTest 1: Token Approval");
    try {
      const approvalAmount = ethers.parseEther("1000"); // Approve 1000 tokens
      const approveTx = await mockToken.approve(
        ADDRESSES.supplyChainManager,
        approvalAmount
      );
      await approveTx.wait();
      console.log("Token approval successful");

      const allowance = await mockToken.allowance(
        signer.address,
        ADDRESSES.supplyChainManager
      );
      console.log("Allowance:", ethers.formatEther(allowance));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error in token approval:", error.message);
      } else {
        console.error("Error in token approval:", error);
      }
    }

    // Check if already registered
    console.log("\nTest 2: Check Registration Status");
    try {
      const participant = await supplyChainManager.getParticipant(
        signer.address
      );
      console.log("Current participant status:", participant);
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error checking participant status:", error.message);
      } else {
        console.log("Error checking participant status:", error);
      }
    }

    // Register as Participant
    console.log("\nTest 3: Participant Registration");
    try {
      // Register as supplier (role 0) with minimum stake
      const minStake = ethers.parseEther("1"); // 1 token stake
      const registerTx = await supplyChainManager.registerParticipant(0, {
        value: minStake,
        gasLimit: 500000,
      });
      const receipt = await registerTx.wait();
      console.log("Registration transaction hash:", receipt.hash);
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error in registration:", error.message);
      } else {
        console.log("Error in registration:", error);
      }
    }

    // Try creating a shipment
    console.log("\nTest 4: Create Shipment");
    try {
      const price = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours

      // First approve tokens for payment
      const approveTx = await mockToken.approve(
        ADDRESSES.supplyChainManager,
        price
      );
      await approveTx.wait();
      console.log("Payment approval successful");

      const createShipmentTx = await supplyChainManager.createShipment(
        signer.address, // receiver
        ["Test Product"], // products
        price, // payment amount
        deadline, // deadline
        {
          gasLimit: 500000,
        }
      );
      const receipt = await createShipmentTx.wait();
      console.log("Shipment created successfully. TX:", receipt.hash);
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error creating shipment:", error.message);
      } else {
        console.log("Error creating shipment:", error);
      }
    }
  } catch (error) {
    console.error("Error during verification:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
