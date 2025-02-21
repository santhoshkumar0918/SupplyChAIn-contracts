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

    // Check Token Balance First
    console.log("\nChecking Token Balance");
    const balance = await mockToken.balanceOf(signer.address);
    console.log("Token Balance:", ethers.formatEther(balance));

    // Check and Set Token Approval
    console.log("\nTest 1: Token Approval");
    try {
      const MIN_STAKE = ethers.parseEther("100"); // Changed to match contract's MIN_STAKE
      const approveTx = await mockToken.approve(
        ADDRESSES.supplyChainManager,
        MIN_STAKE
      );
      await approveTx.wait();
      console.log("Token approval successful");

      const allowance = await mockToken.allowance(
        signer.address,
        ADDRESSES.supplyChainManager
      );
      console.log("Allowance:", ethers.formatEther(allowance));
    } catch (error) {
      console.error("Error in token approval:", error);
    }

    // Check if already registered
    console.log("\nTest 2: Check Registration Status");
    try {
      const participant = await supplyChainManager.getParticipant(
        signer.address
      );
      console.log("Current participant status:", {
        account: participant.account,
        role: participant.role,
        isActive: participant.isActive,
        reputationScore: participant.reputationScore,
      });
    } catch (error) {
      console.log("Error checking participant status:", error);
    }

    // Register as Participant
    console.log("\nTest 3: Participant Registration");
    try {
      // Register as supplier (role 0) - removed value parameter as it's not needed
      const registerTx = await supplyChainManager.registerParticipant(0, {
        gasLimit: 500000,
      });
      const receipt = await registerTx.wait();
      console.log("Registration successful! Transaction hash:", receipt.hash);

      // Verify registration
      const participantAfter = await supplyChainManager.getParticipant(
        signer.address
      );
      console.log("Updated participant status:", {
        account: participantAfter.account,
        role: participantAfter.role,
        isActive: participantAfter.isActive,
        reputationScore: participantAfter.reputationScore,
      });
    } catch (error) {
      console.log("Error in registration:", error);
    }

    // Try creating a shipment
    console.log("\nTest 4: Create Shipment");
    try {
      // Create a different receiver address
      const receiverAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example address

      const price = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

      // Approve tokens for payment
      const approveTx = await mockToken.approve(
        ADDRESSES.paymentHandler, // Changed to paymentHandler address
        price
      );
      await approveTx.wait();
      console.log("Payment approval successful");

      const createShipmentTx = await supplyChainManager.createShipment(
        receiverAddress, // Changed from self to different receiver
        ["Test Product"],
        price,
        deadline,
        {
          gasLimit: 500000,
        }
      );
      const receipt = await createShipmentTx.wait();
      console.log("Shipment created successfully. TX:", receipt.hash);
    } catch (error) {
      console.log("Error creating shipment:", error);
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
