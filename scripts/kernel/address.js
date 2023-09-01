const hre = require("hardhat");
const userop = require("userop");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const kernel = await userop.Presets.Builder.Kernel.init(
    signer,
    process.env.GOERLI_RPC_URL
  );
  const address = kernel.getSender();
  console.log(`Kernel address: ${address}`);
}

main();
