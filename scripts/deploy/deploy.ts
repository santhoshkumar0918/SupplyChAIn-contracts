import { ethers } from "hardhat";

async function main() {
  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy();
  await mockToken.deployed();
  console.log("MockToken deployed to:", mockToken.address);

  const QualityControl = await ethers.getContractFactory("QualityControl");
  const qualityControl = await QualityControl.deploy();
  await qualityControl.deployed();
  console.log("QualityControl deployed to:", qualityControl.address);

  const TemperatureMonitor = await ethers.getContractFactory(
    "TemperatureMonitor"
  );
  const temperatureMonitor = await TemperatureMonitor.deploy();
  await temperatureMonitor.deployed();
  console.log("TemperatureMonitor deployed to:", temperatureMonitor.address);

  const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
  const paymentHandler = await PaymentHandler.deploy(
    mockToken.address,
    "SUPPLY_CHAIN_MANAGER_ADDRESS_PLACEHOLDER"
  );
  await paymentHandler.deployed();
  console.log("PaymentHandler deployed to:", paymentHandler.address);

  // Deploy SupplyChainManager
  const SupplyChainManager = await ethers.getContractFactory(
    "SupplyChainManager"
  );
  const supplyChainManager = await SupplyChainManager.deploy(
    mockToken.address, // or real token address for mainnet
    qualityControl.address,
    temperatureMonitor.address,
    paymentHandler.address
  );
  await supplyChainManager.deployed();
  console.log("SupplyChainManager deployed to:", supplyChainManager.address);

  // Update PaymentHandler with SupplyChainManager address
  await paymentHandler.updateSupplyChainManager(supplyChainManager.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
