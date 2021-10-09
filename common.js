const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require("web3");
const { mnemonic, rinkeby } = require("./env");

async function loadAccount() {
  const provider = new HDWalletProvider(mnemonic, rinkeby);

  const web3js = new Web3(provider);

  const accounts = await web3js.eth.getAccounts();

  return { web3js, ownerAddress: accounts[0] };
}

module.exports = { loadAccount };
