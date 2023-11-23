const { ethers } = require("hardhat");
const userop = require("userop");
const fs = require("fs");
const { getTokenAddress, buildUserOperation } = require("../utils/utils");
const { ContractManager } = require("../utils/contract_utils");

async function main() {
  const [deployer, thirdParty, kernelOwner] = await ethers.getSigners();

  const kernel = await userop.Presets.Builder.Kernel.init(
    kernelOwner,
    process.env.GOERLI_RPC_URL
  );
  const client = await userop.Client.init(process.env.GOERLI_RPC_URL);

  const kernelAddress = kernel.getSender();
  console.log(`Kernel address: ${kernelAddress}`);

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

  // Check if kernel is subscribed to UserManager
  const isSubscribedKernel = await userManager.isUserSubscribed(
    kernelAddress,
    dca.target
  );

  // Query the User subscription Amount
  const userSubscriptionAmount = BigInt(
    await userManager.userSubscriptionAmount(kernelAddress, dca.target)
  );
  console.log(
    "User subscription: %s Ether",
    ethers.formatUnits(userSubscriptionAmount, 18).toString()
  );

  // get function selection from executorDelegate contract
  // get interface from executorDelegate contract
  const executorDelegate = await ethers.getContractFactory("ExecutorDelegate");
  const selector =
    executorDelegate.interface.getFunction("delegateExecute").selector;
  console.log("Function selector:", selector);

  // Send Ether to kernel contract
  // const tx = await kernelOwner.sendTransaction({
  //   to: kernelAddress,
  //   value: ethers.parseEther("0.02"),
  // });
  // await tx.wait();
  // console.log("Ether sent to kernel contract");

  console.log("Kernel is subscribed to UserManager:", isSubscribedKernel);
  if (!isSubscribedKernel) {
    console.log(
      "Kernel is not yet subscribed - First subscribe to the UserManager (use enable_dca_plugin_userop.js"
    );
    process.exit(1);
  }

  // View user allocation
  const [userAssets, userWeights] = await userManager.viewUserAllocation(
    kernelAddress,
    dca.target
  );
  console.log(
    "User %s allocation: %s %s",
    kernelAddress,
    userAssets,
    userWeights
  );
  // create asset and weight arrays
  let assets = [];
  let weights = [];

  for (let i = 0; i < userAssets.length; i++) {
    const asset = userAssets[i];
    const weight = userWeights[i];
    console.log(`Asset: ${asset}, Weight: ${weight}`);
    assets.push(asset);
    weights.push(weight);
  }

  // multiply the weights times the userSubscriptionAmount to get the amount of each asset to swap
  const bps = BigInt(10000);
  let amounts = [];
  for (let i = 0; i < weights.length; i++) {
    const amount = (BigInt(weights[i]) * userSubscriptionAmount) / bps;
    amounts.push(amount);
  }

  // Executor DCA contract address
  const dcaAddress = process.env.DCA_CONTRACT_ADDRESS;
  console.log("Amounts", amounts);
  // create the swap data
  const builder = await buildUserOperation(
    kernelAddress,
    executorDelegate.interface,
    "delegateExecute",
    [dcaAddress, userSubscriptionAmount, amounts],
    deployer
  );
  // console.log(builder);
  const res = await client.sendUserOperation(builder);
  console.log(`UserOpHash: ${res.userOpHash}`);
  const ev = await res.wait();
  console.log(`Transaction hash: ${ev?.transactionHash ?? null}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
