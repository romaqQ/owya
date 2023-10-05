const hre = require("hardhat");

async function main() {
  // get the deployer signing key from the environment
  const [deployer, third_party] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Third party account:", third_party.address);

  // get uniswap router address
  UNISWAP_V3_ROUTER=process.env.UNISWAP_V3_ROUTER;

  // deploy the user manager
  const UserManager = await hre.ethers.getContractFactory("UserManager");
  const user_manager = await UserManager.connect(deployer).deploy();
  await user_manager.waitForDeployment();
  console.log("UserManager deployed to:", user_manager.target);

  // deploy the contracts
  const DCA = await hre.ethers.getContractFactory("DCA");
  console.log("UNIv3 address:", UNISWAP_V3_ROUTER);
  const dca = await DCA.connect(deployer).deploy(UNISWAP_V3_ROUTER, user_manager.target);
  await dca.waitForDeployment();
  console.log("DCA deployed to:", dca.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
