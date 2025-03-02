// scripts/deploy/deploy.ts
import { ethers } from "hardhat";
import { writeFileSync, mkdirSync, existsSync } from "fs";
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

    // Extract and save ABIs
    // Fixed: Use getAbi() or similar method based on the Hardhat/ethers version
    const berryTempAgentAbi = BerryTempAgent.interface.formatJson();
    const berryManagerAbi = BerryManager.interface.formatJson();

    // Alternative approach if formatJson() is not available:
    // const berryTempAgentAbi = JSON.parse(JSON.stringify(BerryTempAgent.interface.fragments));
    // const berryManagerAbi = JSON.parse(JSON.stringify(BerryManager.interface.fragments));

    // Save individual ABI files
    const abiDir = path.join(process.cwd(), "abis");

    // Create abis directory if it doesn't exist
    if (!existsSync(abiDir)) {
      mkdirSync(abiDir, { recursive: true });
    }

    // Write individual ABI files
    const tempAgentAbiPath = path.join(abiDir, "BerryTempAgent.json");
    const managerAbiPath = path.join(abiDir, "BerryManager.json");

    writeFileSync(tempAgentAbiPath, berryTempAgentAbi);
    writeFileSync(managerAbiPath, berryManagerAbi);

    console.log(`BerryTempAgent ABI saved to ${tempAgentAbiPath}`);
    console.log(`BerryManager ABI saved to ${managerAbiPath}`);

    // Also save combined ABIs
    const combinedAbisPath = path.join(process.cwd(), "contract-abis.json");
    writeFileSync(
      combinedAbisPath,
      JSON.stringify(
        {
          BerryTempAgent: JSON.parse(berryTempAgentAbi),
          BerryManager: JSON.parse(berryManagerAbi),
        },
        null,
        2
      )
    );
    console.log(`Combined contract ABIs saved to ${combinedAbisPath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error saving addresses or ABIs:", error.message);
    } else {
      console.error("Error saving addresses or ABIs:", error);
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
