const Blocktube = artifacts.require("Blocktube");

module.exports = function(deployer) {
  deployer.deploy(Blocktube);
};
