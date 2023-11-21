const { ethers } = require("hardhat");
const { getContractInstance, getTokenAddress } = require("../utils/utils");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  // Deploy UserManager contract
  const userManager = await getContractInstance(
    "UserManager",
    process.env.USER_MANAGER_ADDRESS,
    deployer
  );

  const userManagerAddress = await userManager.getAddress();
  // Deploy UserManager contract
  const kernelFactory = await getContractInstance(
    "KernelFactory",
    process.env.KERNEL_FACTORY_ADDRESS,
    deployer,
    await deployer.getAddress(),
    process.env.ENTRY_POINT
  );
  const kernelFactoryAddress = await kernelFactory.getAddress();

  // Deploy ExecutorHandler contract
  const executorDelegate = await getContractInstance(
    "ExecutorDelegate",
    process.env.EXECUTOR_DELEGATE_CONTRACT_ADDRESS,
    deployer
  );
  const executorDelegateAddress = await executorDelegate.getAddress();

  console.log("All infrastructure contracts deployed:");
  console.log("UserManager", userManagerAddress);
  console.log("KernelFactory", kernelFactoryAddress);
  console.log("executorDelegate", executorDelegateAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
