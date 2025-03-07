// scripts/deploy/deploy.ts
import { ethers } from "hardhat";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { BerryTempAgent, BerryManager } from "../../typechain-types"; // Import both types

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
  {
    berryType: "Raspberry",
    qualityScore: 90,
    temperature: 2,
    location: "Processing Center",
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy BerryTempAgent
  const BerryTempAgentFactory = await ethers.getContractFactory(
    "BerryTempAgent"
  );
  const berryTempAgent = await BerryTempAgentFactory.deploy();
  await berryTempAgent.waitForDeployment();
  const berryTempAgentAddress = await berryTempAgent.getAddress();

  // Deploy BerryManager
  const BerryManagerFactory = await ethers.getContractFactory("BerryManager");
  const berryManager = await BerryManagerFactory.deploy(berryTempAgentAddress);
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

      // Record temperature with increased gas limit
      const tempTx = await berryTempAgent.recordTemperature(
        batchId,
        batchData.temperature,
        batchData.location,
        {
          gasLimit: 450000, // Increased gas limit for recordTemperature
        }
      );
      await tempTx.wait();
      console.log(
        `Recorded temperature: ${batchData.temperature}°C at ${batchData.location}`
      );

      // Add a second temperature reading for test purposes
      const tempTx2 = await berryTempAgent.recordTemperature(
        batchId,
        batchData.temperature + 1, // Slightly different temperature
        batchData.location + " - Update",
        {
          gasLimit: 450000,
        }
      );
      await tempTx2.wait();
      console.log(
        `Recorded additional temperature: ${batchData.temperature + 1}°C at ${
          batchData.location
        } - Update`
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

  // Process agent recommendations for each batch
  console.log("\nProcessing agent recommendations...");
  try {
    const batchCount = await berryTempAgent.batchCount();
    for (let i = 0; i < Number(batchCount); i++) {
      try {
        // Get predictions first to check if they exist
        const predictions = await berryTempAgent.getAgentPredictions(i);

        // Only attempt to process if there are predictions
        if (predictions && predictions.length > 0) {
          const processTx = await berryManager.processAgentRecommendation(i);
          await processTx.wait();
          console.log(`Processed recommendations for batch ${i}`);
        } else {
          console.log(`No predictions available for batch ${i}, skipping`);
        }
      } catch (error) {
        console.error(
          `Error processing recommendations for batch ${i}:`,
          (error as any).message
        );
      }
    }
  } catch (error) {
    console.error(
      "Error in recommendation processing:",
      (error as any).message
    );
  }

  // Complete a shipment for demonstration
  console.log("\nShipment completion:");
  console.log(
    "Shipment completion is now handled through the frontend interface."
  );
  console.log("During deployment, we'll skip the automatic completion step.");

  try {
    // Get batch details to verify batch was created
    const batchDetails = await berryTempAgent.getBatchDetails(0);
    console.log(`Batch 0 status: ${batchDetails.status}`);
    console.log(`Batch 0 isActive: ${batchDetails.isActive}`);
  } catch (error) {
    console.error("Error getting batch details:", (error as any).message);
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
    const berryTempAgentAbi = BerryTempAgentFactory.interface.formatJson();
    const berryManagerAbi = BerryManagerFactory.interface.formatJson();

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
