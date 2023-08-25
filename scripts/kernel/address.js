const hre = require("hardhat");
const userop = require("userop");

export default async function main() {
  const signer = hre.getSigner();
  const kernel = await Presets.Builder.Kernel.init(
    signer,
    config.rpcUrl // von hardhat holen
    // { proxy: "0x31165570cC641181FE23781C37430E3A1399d3C0" }
    //{ factory: "0x5B27b82ef3B758B7A0793d002d40A3305022B3d7" }
    //{ factory: Constants.Kernel.ECDSAFactory } //"0x512fF06eFaCC2A423922B9f2EdB8be030641a4d5"}
  );
  // const KernelFactory = await ethers.getContractFactory("KernelFactory");

  //console.log(kernel.factory.address); // 0xD49a72cb78C44c6bfbf0d471581B7635cF62E81e --> ECDSAKernelFactory
  //console.log(kernel.proxy.address); //  0xD62feF7b2A3b339C667a5F09045AcB383E7324a1
  //console.log(kernel.proxy.interface);
  const address = kernel.getSender(); //0xD62feF7b2A3b339C667a5F09045AcB383E7324a1
  console.log(`Kernel address: ${address}`);
}

// 1. Kernelfactory deployen so das funktioniert
// 2. Validator austauschen -> enable modes testen

//
