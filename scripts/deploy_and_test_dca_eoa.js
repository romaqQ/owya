const { ethers } = require("hardhat");
const userop = require("userop");
const fs = require("fs");
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

  // Deploy ExecutorHandler contract
  const executorDelegate = await getContractInstance(
    "ExecutorDelegate",
    process.env.EXECUTOR_DELEGATE_CONTRACT_ADDRESS,
    deployer
  );

  // Deploy the DCA Trigger contract
  const dcaTrigger = await getContractInstance(
    "DcaTrigger",
    process.env.DCA_TRIGGER_CONTRACT_ADDRESS,
    deployer,
    executorDelegate.target,
    userManagerAddress
  );

  // Check if deployer can subscribe to userManager
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  console.log(
    "Deployer balance Ether",
    ethers.formatUnits(deployerBalance, 18).toString()
  );

  // send some ether to the dcaTrigger contract
  const tx = await deployer.sendTransaction({
    to: dcaTrigger.target,
    value: ethers.parseEther("0.01"),
  });
  await tx.wait();
  console.log("Ether sent to dcaTrigger contract");

  // Check if deployer is subscribed to userManager
  const isSubscribed1 = await userManager.isUserSubscribed(dcaTrigger.target);
  if (isSubscribed1) {
    console.log(
      "DcaTrigger is already subscribed to UserManager:",
      isSubscribed1
    );
  } else {
    // call the subscribe function on the userManager contract from the dcaTrigger contract
    console.log("Subscribing DcaTrigger to UserManager...");
    const uniAddress = getTokenAddress("uni");
    console.log("UNI address:", uniAddress);
    const subscribeTx = await dcaTrigger.subscribe(
      [uniAddress, uniAddress],
      [7500, 2500],
      ethers.parseEther("0.001"),
      false
    );
    await subscribeTx.wait();
    const isSubscribed2 = await userManager.isUserSubscribed(dcaTrigger.target);
    console.log("DCA Trigger subscribed to UserManager:", isSubscribed2);
  }

  // Deploy DCA contract
  UNISWAP_V3_ROUTER = process.env.UNISWAP_V3_ROUTER;
  console.log("UNIv3 address:", UNISWAP_V3_ROUTER);
  const wethAddress = getTokenAddress("weth");
  const dca = await getContractInstance(
    "DCAv1",
    process.env.DCA_CONTRACT_ADDRESS,
    deployer,
    UNISWAP_V3_ROUTER,
    wethAddress,
    userManagerAddress
  );

  // View user subscription
  const userSubscriptionAmount = await userManager.userSubscriptionAmount(
    dcaTrigger.target
  );
  console.log(
    "User subscription: %s Ether",
    ethers.formatUnits(userSubscriptionAmount, 18).toString()
  );

  // View user allocation
  const [userAssets, userWeights] = await userManager.viewUserAllocations(
    dcaTrigger.target
  );
  console.log(
    "User %s allocation: %s %s",
    dcaTrigger.target,
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

  // trigger the dcaTrigger trigger function
  const triggerTx = await dcaTrigger.triggerDelegate(
    dca.target,
    userSubscriptionAmount,
    amounts
  );
  await triggerTx.wait();
  console.log("DCA Triggered");
  console.log(assets);
  console.log(userSubscriptionAmount.toString());

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
