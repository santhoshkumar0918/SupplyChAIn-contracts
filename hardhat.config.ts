import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sonic: {
      url: "https://rpc.soniclabs.com",
      accounts: [
        "47a5059a10528e00cd4355e50c637e7a53f2eba1c2cd9a7491db8a21c34639a3",
      ],
    },
  },
};

export default config;
