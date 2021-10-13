const Contract = artifacts.require("EthPriceOracle");

const { owner } = require("../../env");

module.exports = function (deployer) {
  // the second param is passed to the constructor
  deployer.deploy(Contract, owner);
};
