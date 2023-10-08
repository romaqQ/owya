const { ethers } = require("hardhat");
const userop = require("userop");
const fs = require('fs');

async function main() {
    
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy UserManager contract
    const UserManager = await ethers.getContractFactory("UserManager");
    const userManager = await UserManager.deploy();
    await userManager.waitForDeployment();
    console.log("UserManager deployed at:", userManager.target);

    // Check if deployer can subscribe to userManager
    const subscribeTx = await userManager.subscribe(
        [{asset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", weight: 10000}], 
        ethers.parseEther("0.01"), 
        true
    );
    await subscribeTx.wait();

    // Check if deployer is subscribed to userManager
    const isSubscribed1 = await userManager.isUserSubscribed(deployer.address);
    console.log("Deployer subscribed to UserManager:", await isSubscribed1);

    // Deploy DCA contract
    UNISWAP_V3_ROUTER=process.env.UNISWAP_V3_ROUTER;
    console.log("UNIv3 address:", UNISWAP_V3_ROUTER);
    const DCA = await ethers.getContractFactory("DCA");
    const dca = await DCA.deploy(UNISWAP_V3_ROUTER, userManager.target);
    await dca.waitForDeployment();
    console.log("DCA deployed at:", dca.target);

    // Deploy ExecutorHandler contract
    const ExecutorDelegate = await ethers.getContractFactory("ExecutorDelegate");
    const executorDelegate = await ExecutorDelegate.deploy();
    await executorDelegate.waitForDeployment();
    console.log("ExecutorHandler deployed at:", executorDelegate.target);

    // Deploy DcaValidator contract
    const DcaValidator = await ethers.getContractFactory("DcaValidator");
    const dcaValidator = await DcaValidator.deploy(dca.target);
    await dcaValidator.waitForDeployment();
    console.log("DcaValidator deployed at:", dcaValidator.target);

    // check that executor within validator is set to executorHandler
    const executor = await dcaValidator.viewExecutor();
    // assert that the dca contract address is the same as the executor address in the validator
    console.log("DCA executor:", executor);
    console.log("ExecutorHandler address:", dca.target);
    if (executor != dca.target) {
        throw new Error("ExecutorHandler address not set in DcaValidator");
    }

    // Deploy Kernel contract with kernel owner
    const kernelOwner = new ethers.Wallet(process.env.KERNEL_SIGNING_KEY);

    const kernel = await userop.Presets.Builder.Kernel.init(
        kernelOwner,
        process.env.GOERLI_RPC_URL
    );

    const client = await userop.Client.init(
        process.env.GOERLI_RPC_URL
    );       
    const kernelAddress = kernel.getSender();
    console.log(`Kernel address: ${kernelAddress}`);

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

    // const Kernel = await ethers.getContractFactory("Kernel");
    //const kernel = await Kernel.connect(kernelOwner).deploy();
    //await kernel.waitForDeployment();

    // From kernel contract execute subscribe function on UserManager contract    
    const kernelSubTx = await client.sendUserOperation(
        kernel.execute(
            userManager.target, // to
            0, // value
            userManager.interface.encodeFunctionData(
                "subscribe", 
                [[{asset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", weight: 10000}], 
                ethers.parseEther("0.01"), 
                true]), // data
            0 // operation Operation.Call
        )
    );
    
    await kernelSubTx.wait();
    console.log("Kernel subscribed to UserManager");

    // Check if kernel is subscribed to UserManager
    const isSubscribed = await userManager.isSubscribed(kernelAddress);
    console.log("Kernel subscribed to UserManager:", isSubscribed);

    // View user allocation
    const userAllocation = await userManager.viewUserAllocation(kernelAddress);
    console.log("User allocation:", userAllocation);

    // write all contract addresses to file
    const addresses = {
        "UserManager": userManager.target,
        "DCA": dca.target,
        "ExecutorHandler": executorDelegate.target,
        "DcaValidator": dcaValidator.target,
        "Kernel": kernelAddress
    }

    const data = JSON.stringify(addresses);
    // filename shall contain a date and timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, "-");
    const filename = `addresses_${timestamp}.json`;
    fs.writeFile(filename, data, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });