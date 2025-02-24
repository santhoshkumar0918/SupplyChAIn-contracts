// scripts/deploy.ts
import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import path from "path";

const mockBerryBatches = [
  {
    berryType: "Strawberry",
    qualityScore: 95,
    temperature: 2,
    location: "Warehouse A",
  },
  {
    berryType: "Blueberry",
    qualityScore: 88,
    temperature: 3,
    location: "Refrigerated Truck",
  },
];

const mockSuppliers = [
  {
    name: "SunnyHill Farms",
    initialReputation: 85,
  },
  {
    name: "Mountain Valley Berries",
    initialReputation: 92,
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const BerryTempAgent = await ethers.getContractFactory("BerryTempAgent");
  const berryTempAgent = await BerryTempAgent.deploy();
  await berryTempAgent.waitForDeployment();
  const berryTempAgentAddress = await berryTempAgent.getAddress();

  const BerryManager = await ethers.getContractFactory("BerryManager");
  const berryManager = await BerryManager.deploy(berryTempAgentAddress);
  await berryManager.waitForDeployment();
  const berryManagerAddress = await berryManager.getAddress();

  console.log("BerryTempAgent deployed to:", berryTempAgentAddress);
  console.log("BerryManager deployed to:", berryManagerAddress);

  for (const batchData of mockBerryBatches) {
    const batchTx = await berryTempAgent.createBatch(batchData.berryType);
    await batchTx.wait();

    const batchId = (await berryTempAgent.batchCount()) - BigInt(1);

    await berryTempAgent.recordTemperature(
      batchId,
      batchData.temperature,
      batchData.location
    );
  }

  for (const supplierData of mockSuppliers) {
    const supplierSigner = await ethers.getImpersonatedSigner(deployer.address);
    await berryManager.connect(supplierSigner).registerSupplier();
  }

  const contractAddresses = {
    BerryTempAgent: berryTempAgentAddress,
    BerryManager: berryManagerAddress,
  };

  const addressesPath = path.join(
    __dirname,
    "../cache/contract-addresses.json"
  );
  writeFileSync(addressesPath, JSON.stringify(contractAddresses, null, 2));

  console.log("Mock data and contracts deployed successfully!");
}

// Error handling for deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  });
