const { ethers } = require("hardhat");
const userop = require("userop");
const fs = require("fs");
const {
  getContractInstance,
  getTokenAddress,
  buildUserOperation,
} = require("../utils/utils");
const KernelAccountAbi = require("../abi/KernelAccountAbi");

async function main() {
  const [deployer, thirdParty, kernelOwner] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Counter
  const counter = await getContractInstance(
    "Counter",
    process.env.COUNTER_ADDRESS,
    deployer
  );

  // Deploy Simple Executor
  const simpleExecutor = await getContractInstance(
    "SimpleExecutor",
    process.env.SIMPLE_EXECUTOR_ADDRESS,
    deployer
  );

  // Deploy Simple Validator
  const simpleValidator = await getContractInstance(
    "SimpleValidator",
    process.env.SIMPLE_VALIDATOR_ADDRESS,
    deployer
  );

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

  // Check kernel balance
  const kernelBalance = await kernelOwner.provider.getBalance(kernelAddress);
  console.log("Kernel balance:", kernelBalance.toString());

  if (kernelBalance == 0) {
    // Send Ether to kernel contract
    const tx = await kernelOwner.sendTransaction({
      to: kernelAddress,
      value: ethers.parseEther("0.005"),
    });
    await tx.wait();
    console.log("Ether sent to kernel contract");
  }

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

  // get function selection from executorDelegate contract
  const selector =
    simpleExecutor.interface.getFunction("toggleCounter").selector;
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

  if (
    executorHandler != simpleExecutor.target ||
    validatorHandler != simpleValidator.target
  ) {
    console.log("ExecutorHandler address not set in Kernel");
    console.log("Enabling Plugin address in Kernel");

    const res3 = await client.sendUserOperation(
      kernel.setCallData(
        kernel.proxy.interface.encodeFunctionData("setExecution", [
          selector,
          simpleExecutor.target,
          simpleValidator.target,
          0, // validuntil
          0, //validafter
          deployer.address,
        ])
      )
    );
    console.log(`UserOpHash: ${res3.userOpHash}`);
    const ev3 = await res3.wait();
    console.log(`Transaction hash: ${ev3?.transactionHash ?? null}`);
  }

  // create the swap data
  const builder = await buildUserOperation(
    kernelAddress,
    simpleExecutor.interface,
    "toggleCounter",
    [counter.target],
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
