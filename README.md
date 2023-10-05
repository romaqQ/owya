# Decentralized DCA with 3rd Party Provider

This projects demonstrates the DCA use case for decentralized signal provision within the context of Account Abstraction.

Try running some of the following tasks:

### Cloning the Repo

Repository:

```shell
git clone --recurse-submodules https://github.com/romaqQ/owya.git
```


Submodules:
Run the following command to update the submodules separately:

```shell
git submodule update --init --recursive
```

Install foundry:

```shell
curl -L https://foundry.paradigm.xyz | bash
```

### Deployment and Hardhat Commands


```shell

npx hardhat compile
npx hardhat run scripts/deploy.js
```

### Hardhat Tests

```shell
npx hardhat test
REPORT_GAS=true npx hardhat test
```

