const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const deployerPkey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const deployer = new ethers.Wallet(deployerPkey, provider);
  
  const IDENTITY_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const abi = [
    'function submitIdentity(bytes32) external payable',
    'function rejectIdentity(address) external',
    'function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)'
  ];
  const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, abi, provider);

  const toSubmit = [
    '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71',
    '0x6cE3EB9D3ae528E8A7Df3C8B4C9ec2b083182ba8',
    '0x1B1C447994279393a53916C95f99A39d391068E0',
    '0x3dD3CC9A906Fe2760f75badc5F45A5D6c3D8a63B'
  ];

  const toReject = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

  // 1. Clear 0x7099...
  console.log(`Clearing 0x7099...`);
  try {
    const id = await contract.getIdentity(toReject);
    if (Number(id[1]) === 1) {
       // Need to impersonate the verifier assigned to it
       const assignedVerifier = id[2];
       await provider.send('hardhat_impersonateAccount', [assignedVerifier]);
       const verifierSigner = await provider.getSigner(assignedVerifier);
       
       // Give verifier some ETH for gas
       await deployer.sendTransaction({ to: assignedVerifier, value: ethers.parseEther('1.0') });

       const cVerifier = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, abi, verifierSigner);
       const tx = await cVerifier.rejectIdentity(toReject);
       await tx.wait();
       console.log("Rejected 0x7099 successfully.");
       await provider.send('hardhat_stopImpersonatingAccount', [assignedVerifier]);
    } else {
      console.log("0x7099 is not pending on-chain.");
    }
  } catch (e) {
    console.error("Error rejecting 0x7099:", e.message);
  }

  // 2. Submit for others
  for (const user of toSubmit) {
    console.log(`Submitting for ${user}...`);
    try {
      const id = await contract.getIdentity(user);
      if (Number(id[1]) === 0) {
        await provider.send('hardhat_impersonateAccount', [user]);
        const userSigner = await provider.getSigner(user);
        
        // Give user some ETH for fee and gas
        await deployer.sendTransaction({ to: user, value: ethers.parseEther('1.0') });

        const cUser = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, abi, userSigner);
        const tx = await cUser.submitIdentity(ethers.id("ForceSync-" + user), { value: ethers.parseEther('0.0001') });
        await tx.wait();
        console.log(`Submitted for ${user} successfully.`);
        await provider.send('hardhat_stopImpersonatingAccount', [user]);
      } else {
        console.log(`${user} is already status ${id[1]}`);
      }
    } catch (e) {
      console.error(`Error submitting for ${user}:`, e.message);
    }
  }
}

main();
