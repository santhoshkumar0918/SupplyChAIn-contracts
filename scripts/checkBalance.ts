import { ethers } from "hardhat";

async function main() {
  // Get the account address you're using for deployment
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();

  // Get the balance
  const balance = await ethers.provider.getBalance(address);

  // Convert balance from wei to RON (or the native token)
  const balanceInRON = ethers.formatEther(balance);

  console.log(`Address: ${address}`);
  console.log(`Balance: ${balanceInRON} RON`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
