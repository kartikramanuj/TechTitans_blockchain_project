const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8546');
  const abi = ['function getIdentity(address) external view returns (bytes32, uint8, address, uint256, uint256, uint256, bool)'];
  const contract = new ethers.Contract('0x5FbDB2315678afecb367f032d93F642f64180aa3', abi, provider);

  // Check more accounts to find the "many" requests
  const accounts = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    '0xBcd4042DE499D14e55001CcbB24a551F3b989ccE',
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    '0x71bB9D852f0f290af4A40CbE05F5160F9ee7DD71'
  ];

  console.log("Checking On-Chain Identity Statuses:");
  const statusMap = ["None", "Pending", "Verified", "Revoked", "Rejected"];

  for (const acc of accounts) {
    try {
      const id = await contract.getIdentity(acc);
      const statusNum = Number(id[1]);
      if (statusNum !== 0) {
        console.log(`Account: ${acc}`);
        console.log(`  Status: ${statusMap[statusNum]}`);
        console.log(`  Verifier: ${id[2]}`);
        console.log(`  Deadline: ${new Date(Number(id[4]) * 1000).toLocaleString()}`);
      }
    } catch (e) {
      // Skip
    }
  }
}

main();
