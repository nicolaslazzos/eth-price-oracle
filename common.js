const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require("web3");
const { mnemonic, rinkebyWs } = require("./env");

async function loadAccount() {
  const wsProvider = new Web3.providers.WebsocketProvider(rinkebyWs);

  // workaround for handling subscriptions
  HDWalletProvider.prototype.on = wsProvider.on.bind(wsProvider);

  const provider = new HDWalletProvider(mnemonic, wsProvider);

  const web3js = new Web3(provider);

  const accounts = await web3js.eth.getAccounts();

  return { web3js, ownerAddress: accounts[0] };
}

module.exports = { loadAccount };
