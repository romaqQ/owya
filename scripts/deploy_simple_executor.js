// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const COUNTER_ADDRESS = "0x13c00BFdE798330989A9474a8bAa0b9d7c4aD3eE";
  const executor = await hre.ethers.deployContract("SimpleExecutor", [
    COUNTER_ADDRESS,
  ]);

  await executor.waitForDeployment();

  console.log(`SimpleExecutor deployed to ${executor.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
