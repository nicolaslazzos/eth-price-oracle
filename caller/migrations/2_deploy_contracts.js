const Contract = artifacts.require("CallerContract");

module.exports = function (deployer) {
  deployer.deploy(Contract);
};
