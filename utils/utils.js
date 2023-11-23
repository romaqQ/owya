const { ethers } = require("hardhat");
const fs = require("fs");
const {
  UserOperationBuilder,
  Presets,
  Constants,
  BundlerJsonRpcProvider,
} = require("userop");
const EntryPointAbi = require("../abi/EntryPointAbi");
const hre = require("hardhat");

function getTokenAddress(tokenName) {
  const network = hre.network.name;
  // create lowercase token name
  const tokenNameLc = tokenName.toLowerCase();
  return (
    hre.config.tokenAddresses?.[network]?.[tokenNameLc] || "Address not found"
  );
}

async function writeAddressesToFile(addresses) {
  if (Object.keys(addresses).length === 0) {
    console.log("Addresses object is empty.");
  } else {
    const data = JSON.stringify(addresses, null, 2);
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, "-");
    const filename = `${
      (await ethers.provider.getNetwork()).name
    }_addresses_${timestamp}.json`;
    fs.writeFileSync(filename, data);
    console.log("JSON data is saved.");
  }
}

async function getContractInstance(
  contractName,
  contractAddress,
  signer,
  ...args
) {
  // check what network hardhat is using
  const network = await ethers.provider.getNetwork();
  const deploy = network.name === "hardhat";
  const contractFactory = await ethers.getContractFactory(contractName);
  if (contractAddress && !deploy) {
    console.log(
      `Using existing ${contractName} instance at ${contractAddress}`
    );
    return await contractFactory.attach(contractAddress).connect(signer);
  } else {
    console.log(`Deploying new ${contractName} instance...`);
    const contractInstance = await contractFactory.deploy(...args);
    await contractInstance.waitForDeployment();
    console.log(`${contractName} deployed at ${contractInstance.target}`);
    // wait for 20 seconds for contract to be deployed
    console.log(
      "Waiting for 20 seconds for contract to be deployed to continue with verification"
    );
    if (!deploy) {
      await new Promise((r) => setTimeout(r, 20000));
      // try verification if it fails wait for another 20 seconds before trying again
      try {
        await verifyContract(contractInstance.target, args);
      } catch (error) {
        console.log("Verification failed, trying again in 20 seconds...");
        await new Promise((r) => setTimeout(r, 20000));
        await verifyContract(contractInstance.target, args);
      }
    }
    return contractInstance.connect(signer);
  }
}

async function verifyContract(contractAddress, contractArgs) {
  // verification
  console.log("Verifying contract...", contractAddress);
  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: contractArgs ? contractArgs : [],
  });
}

async function buildUserOperation(
  kernelAddress,
  executorInterface,
  function_name,
  args,
  signer
) {
  const provider = new BundlerJsonRpcProvider(process.env.GOERLI_RPC_URL);
  const [fee, block] = await Promise.all([
    provider.send("eth_maxPriorityFeePerGas", []),
    provider.getBlock("latest"),
  ]);

  const entryPointContract = new ethers.Contract(
    process.env.ENTRY_POINT,
    EntryPointAbi,
    provider
  );
  const nonce = await entryPointContract.getNonce(kernelAddress, 0);
  const tip = BigInt(fee);
  const buffer = (tip / BigInt(100)) * BigInt(13);
  const maxPriorityFeePerGas = tip + buffer;
  const maxFeePerGas = block.baseFeePerGas
    ? BigInt(block.baseFeePerGas) * BigInt(2) + maxPriorityFeePerGas
    : maxPriorityFeePerGas;
  // console.log("buildUserOp - kernelAddress:", kernelAddress);
  // console.log("buildUserOp - executorAbi:", executorInterface);
  // console.log("buildUserOp - function_name:", function_name);
  // console.log("buildUserOp - args:", args);
  // console.log("buildUserOp - maxFeePerGas:", maxFeePerGas);
  // console.log(
  //   "buildUserOp - block.baseFeePerGas:",
  //   BigInt(block.baseFeePerGas)
  // );
  // console.log("buildUserOp - nonce:", nonce);
  // console.log("buildUserOp - maxPriorityFeePerGas:", maxPriorityFeePerGas);
  // console.log("buildUserOp - signer:", signer.address);
  // console.log(
  //   ethers.hexlify(Constants.Kernel.Modes.Plugin),
  //   Constants.Kernel.Modes.Plugin,
  //   ethers.stripZerosLeft(Constants.Kernel.Modes.Plugin)
  // );

  const calldata = executorInterface.encodeFunctionData(function_name, args);
  const op = await _buildUserOperation(
    kernelAddress,
    calldata,
    maxFeePerGas,
    nonce,
    maxPriorityFeePerGas,
    signer,
    provider
  );
  return op;
}

async function _buildUserOperation(
  kernelAddress,
  callData,
  maxFeePerGas,
  nonce,
  maxPriorityFeePerGas,
  signer,
  provider
) {
  const base = new UserOperationBuilder();
  // read the current callGasLimit from the UserOperationBuilder

  const builder = base
    .useDefaults({
      sender: kernelAddress, //client account
      callData: callData,
      maxFeePerGas: maxFeePerGas,
      nonce: nonce,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      preVerificationGas: 50000,
    })
    // .useMiddleware(Presets.Middleware.estimateUserOperationGas(provider))
    .useMiddleware(Presets.Middleware.EOASignature(signer))
    .useMiddleware(async (ctx) => {
      ctx.op.signature = ethers.concat([
        Constants.Kernel.Modes.Plugin,
        ctx.op.signature,
      ]);
    });
  // parse bigNumber to number
  console.log(
    "Pre adjustment: callGasLimit:",
    builder.getCallGasLimit().toNumber()
  );
  // adjust the callGasLimit as userop sdk does not estimate gas correctly
  builder.setCallGasLimit(builder.getCallGasLimit() * 15);
  console.log(
    "After adjustment: callGasLimit:",
    builder.getCallGasLimit().toNumber()
  );
  return builder;
}

module.exports = {
  getContractInstance,
  buildUserOperation,
  getTokenAddress,
  writeAddressesToFile,
};
