const { ethers } = require("hardhat");
const { getContractInstance, getTokenAddress } = require("../utils/utils");
const { ContractManager } = require("../utils/contract_utils");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  // Deploy UserManager contract
  const wethAddress = getTokenAddress("weth");
  UNISWAP_V3_ROUTER = process.env.UNISWAP_V3_ROUTER;

  // Usage
  const contractDeployer = new ContractManager(
    deployer,
    UNISWAP_V3_ROUTER,
    wethAddress
  );
  const userManager = await contractDeployer.connectUserManager();
  const executorDelegate = await contractDeployer.connectExecutorHandler();
  const universalValidator = await contractDeployer.connectValidator();
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
  const executorDelegateAddress = await executorDelegate.getAddress();

  console.log("All infrastructure contracts deployed:");
  console.log("UserManager ", userManagerAddress);
  console.log("KernelFactory ", kernelFactoryAddress);
  console.log("executorDelegate ", executorDelegateAddress);
  console.log("Validator ", universalValidator.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
