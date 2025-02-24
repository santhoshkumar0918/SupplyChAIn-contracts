// scripts/deploy/deploy.ts
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

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy BerryTempAgent
  const BerryTempAgent = await ethers.getContractFactory("BerryTempAgent");
  const berryTempAgent = await BerryTempAgent.deploy();
  await berryTempAgent.waitForDeployment();
  const berryTempAgentAddress = await berryTempAgent.getAddress();

  // Deploy BerryManager
  const BerryManager = await ethers.getContractFactory("BerryManager");
  const berryManager = await BerryManager.deploy(berryTempAgentAddress);
  await berryManager.waitForDeployment();
  const berryManagerAddress = await berryManager.getAddress();

  console.log("BerryTempAgent deployed to:", berryTempAgentAddress);
  console.log("BerryManager deployed to:", berryManagerAddress);

  console.log("\nCreating mock berry batches...");
  // Create mock berry batches
  for (const batchData of mockBerryBatches) {
    try {
      const batchTx = await berryTempAgent.createBatch(batchData.berryType);
      await batchTx.wait();

      const batchId = (await berryTempAgent.batchCount()) - BigInt(1);
      console.log(`Created batch ${batchId}: ${batchData.berryType}`);

      // Record temperature
      const tempTx = await berryTempAgent.recordTemperature(
        batchId,
        batchData.temperature,
        batchData.location
      );
      await tempTx.wait();
      console.log(
        `Recorded temperature: ${batchData.temperature}°C at ${batchData.location}`
      );
    } catch (error) {
      console.error(
        `Error creating batch for ${batchData.berryType}:`,
        (error as any).message
      );
    }
  }

  console.log("\nRegistering as supplier...");
  // Register deployer as supplier
  try {
    // No need to impersonate, just use deployer
    const registerTx = await berryManager.registerSupplier();
    await registerTx.wait();
    console.log("Registered as supplier successfully");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error registering supplier:", error.message);
    } else {
      console.error("Error registering supplier:", error);
    }
  }

  // Save contract addresses
  const contractAddresses = {
    BerryTempAgent: berryTempAgentAddress,
    BerryManager: berryManagerAddress,
  };

  try {
    // Use process.cwd() for more reliable path
    const addressesPath = path.join(process.cwd(), "contract-addresses.json");
    writeFileSync(addressesPath, JSON.stringify(contractAddresses, null, 2));
    console.log(`Contract addresses saved to ${addressesPath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error saving addresses:", error.message);
    } else {
      console.error("Error saving addresses:", error);
    }
    // Still log the addresses to console as fallback
    console.log("Contract addresses:", contractAddresses);
  }

  console.log("\nDeployment completed successfully!");
}

// Error handling for deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  });
