const { ethers } = require("hardhat");
const {
  UserOperationBuilder,
  Presets,
  Constants,
  BundlerJsonRpcProvider,
} = require("userop");

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
  executorAbi,
  function_name,
  args,
  signer
) {
  const provider = new BundlerJsonRpcProvider(process.env.GOERLI_RPC_URL);
  const [fee, block] = await Promise.all([
    provider.send("eth_maxPriorityFeePerGas", []),
    provider.getBlock("latest"),
  ]);

  const entryPoint = EntryPoint__factory.connect(
    process.env.ENTRY_POINT,
    provider
  );
  const nonce = await entryPoint.getNonce(accountAddress, 0);
  const tip = BigNumber.from(fee);
  const buffer = tip.div(100).mul(13);
  const maxPriorityFeePerGas = tip.add(buffer);
  const maxFeePerGas = block.baseFeePerGas
    ? block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas)
    : maxPriorityFeePerGas;
  // log all params
  console.log("buildUserOp - kernelAddress:", kernelAddress);
  console.log("buildUserOp - executorAbi:", executorAbi);
  console.log("buildUserOp - function_name:", function_name);
  console.log("buildUserOp - args:", args);
  console.log("buildUserOp - maxFeePerGas:", maxFeePerGas);
  console.log("buildUserOp - nonce:", nonce);
  console.log("buildUserOp - maxPriorityFeePerGas:", maxPriorityFeePerGas);
  console.log("buildUserOp - signer:", signer.address);

  const op = await _buildUserOperation(
    kernelAddress,
    executorAbi,
    function_name,
    args,
    maxFeePerGas,
    nonce,
    maxPriorityFeePerGas,
    signer
  );
  return op;
}

async function _buildUserOperation(
  kernelAddress,
  executorAbi,
  function_name,
  args,
  maxFeePerGas,
  nonce,
  maxPriorityFeePerGas,
  signer
) {
  const base = new UserOperationBuilder();
  const builder = base
    .useDefaults({
      sender: kernelAddress, //client account
      callData: ethers
        .Interface(executorAbi)
        .encodeFunctionData(function_name, args),
      maxFeePerGas: maxFeePerGas,
      nonce: nonce,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      preVerificationGas: 50000,
    })
    .useMiddleware(Presets.Middleware.EOASignature(signer))
    .useMiddleware(async (ctx) => {
      ctx.op.signature = hexConcat([
        Constants.Kernel.Modes.Plugin,
        ctx.op.signature,
      ]);
    });

  return builder;
}

module.exports = {
  getContractInstance,
  buildUserOperation,
};
