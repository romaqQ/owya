const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy UserManager contract
  const UserManager = await ethers.getContractFactory("UserManager");
  const userManager = await UserManager.deploy();
  await userManager.waitForDeployment();
  console.log("UserManager deployed at:", userManager.target);

  // Deploy DCA contract

  UNISWAP_V3_ROUTER = process.env.UNISWAP_V3_ROUTER;
  console.log("UNIv3 address:", UNISWAP_V3_ROUTER);
  const DCA = await ethers.getContractFactory("DCA");
  const dca = await DCA.deploy(UNISWAP_V3_ROUTER, userManager.target);
  await dca.waitForDeployment();
  console.log("DCA deployed at:", dca.target);

  // Deploy ExecutorHandler contract
  const ExecutorDelegate = await ethers.getContractFactory("ExecutorDelegate");
  const executorDelegate = await ExecutorDelegate.deploy();
  await executorDelegate.waitForDeployment();
  console.log("ExecutorHandler deployed at:", executorDelegate.target);

  // Deploy DcaValidator contract
  const DcaValidator = await ethers.getContractFactory("DcaValidator");
  const dcaValidator = await DcaValidator.deploy(dca.target);
  await dcaValidator.waitForDeployment();
  console.log("DcaValidator deployed at:", dcaValidator.target);

  // check that executor within validator is set to executorHandler
  const executor = await dcaValidator.viewExecutor();
  // assert that the dca contract address is the same as the executor address in the validator
  console.log("DCA executor:", executor);
  console.log("ExecutorHandler address:", dca.target);
  if (executor != dca.target) {
    throw new Error("ExecutorHandler address not set in DcaValidator");
  }

  // Save all contract addresses to a file
  const contractAddresses = {
    UserManager: userManager.target,
    DCA: dca.target,
    ExecutorHandler: executorDelegate.target,
    DcaValidator: dcaValidator.target,
  };
  const filePath = path.join(__dirname, "..", "DCAcontractAddresses.json");
  fs.writeFileSync(filePath, JSON.stringify(contractAddresses, null, 2));
  console.log("Contract addresses saved to file:", filePath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
