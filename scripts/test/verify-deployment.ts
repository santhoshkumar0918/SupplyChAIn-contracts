import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  console.log("Starting deployment verification...");

  // Contract addresses from deployment
  const ADDRESSES = {
    mockToken: "0x3a7daFbf66d7F7ea5DE65059E1DB5C848255A6c9",
    qualityControl: "0x325e878E623ef9C3C55795bA50733F918498761c",
    temperatureMonitor: "0xd04Cb51DBdEA269c0B6eB3250fDD5Aa2adC31F04",
    paymentHandler: "0x6cA11A73e8c93306E0dbaF5f1C62E0b62eEa278D",
    supplyChainManager: "0x4b63ec8dEDc5AE3EA8f99Cd29927f4Aa43e3E587",
  };

  try {
    const [signer] = await ethers.getSigners();

    // Get contract ABIs
    const MockTokenABI = await ethers.getContractFactory("MockToken");
    const QualityControlABI = await ethers.getContractFactory("QualityControl");
    const TemperatureMonitorABI = await ethers.getContractFactory(
      "TemperatureMonitor"
    );
    const PaymentHandlerABI = await ethers.getContractFactory("PaymentHandler");
    const SupplyChainManagerABI = await ethers.getContractFactory(
      "SupplyChainManager"
    );

    // Create contract instances with correct ABIs
    const mockToken = new Contract(
      ADDRESSES.mockToken,
      MockTokenABI.interface,
      signer
    );

    const qualityControl = new Contract(
      ADDRESSES.qualityControl,
      QualityControlABI.interface,
      signer
    );

    const temperatureMonitor = new Contract(
      ADDRESSES.temperatureMonitor,
      TemperatureMonitorABI.interface,
      signer
    );

    const paymentHandler = new Contract(
      ADDRESSES.paymentHandler,
      PaymentHandlerABI.interface,
      signer
    );

    const supplyChainManager = new Contract(
      ADDRESSES.supplyChainManager,
      SupplyChainManagerABI.interface,
      signer
    );

    // Test 1: Basic Contract Information
    console.log("\nTest 1: Contract Verification");
    try {
      // Verify SupplyChainManager
      const isActive = await supplyChainManager.getParticipant(signer.address);
      console.log("SupplyChainManager responding:", isActive !== undefined);
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error checking SupplyChainManager:", error.message);
      } else {
        console.log("Error checking SupplyChainManager:", error);
      }
    }

    // Test 2: Token Operations
    console.log("\nTest 2: Token Operations");
    try {
      const balance = await mockToken.balanceOf(signer.address);
      console.log("Token Balance:", ethers.formatEther(balance));
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error checking token balance:", error.message);
      } else {
        console.log("Error checking token balance:", error);
      }
    }

    // Test 3: Register as Participant
    console.log("\nTest 3: Participant Registration");
    try {
      const registerTx = await supplyChainManager.registerParticipant(0, {
        value: ethers.parseEther("1"), // Assuming 1 token stake required
      });
      await registerTx.wait();
      console.log("Registration transaction submitted");
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error in registration:", error.message);
      } else {
        console.log("Error in registration:", error);
      }
    }

    // Test 4: Create Shipment
    console.log("\nTest 4: Shipment Creation");
    try {
      const createShipmentTx = await supplyChainManager.createShipment(
        signer.address,
        ["Test Product"],
        ethers.parseEther("1"),
        Math.floor(Date.now() / 1000) + 86400,
        { gasLimit: 500000 }
      );
      await createShipmentTx.wait();
      console.log("Shipment created successfully");
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error creating shipment:", error.message);
      } else {
        console.log("Error creating shipment:", error);
      }
    }

    console.log("\nVerification process completed");
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
