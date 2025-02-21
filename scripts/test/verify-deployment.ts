import { ethers } from "hardhat";

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
    // Get contract factories
    const MockToken = await ethers.getContractFactory("MockToken");
    const QualityControl = await ethers.getContractFactory("QualityControl");
    const TemperatureMonitor = await ethers.getContractFactory(
      "TemperatureMonitor"
    );
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
    const SupplyChainManager = await ethers.getContractFactory(
      "SupplyChainManager"
    );

    // Get contract instances
    const mockToken = MockToken.attach(ADDRESSES.mockToken);
    const qualityControl = QualityControl.attach(ADDRESSES.qualityControl);
    const temperatureMonitor = TemperatureMonitor.attach(
      ADDRESSES.temperatureMonitor
    );
    const paymentHandler = PaymentHandler.attach(ADDRESSES.paymentHandler);
    const supplyChainManager = SupplyChainManager.attach(
      ADDRESSES.supplyChainManager
    );

    // Test 1: Basic Contract Interaction
    console.log("\nTest 1: Basic Contract Interaction");
    const tokenName = await mockToken.name();
    const tokenSymbol = await mockToken.symbol();
    console.log(`Token Name: ${tokenName}`);
    console.log(`Token Symbol: ${tokenSymbol}`);

    // Test 2: Register a Participant
    console.log("\nTest 2: Register Participant");
    const [signer] = await ethers.getSigners();

    // Approve tokens first
    const approvalTx = await mockToken.approve(
      ADDRESSES.supplyChainManager,
      ethers.parseEther("100")
    );
    await approvalTx.wait();
    console.log("Token approval successful");

    // Register as supplier (role 0)
    const registerTx = await supplyChainManager.registerParticipant(0);
    await registerTx.wait();
    console.log("Participant registration successful");

    // Test 3: Create a Shipment
    console.log("\nTest 3: Create Shipment");
    const products = ["Strawberries", "Lettuce"];
    const createShipmentTx = await supplyChainManager.createShipment(
      signer.address, // receiver (self for testing)
      products,
      ethers.parseEther("10"), // price
      Math.floor(Date.now() / 1000) + 86400 // 24 hours deadline
    );
    const receipt = await createShipmentTx.wait();
    console.log("Shipment created successfully");

    // Test 4: Temperature Monitoring
    console.log("\nTest 4: Temperature Monitoring");
    const monitorTx = await temperatureMonitor.recordTemperature(
      0, // first shipment
      5 // temperature in Celsius
    );
    await monitorTx.wait();
    console.log("Temperature recorded successfully");

    // Test 5: Quality Control
    console.log("\nTest 5: Quality Control");
    const qualityTx = await qualityControl.performQualityCheck(
      0, // first shipment
      90, // quality score
      "Good condition"
    );
    await qualityTx.wait();
    console.log("Quality check performed successfully");

    console.log("\nAll tests completed successfully!");
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
