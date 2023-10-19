require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
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
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETHEREUM_MAINNET_RPC_URL,
      },
      chainId: 1,
      weth: process.env.WETH_ADDRESS_MAINNET
        ? process.env.WETH_ADDRESS_MAINNET
        : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      uni: process.env.UNI_ADDRESS_GOERLI
        ? process.env.UNI_ADDRESS_GOERLI
        : "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
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
  tokenAddresses: {
    hardhat: {
      weth: process.env.WETH_ADDRESS_MAINNET
        ? process.env.WETH_ADDRESS_MAINNET
        : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      uni: process.env.UNI_ADDRESS_GOERLI
        ? process.env.UNI_ADDRESS_GOERLI
        : "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
    goerli: {
      weth: process.env.WETH_ADDRESS_GOERLI
        ? process.env.WETH_ADDRESS_GOERLI
        : "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
      uni: process.env.UNI_ADDRESS_GOERLI
        ? process.env.UNI_ADDRESS_GOERLI
        : "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY
        ? process.env.ETHERSCAN_API_KEY
        : "",
    },
  },
};
