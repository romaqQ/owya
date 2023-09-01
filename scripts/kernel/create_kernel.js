const hre = require("hardhat");
const userop = require("userop");
const viem = require("viem");

async function main() {
  // 1. Get the default provider
  const [signer] = await hre.ethers.getSigners();
  const kernelOwner = new hre.ethers.Wallet(process.env.KERNEL_SIGNING_KEY);
  const kernel = await userop.Presets.Builder.Kernel.init(
    kernelOwner,
    process.env.GOERLI_RPC_URL
  );
  const client = await userop.Client.init(process.env.GOERLI_RPC_URL);
  const accountAddress = kernel.getSender();
  console.log(`Kernel address: ${accountAddress}`);

  //2. Deploy the Kernel account if not already by sending an empty transaction
  const res = await client.sendUserOperation(
    kernel.execute({
      to: signer.address,
      value: 0,
      data: "0x",
    })
  );
  console.log("Waiting for transaction...");
  const ev = await res.wait();
  console.log(`Transaction hash: ${ev?.transactionHash ?? null}`);
}

main();
