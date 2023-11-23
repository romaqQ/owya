const { ethers } = require("hardhat");
const userop = require("userop");
const fs = require("fs");
const KernelAccountAbi = require("../abi/KernelAccountAbi");
const { getTokenAddress } = require("../utils/utils");
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
  const dcaValidator = await contractDeployer.connectDcaValidator();

  const userManagerAddress = await userManager.getAddress();

  // Check if deployer can subscribe to userManager
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance:", deployerBalance.toString());

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
  //     to: kernelAddress,
  //     value: ethers.parseEther("0.001")
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
  const uniAddress = getTokenAddress("uni");
  if (isSubscribedKernel) {
    console.log(
      "Kernel is already subscribed to UserManager:",
      isSubscribedKernel
    );
  } else {
    // From kernel contract execute subscribe function on UserManager contract
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
  const [userAssets, userWeights] = await userManager.viewUserAllocation(
    kernelAddress,
    dca.target
  );
  console.log("User %s allocation: %s", userAssets, userWeights);

  // View user subscription
  const userSubscriptionAmount = await userManager.userSubscriptionAmount(
    kernelAddress,
    dca.target
  );
  console.log(
    "User subscription: %s Ether",
    ethers.formatUnits(userSubscriptionAmount, 18).toString()
  );

  // get function selection from executorDelegate contract
  const selector =
    executorDelegate.interface.getFunction("delegateExecute").selector;
  console.log("Function selector:", selector);

  // get execution details
  const provider = new userop.BundlerJsonRpcProvider(
    process.env.GOERLI_RPC_URL
  );
  // connect to kernel contract
  console.log("Connecting to kernel contract");
  const kernelContract = new ethers.Contract(
    kernelAddress,
    KernelAccountAbi,
    provider
  );
  console.log("Retrieving Execution details selector");
  const executionDetails = await kernelContract.getExecution(selector);

  const executorHandler = executionDetails[2];
  console.log("ExecutorHandler:", executorHandler);

  const validatorHandler = executionDetails[3];
  console.log("ValidatorHandler:", validatorHandler);

  // const deployerAndDcaAddressBytes = ethers.AbiCoder.defaultAbiCoder().encode(
  //   ["address", "address"],
  //   [deployer.address, dca.target]
  // );

  // // console log deployerAndDcaAddressBytes
  // console.log("deployerAndDcaAddressBytes:", deployerAndDcaAddressBytes);

  if (
    executorHandler != executorDelegate.target ||
    validatorHandler != dcaValidator.target
  ) {
    console.log("ExecutorHandler address not set in Kernel");
    console.log("Enabling Plugin address in Kernel");

    const deployerAndDcaAddressBytes = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [deployer.address, dca.target]
    );
    const res3 = await client.sendUserOperation(
      kernel.setCallData(
        kernel.proxy.interface.encodeFunctionData("setExecution", [
          selector,
          executorDelegate.target,
          dcaValidator.target,
          0, // validuntil
          0, //validafter
          deployerAndDcaAddressBytes,
        ])
      )
    );
    console.log(`UserOpHash: ${res3.userOpHash}`);
    const ev3 = await res3.wait();
    console.log(`Transaction hash: ${ev3?.transactionHash ?? null}`);
  } else {
    // unpack execution details
    const [validUntil, validAfter, executorHandler, validatorHandler] =
      executionDetails;
    // print all execution details in one fancy print statement
    console.log(`Execution details:\n
        validUntil: ${validUntil}\n
        validAfter: ${validAfter}\n
        executorHandler: ${executorHandler}\n
        validatorHandler: ${validatorHandler}\n
        `);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
