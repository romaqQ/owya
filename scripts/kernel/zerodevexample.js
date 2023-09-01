import { constants } from "@zerodev/sdk";
// 1. Get the default ecdsa validator provider
const ecdsaProvider = await ECDSAProvider.init({
  projectId, // zeroDev projectId
  owner,
});

// 2. Deploy the Kernel account if not already by sending an empty transaction
let result = await ecdsaProvider.sendUserOperation({
  target: "0xADDRESS",
  data: "0x",
});
await ecdsaProvider.waitForUserOperationTransaction(result.hash as Hex);

// 3. Initialize required variables
const accountAddress = await ecdsaProvider.getAccount().getAddress();
const selector = getFunctionSelector("toggleKillSwitch()");

// 4. Initialize KillSwitch Validator Provider
const blockerKillSwitchProvider = await KillSwitchProvider.init({
  projectId, // zeroDev projectId
  owner,
  guardian, // Guardian signer
  delaySeconds: 1000, // Delay in seconds
  opts: {
    accountConfig: {
      accountAddress,
    },
    validatorConfig: {
      mode: ValidatorMode.plugin,
      executor: constants.KILL_SWITCH_ACTION, // Address of the executor contract
      selector, // Function selector in the executor contract to toggleKillSwitch()
    },
  },
});

// 5. Get enable signature from default ECDSA validator provider and set it in KillSwitch Validator Provider
const enableSig = await ecdsaProvider
  .getValidator()
  .approveExecutor(
    accountAddress, 
    selector,
    constants.KILL_SWITCH_ACTION,
    0,
    0,
    blockerKillSwitchProvider.getValidator()
  );

blockerKillSwitchProvider.getValidator().setEnableSignature(enableSig);

// 6. Send the transaction to turn on the KillSwitch
result = await blockerKillSwitchProvider.sendUserOperation({
  target: accountAddress,
  data: selector,
});

await blockerKillSwitchProvider.waitForUserOperationTransaction(
  result.hash as Hex
);

// 7. Get KillSwitch validator provider instance with SUDO mode
const sudoModeKillSwitchProvider = await KillSwitchProvider.init({
  projectId, // zeroDev projectId
  owner,
  guardian,
  delaySeconds: 0,
  opts: {
    accountConfig: {
      accountAddress,
    },
    validatorConfig: {
      mode: ValidatorMode.sudo,
      executor: KILL_SWITCH_ACTION,
      selector,
    },
  },
});

// 8. Send transaction to change the owner address
const changeOwnerdata = await ecdsaProvider.getEncodedEnableData(
  "0xNEW_OWNER_ADDRESS"
);
let result2 = await sudoModeKillSwitchProvider.sendUserOperation({
  target: accountAddress,
  data: changeOwnerdata,
});

await sudoModeKillSwitchProvider.waitForUserOperationTransaction(
  result2.hash as Hex
);