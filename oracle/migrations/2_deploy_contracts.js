const Contract = artifacts.require("EthPriceOracle");

module.exports = function (deployer) {
  deployer.deploy(Contract);
};
