const { ethers } = require("hardhat");
const userop = require("userop");
const fs = require("fs");
const { getContractInstance } = require("../utils/utils");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the DCA Trigger contract
  const dcaTrigger = await getContractInstance(
    "DcaTrigger",
    process.env.DCA_TRIGGER_CONTRACT_ADDRESS,
    deployer,
    process.env.EXECUTOR_DELEGATE_CONTRACT_ADDRESS,
    process.env.USER_MANAGER_ADDRESS
  );

  // withdraw funds from dcaTrigger account
  const withdrawTx = await dcaTrigger.withdraw();
  await withdrawTx.wait();
  console.log("DCA Trigger funds withdrawn");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
