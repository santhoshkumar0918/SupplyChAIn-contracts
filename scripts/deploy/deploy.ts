import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  try {
    // Deploy Mock Token
    console.log("Deploying MockToken...");
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();
    const mockTokenAddress = await mockToken.getAddress();
    console.log("MockToken deployed to:", mockTokenAddress);

    // Deploy QualityControl
    console.log("Deploying QualityControl...");
    const QualityControl = await ethers.getContractFactory("QualityControl");
    const qualityControl = await QualityControl.deploy();
    await qualityControl.waitForDeployment();
    const qualityControlAddress = await qualityControl.getAddress();
    console.log("QualityControl deployed to:", qualityControlAddress);

    // Deploy TemperatureMonitor
    console.log("Deploying TemperatureMonitor...");
    const TemperatureMonitor = await ethers.getContractFactory(
      "TemperatureMonitor"
    );
    const temperatureMonitor = await TemperatureMonitor.deploy();
    await temperatureMonitor.waitForDeployment();
    const temperatureMonitorAddress = await temperatureMonitor.getAddress();
    console.log("TemperatureMonitor deployed to:", temperatureMonitorAddress);

    // Deploy PaymentHandler
    console.log("Deploying PaymentHandler...");
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
    // Deploy with a temporary manager address (will update later)
    const paymentHandler = await PaymentHandler.deploy(
      mockTokenAddress,
      deployer.address // temporary supply chain manager address
    );
    await paymentHandler.waitForDeployment();
    const paymentHandlerAddress = await paymentHandler.getAddress();
    console.log("PaymentHandler deployed to:", paymentHandlerAddress);

    // Deploy SupplyChainManager
    console.log("Deploying SupplyChainManager...");
    const SupplyChainManager = await ethers.getContractFactory(
      "SupplyChainManager"
    );
    const supplyChainManager = await SupplyChainManager.deploy(
      mockTokenAddress,
      qualityControlAddress,
      temperatureMonitorAddress,
      paymentHandlerAddress
    );
    await supplyChainManager.waitForDeployment();
    const supplyChainManagerAddress = await supplyChainManager.getAddress();
    console.log("SupplyChainManager deployed to:", supplyChainManagerAddress);

    // Update PaymentHandler with correct SupplyChainManager address
    console.log("Updating PaymentHandler with SupplyChainManager address...");
    const updateTx = await paymentHandler.updateSupplyChainManager(
      supplyChainManagerAddress
    );
    await updateTx.wait();
    console.log("PaymentHandler updated successfully");

    // Log all deployed addresses
    console.log("\nDeployed Contracts:");
    console.log("==================");
    console.log("MockToken:", mockTokenAddress);
    console.log("QualityControl:", qualityControlAddress);
    console.log("TemperatureMonitor:", temperatureMonitorAddress);
    console.log("PaymentHandler:", paymentHandlerAddress);
    console.log("SupplyChainManager:", supplyChainManagerAddress);
  } catch (error) {
    console.error("Error during deployment:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
