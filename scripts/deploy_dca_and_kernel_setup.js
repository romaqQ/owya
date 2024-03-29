const { ethers } = require("hardhat");
const userop = require("userop");
const {
  getContractInstance,
  getTokenAddress,
  writeAddressesToFile,
} = require("../utils/utils");
// TODO: import ContractManager from utils/contract_utils.js
// TODO: use ContractManager
// TODO: use getTokenAddress from utils/utils.js

const { ContractManager } = require("../utils/contract_utils");

async function main() {
  const [deployer, thirdParty, kernelOwner] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const wethAddress = getTokenAddress("weth");
  UNISWAP_V3_ROUTER = process.env.UNISWAP_V3_ROUTER;

  // Usage
  const contractDeployer = new ContractManager(
    deployer,
    UNISWAP_V3_ROUTER,
    wethAddress
  );
  const userManager = await contractDeployer.connectUserManager();
  const dca = await contractDeployer.connectDCA();
  const executorDelegate = await contractDeployer.connectExecutorHandler();
  const universalValidator = await contractDeployer.connectValidator();

  const userManagerAddress = await userManager.getAddress();

  // Check if deployer can subscribe to userManager
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance:", deployerBalance.toString());

  // Check if DCA contract is active in UserManager
  const stratNode = await userManager.strategyNodes(dca.target);
  const isDcaActive = stratNode.isActive;
  console.log("DCA contract active in UserManager:", isDcaActive);

  if (!isDcaActive) {
    console.log("Activating dca contract in UserManager:");
    // Activate DCA contract in UserManager
    const dcaActivationTx = await userManager.createStrategyNode(
      dca.target, // strategyNode
      deployer.address, // provider
      true, // isActive
      true, // isOnline
      false //needsApproval
    );
    await dcaActivationTx.wait();
    console.log("DCA contract activated in UserManager");
  } else {
    console.log("DCA contract already active in UserManager");
  }

  // Deploy DCA contract
  console.log("UNIv3 address:", UNISWAP_V3_ROUTER);

  // Kernel Owner Account
  console.log("Kernel Owner Account:", kernelOwner.address);

  // Check kernelOwner balance
  const kernelOwnerBalance = await kernelOwner.provider.getBalance(
    kernelOwner.address
  );
  console.log("kernelOwner balance:", kernelOwnerBalance.toString());

  const kernel = await userop.Presets.Builder.Kernel.init(
    kernelOwner,
    process.env.GOERLI_RPC_URL
  );

  const client = await userop.Client.init(process.env.GOERLI_RPC_URL);

  const kernelAddress = kernel.getSender();
  console.log(`Kernel address: ${kernelAddress}`);

  // Send Ether to kernel contract
  // const tx = await kernelOwner.sendTransaction({
  //   to: kernelAddress,
  //   value: ethers.parseEther("0.005"),
  // });
  // await tx.wait();
  // console.log("Ether sent to kernel contract");

  // If Kernel is not yet deployed, deploy it
  const KERNEL_ADDRESS = process.env.KERNEL_ADDRESS;
  if (!KERNEL_ADDRESS) {
    const res = await client.sendUserOperation(
      kernel.execute({
        to: kernelOwner.address,
        value: 0,
        data: "0x",
      })
    );
    console.log("Waiting for transaction...");
    const ev = await res.wait();
    console.log(`Transaction hash: ${ev?.transactionHash ?? null}`);
  }

  // Check if kernel is subscribed to UserManager
  const isSubscribedKernel = await userManager.isUserSubscribed(
    kernelAddress,
    dca.target
  );

  if (isSubscribedKernel) {
    console.log(
      "Kernel is already subscribed to UserManager:",
      isSubscribedKernel
    );
  } else {
    // From kernel contract execute subscribe function on UserManager contract
    const uniAddress = getTokenAddress("uni");
    const kernelSubTx = await client.sendUserOperation(
      kernel.execute({
        to: userManagerAddress, // to
        value: 0, // value
        data: userManager.interface.encodeFunctionData("subscribe", [
          dca.target, // strategyNode
          [uniAddress, uniAddress], // assets
          [7500, 2500], // weights
          ethers.ZeroAddress, // baseAsset as ETH
          ethers.parseEther("0.001"),
          true, // isGuidelineCheckRequired
        ]), // data
        operation: 0, // operation Operation.Call
      })
    );

    await kernelSubTx.wait();
    console.log("Kernel subscribed to UserManager");

    // Check if kernel is subscribed to UserManager
    const isSubscribed = await userManager.isUserSubscribed(
      kernelAddress,
      dca.target
    );
    console.log("Kernel subscribed to UserManager:", isSubscribed);
  }

  // View user allocation
  const userAllocation = await userManager.viewUserAllocation(
    kernelAddress,
    dca.target
  );
  console.log("User allocation:", userAllocation);

  // View user subscription
  const userSubscriptionAmount = await userManager.userSubscriptionAmount(
    kernelAddress,
    dca.target
  );
  console.log(
    "User subscription: %s Ether",
    ethers.formatUnits(userSubscriptionAmount, 18).toString()
  );

  // write all contract addresses to file
  const addresses = {
    UserManager: userManager.target,
    DCA: dca.target,
    ExecutorHandler: executorDelegate.target,
    universalValidator: universalValidator.target,
    Kernel: kernelAddress,
  };

  console.log("Addresses:", addresses);
  await writeAddressesToFile(addresses);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
