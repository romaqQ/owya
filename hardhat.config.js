require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");
require("@nomicfoundation/hardhat-ethers");

require("dotenv").config();

function getAccounts() {
  const accs = [];
  if (process.env.DEPLOYER_PRIVATE_KEY !== undefined) {
    accs.push(process.env.DEPLOYER_PRIVATE_KEY);
  }
  if (process.env.THIRD_PARTY_PRIVATE_KEY !== undefined) {
    accs.push(process.env.THIRD_PARTY_PRIVATE_KEY);
  }
  if (process.env.KERNEL_SIGNING_KEY !== undefined) {
    accs.push(process.env.KERNEL_SIGNING_KEY);
  }
  if (process.env.PAYMASTER_OWNER_PRIVATE_KEY !== undefined) {
    accs.push(process.env.PAYMASTER_OWNER_PRIVATE_KEY);
  }
  return accs;
}

module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
      metadata: {
        bytecodeHash: "none",
      },
      viaIR: true,
    },
  },
  // defaultNetwork: "goerli",
  // alias: {
  //   "account-abstraction": "lib/account-abstraction/contracts/",
  //   "openzeppelin-contracts": "lib/openzeppelin-contracts/",
  //   "@openzeppelin": "lib/openzeppelin-contracts",
  //   solady: "lib/solady/src/",
  //   kernel: "lib/kernel/src/",
  // },
  networks: {
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: getAccounts(),
    },
    polygon: {
      url: process.env.POLYGON_URL ? process.env.POLYGON_URL : "",
      accounts: getAccounts(),
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL ? process.env.GOERLI_RPC_URL : "",
      accounts: getAccounts(),
    },
    ethereum: {
      url: process.env.ETHEREUM_URL ? process.env.ETHEREUM_URL : "",
      accounts: getAccounts(),
    },
    arbitrum: {
      url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: getAccounts(),
    },
    arbitrumGoerli: {
      url: `https://arbitrum-goerli.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: getAccounts(),
    },
    optimism: {
      url: `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: getAccounts(),
    },
    optimismGoerli: {
      url: `https://optimism-goerli.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: getAccounts(),
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.GOERLI_ETHERSCAN_API_KEY
        ? process.env.GOERLI_ETHERSCAN_API_KEY
        : "",
    },
  },
};
