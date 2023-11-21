const { ethers } = require("hardhat");
const { getContractInstance } = require("./utils");

class ContractManager {
  constructor(deployer, uniswapV3Router, wethAddress, userManager) {
    this.deployer = deployer;
    this.uniswapV3Router = uniswapV3Router;
    this.wethAddress = wethAddress;
    this.userManager;
  }

  async connectUserManager() {
    this.userManager = await getContractInstance(
      "UniversalUserManager",
      process.env.USER_MANAGER_CONTRACT_ADDRESS,
      this.deployer
    );
    return this.userManager;
  }

  async connectDCA() {
    this.dca = await getContractInstance(
      "DCAv1",
      process.env.DCA_CONTRACT_ADDRESS,
      this.deployer,
      this.uniswapV3Router,
      this.wethAddress,
      this.userManager.target
    );
    return this.dca;
  }

  async connectExecutorHandler() {
    this.executorDelegate = await getContractInstance(
      "ExecutorDelegate",
      process.env.EXECUTOR_DELEGATE_CONTRACT_ADDRESS,
      this.deployer
    );
    return this.executorDelegate;
  }

  async connectDcaValidator() {
    this.dcaValidator = await getContractInstance(
      "DcaValidator",
      process.env.DCA_VALIDATOR_CONTRACT_ADDRESS,
      this.deployer,
      this.dca.target
    );
    return this.dcaValidator;
  }

  async deployAllContracts() {
    // Deploy UserManager contract
    await this.connectUserManager();
    // Deploy ExecutorHandler contract
    await this.connectExecutorHandler();
    // Deploy DCA contract
    await this.connectDCA();
    // Deploy DcaValidator contract
    await this.connectDcaValidator();
  }

  // return the userManager contract
  getUserManager() {
    return this.userManager;
  }

  // return the executorDelegate contract
  getExecutorDelegate() {
    return this.executorDelegate;
  }

  // return the dca contract
  getDCA() {
    return this.dca;
  }

  // return the dcaValidator contract
  getDcaValidator() {
    return this.dcaValidator;
  }
}

class UserManagerAPI extends ContractManager {
  async viewUserAllocations(address, strategyNode) {
    return await this.userManager.viewUserAllocations(address, strategyNode);
  }
}

module.exports = {
  ContractManager,
  UserManagerAPI,
};
