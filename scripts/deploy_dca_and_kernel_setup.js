const { ethers } = require("hardhat");
const userop = require("userop");
const fs = require('fs');
const {KernelAccountABI} = require("../abi/KernelAccountAbi");


async function getContractInstance(contractName, contractAddress, signer, ...args) {
    // check what network hardhat is using
    const network = await ethers.provider.getNetwork();
    const deploy = network.name === "hardhat";
    const contractFactory = await ethers.getContractFactory(contractName);
    if (contractAddress && !deploy) {
        console.log(`Using existing ${contractName} instance at ${contractAddress}`);
        return await contractFactory.attach(contractAddress).connect(signer);
    } else {
        console.log(`Deploying new ${contractName} instance...`);
        const contractInstance = await contractFactory.deploy(...args);
        await contractInstance.waitForDeployment();
        console.log(`${contractName} deployed at ${contractInstance.address}`);
        return contractInstance.connect(signer);
    }
}


async function main() {
    
    const [deployer, thirdParty, kernelOwner] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy UserManager contract
    const userManager = await getContractInstance("UserManager", process.env.USER_MANAGER_ADDRESS, deployer);
    const userManagerAddress = await userManager.getAddress();

    // Check if deployer can subscribe to userManager
    const deployerBalance = await deployer.provider.getBalance(deployer.address);;
    console.log("Deployer balance:", deployerBalance.toString());

    // Check if deployer is subscribed to userManager
    const isSubscribed1 = await userManager.isUserSubscribed(deployer.address);
    if (isSubscribed1) {
        console.log("Deployer is already subscribed to UserManager:", isSubscribed1);
    } else {
        const subscribeTx = await userManager.subscribe(
            [{asset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", weight: 10000}], 
            ethers.parseEther("0.01"), 
            true
        );
        await subscribeTx.wait();   
        const isSubscribed2 = await userManager.isUserSubscribed(deployer.address);
        console.log("Deployer subscribed to UserManager:", isSubscribed2);
    }

    // Deploy DCA contract
    UNISWAP_V3_ROUTER=process.env.UNISWAP_V3_ROUTER;
    console.log("UNIv3 address:", UNISWAP_V3_ROUTER);

    const dca = await getContractInstance("DCA", process.env.DCA_CONTRACT_ADDRESS, deployer, UNISWAP_V3_ROUTER, userManagerAddress);

    // Deploy ExecutorHandler contract
    const executorDelegate = await getContractInstance("ExecutorDelegate", process.env.EXECUTOR_DELEGATE_CONTRACT_ADDRESS, deployer);

    // Deploy DcaValidator contract
    const dcaValidator = await getContractInstance("DcaValidator", process.env.DCA_VALIDATOR_CONTRACT_ADDRESS, deployer, dca.target);

    // check that executor within validator is set to executorHandler
    const executor = await dcaValidator.viewExecutor();
    // assert that the dca contract address is the same as the executor address in the validator
    console.log("DCA executor:", executor);
    if (executor != dca.target) {
        throw new Error("ExecutorHandler address not set in DcaValidator");
    }

    // Kernel Owner Account
    console.log("Kernel Owner Account:", kernelOwner.address);

    // Check kernelOwner balance
    const kernelOwnerBalance = await kernelOwner.provider.getBalance(kernelOwner.address);;
    console.log("kernelOwner balance:", kernelOwnerBalance.toString());

    const kernel = await userop.Presets.Builder.Kernel.init(
        kernelOwner,
        process.env.GOERLI_RPC_URL
    );

    const client = await userop.Client.init(
        process.env.GOERLI_RPC_URL
    );

    const kernelAddress = kernel.getSender();
    console.log(`Kernel address: ${kernelAddress}`);
    
    // Send Ether to kernel contract
    const tx = await kernelOwner.sendTransaction({
        to: kernelAddress,
        value: ethers.parseEther("0.005")
    });
    await tx.wait();
    console.log("Ether sent to kernel contract");

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
    const isSubscribedKernel = await userManager.isUserSubscribed(kernelAddress);

    if (isSubscribedKernel) {
        console.log("Kernel is already subscribed to UserManager:", isSubscribedKernel);
    } else {
        // From kernel contract execute subscribe function on UserManager contract    
        const kernelSubTx = await client.sendUserOperation(
            kernel.execute({
                to:userManagerAddress, // to
                value:0, // value
                data: userManager.interface.encodeFunctionData(
                    "subscribe", 
                    [[{asset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", weight: 10000}], 
                    ethers.parseEther("0.01"), 
                    true]), // data
                operation:0 // operation Operation.Call
            })
        );
        
        await kernelSubTx.wait();
        console.log("Kernel subscribed to UserManager");

        // Check if kernel is subscribed to UserManager
        const isSubscribed = await userManager.isUserSubscribed(kernelAddress);
        console.log("Kernel subscribed to UserManager:", isSubscribed);
    }

    // View user allocation
    const userAllocation = await userManager.viewUserAllocations(kernelAddress);
    console.log("User allocation:", userAllocation);

    // View user subscription
    const userSubscriptionAmount = await userManager.userSubscriptionAmount(kernelAddress);
    console.log("User subscription: %s Ether", ethers.formatUnits(userSubscriptionAmount, 18).toString());

    // write all contract addresses to file
    const addresses = {
        "UserManager": userManager.target,
        "DCA": dca.target,
        "ExecutorHandler": executorDelegate.target,
        "DcaValidator": dcaValidator.target,
        "Kernel": kernelAddress
    }

    const data = JSON.stringify(addresses);
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, "-");
    const filename = `${(await ethers.provider.getNetwork()).name}_addresses_${timestamp}.json`;
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