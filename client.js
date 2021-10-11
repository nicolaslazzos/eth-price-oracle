const { loadAccount } = require("./common");
const CallerJSON = require("./caller/build/contracts/CallerContract.json");
const OracleJSON = require("./oracle/build/contracts/EthPriceOracle.json");

const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000;

async function getCallerContract(web3js) {
  const networkId = await web3js.eth.net.getId();
  return new web3js.eth.Contract(CallerJSON.abi, CallerJSON.networks[networkId].address);
}

async function filterEvents(callerContract) {
  callerContract.events.PriceUpdatedEvent({ filter: {} }, async (err, event) => {
    if (err) console.error("Error on event", err);
    console.log("* New PriceUpdated event. ethPrice: " + event.returnValues.ethPrice);
  });

  callerContract.events.ReceivedNewRequestIdEvent({ filter: {} }, async (err, event) => {
    if (err) console.error("Error on event", err);
  });
}

async function init() {
  const { ownerAddress, web3js } = await loadAccount();
  const callerContract = await getCallerContract(web3js);
  filterEvents(callerContract);

  return { callerContract, ownerAddress, web3js };
}

(async () => {
  const { callerContract, ownerAddress, web3js } = await init();

  process.on("SIGINT", () => {
    process.exit();
  });

  const networkId = await web3js.eth.net.getId();
  const oracleAddress = OracleJSON.networks[networkId].address;
  await callerContract.methods.setOracleInstanceAddress(oracleAddress).send({ from: ownerAddress });

  setInterval(async () => {
    await callerContract.methods.updateEthPrice().send({ from: ownerAddress });
  }, SLEEP_INTERVAL);
})();
