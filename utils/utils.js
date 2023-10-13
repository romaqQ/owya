const { ethers } = require("hardhat");
const {
  UserOperationBuilder,
  Presets,
  Constants,
  BundlerJsonRpcProvider,
} = require("userop");
const EntryPointAbi = require("../abi/EntryPointAbi");

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
    console.log(`${contractName} deployed at ${contractInstance.address}`);
    return contractInstance.connect(signer);
  }
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
  const buffer = tip * BigInt(100) * BigInt(13);
  const maxPriorityFeePerGas = tip + buffer;
  const maxFeePerGas = block.baseFeePerGas
    ? block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas)
    : maxPriorityFeePerGas;
  // console.log("buildUserOp - kernelAddress:", kernelAddress);
  // console.log("buildUserOp - executorAbi:", executorInterface);
  // console.log("buildUserOp - function_name:", function_name);
  // console.log("buildUserOp - args:", args);
  // console.log("buildUserOp - maxFeePerGas:", maxFeePerGas);
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
    signer
  );
  return op;
}

async function _buildUserOperation(
  kernelAddress,
  callData,
  maxFeePerGas,
  nonce,
  maxPriorityFeePerGas,
  signer
) {
  const base = new UserOperationBuilder();
  const builder = base
    .useDefaults({
      sender: kernelAddress, //client account
      callData: callData,
      maxFeePerGas: maxFeePerGas,
      nonce: nonce,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      preVerificationGas: 50000,
    })
    .useMiddleware(Presets.Middleware.EOASignature(signer))
    .useMiddleware(async (ctx) => {
      ctx.op.signature = ethers.concat([
        ethers.stripZerosLeft(Constants.Kernel.Modes.Plugin),
        ctx.op.signature,
      ]);
    });

  return builder;
}

module.exports = {
  getContractInstance,
  buildUserOperation,
};
