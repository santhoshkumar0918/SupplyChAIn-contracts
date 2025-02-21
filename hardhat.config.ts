// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    sonic: {
      url: "https://rpc.blaze.soniclabs.com",
      chainId: 57054, // Updated chain ID for Sonic
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      timeout: 60000, // 60 seconds
      gas: 3000000,
    },
  },
};

export default config;
