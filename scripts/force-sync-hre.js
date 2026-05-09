const hre = require("hardhat");

async function main() {
  const IDENTITY_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const identity = await hre.ethers.getContractAt("IdentityVerifier", IDENTITY_CONTRACT_ADDRESS);
  const [deployer] = await hre.ethers.getSigners();

  const toSubmit = [
    '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71',
    '0x6cE3EB9D3ae528E8A7Df3C8B4C9ec2b083182ba8',
    '0x1B1C447994279393a53916C95f99A39d391068E0',
    '0x3dD3CC9A906Fe2760f75badc5F45A5D6c3D8a63B'
  ];

  const toReject = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

  // 1. Clear 0x7099...
  console.log(`Clearing 0x7099...`);
  const idToReject = await identity.getIdentity(toReject);
  if (Number(idToReject[1]) === 1) {
    const assignedVerifier = idToReject[2];
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [assignedVerifier],
    });
    const verifierSigner = await hre.ethers.getSigner(assignedVerifier);
    await deployer.sendTransaction({ to: assignedVerifier, value: hre.ethers.parseEther("1.0") });

    const tx = await identity.connect(verifierSigner).rejectIdentity(toReject);
    await tx.wait();
    console.log("Rejected 0x7099 successfully.");
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [assignedVerifier],
    });
  }

  // 2. Submit for others
  for (const user of toSubmit) {
    console.log(`Submitting for ${user}...`);
    const id = await identity.getIdentity(user);
    if (Number(id[1]) === 0) {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [user],
      });
      const userSigner = await hre.ethers.getSigner(user);
      await deployer.sendTransaction({ to: user, value: hre.ethers.parseEther("1.0") });

      const tx = await identity.connect(userSigner).submitIdentity(hre.ethers.id("Sync-" + user), { value: hre.ethers.parseEther("0.0001") });
      await tx.wait();
      console.log(`Submitted for ${user} successfully.`);
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [user],
      });
    }
  }
}

main().catch(console.error);
