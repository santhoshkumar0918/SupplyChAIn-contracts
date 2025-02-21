import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28", // This version is correct for OpenZeppelin 5.2.0
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Add evmVersion for Sonic compatibility
      evmVersion: "paris",
    },
  },
  networks: {
    sonic: {
      url: process.env.SONIC_RPC_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      // Add Sonic specific settings
      timeout: 20000, // Timeout for transactions
      gasPrice: "auto", // Let Sonic determine gas price
    },
    // Add localhost for testing
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      // Add hardhat network settings for testing
      mining: {
        auto: true,
        interval: 0,
      },
    },
  },
  // Add useful plugins configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000, // 40 seconds max for running tests
  },
};

export default config;
