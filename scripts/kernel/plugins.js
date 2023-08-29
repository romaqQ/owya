const hre = require("hardhat");
const userop = require("userop");

async function main() {
  // 1. Get the default provider
  const [signer] = await hre.ethers.getSigners();
  const kernel = await userop.Presets.Builder.Kernel.init(
    signer,
    process.env.GOERLI_RPC_URL
  );
  const client = await userop.Client.init(process.env.GOERLI_RPC_URL);

  // 2. Deploy the Kernel account if not already by sending an empty transaction
  const res = await client.sendUserOperation(
    kernel.execute({
      to: "0x0000000000000000000000000000000000000000", //TODO: wohin empty transaction //0x0000000000000000000000000000000000000000
      value: 0,
      data: "0x",
    })
  );
  console.log("Waiting for transaction...");
  const ev = await res.wait();
  console.log(`Transaction hash: ${ev?.transactionHash ?? null}`);

  // 3. Initialize required variables
  const accountAddress = kernel.getSender();
  console.log(`Kernel address: ${accountAddress}`);
  const selector = hre.ethers.utils.id("toggleCounter()").substring(0, 10);
  const EXECUTORADDRESS = "0xA84452281cC0E521F32E8E123f3A19A6B4D3B1Be";
  const VALIDATORADDRESS = "0x6e8f19D3A0A38f540fA08d2f13dD7019BbAB82Fa";
  kernel
    // Buffer
    .useMiddleware(async (ctx) => {
      ctx.op.verificationGasLimit = hre.ethers.BigNumber.from(
        ctx.op.verificationGasLimit
      ).mul(2);
    })
    // // Resign
    .useMiddleware(userop.Presets.Middleware.EOASignature(signer))
    // Apply Kernel Sudo mode
    .useMiddleware(async (ctx) => {
      ctx.op.signature = hre.ethers.utils.hexConcat([
        userop.Constants.Kernel.Modes.Plugin,
        ctx.op.signature,
      ]);
    });
  const res3 = await client.sendUserOperation(
    kernel.setExecution(selector, EXECUTORADDRESS, VALIDATORADDRESS, 0, 0)
  );
  console.log(`UserOpHash: ${res3.userOpHash}`);
  console.log("Waiting for transaction...");
  const ev3 = await res3.wait();
  console.log(`Transaction hash: ${ev3?.transactionHash ?? null}`);

  // 4. Initialize KillSwitch Validator Provider

  //   const address = kernel.getSender();
  //   console.log(`Kernel address: ${address}`);

  //   const calls = await createCalls(
  //     new ethers.providers.JsonRpcProvider(config.rpcUrl)
  //   );

  console.log(`Building UserOperation...`);

  // validator plugin -> userop

  // //{to: data: value:} -> ethereum transaction

  // const res2 = await client.sendUserOperation(
  //   calls.length === 1 ? kernel.execute(calls[0]) : kernel.executeBatch(calls),
  //   {
  //     dryRun: opts.dryRun,
  //     onBuild: (op) => console.log("Signed UserOperation:", op),
  //   }
  // );
  // console.log(`UserOpHash: ${res2.userOpHash}`);

  // console.log("Waiting for transaction...");
  // const ev2 = await res2.wait();
  // console.log(`Transaction hash: ${ev2?.transactionHash ?? null}`);
}

// 1. Kernelfactory deployen so das funktioniert
// 2. Validator austauschen -> enable modes testen
main();
