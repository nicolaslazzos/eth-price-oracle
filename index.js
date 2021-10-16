const axios = require("axios");
const BN = require("bn.js");
const { loadAccount } = require("./common");
const OracleJSON = require("./oracle/build/contracts/EthPriceOracle.json");

const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 5000;
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3;
const MAX_RETRIES = process.env.MAX_RETRIES || 5;

const pendingRequests = [];

async function getOracleContract(web3js) {
  const networkId = await web3js.eth.net.getId();
  return new web3js.eth.Contract(OracleJSON.abi, OracleJSON.networks[networkId].address);
}

async function retrieveLatestEthPrice() {
  const resp = await axios({
    url: "https://api.binance.com/api/v3/ticker/price",
    params: {
      symbol: "ETHUSDT",
    },
    method: "get",
  });

  return resp.data.price;
}

async function filterEvents(oracleContract, web3js) {
  oracleContract.events.GetLatestEthPriceEvent(async (err, event) => {
    if (err) return console.error("[GetLatestEthPriceEvent]", err);
    console.log(`* [GetLatestEthPriceEvent] (${event.returnValues.id})`);

    await addRequestToQueue(event);
  });

  oracleContract.events.SetLatestEthPriceEvent(async (err, event) => {
    if (err) console.error("[SetLatestEthPriceEvent]", err);
    console.log(`* [SetLatestEthPriceEvent] ethPrice:`, event.returnValues.ethPrice);
  });

  oracleContract.events.AddOracleEvent(async (err, event) => {
    if (err) console.error("[AddOracleEvent]", err);
    console.log(`* [AddOracleEvent] address:`, event.returnValues.oracleAddress);
  });

  oracleContract.events.SetThresholdEvent(async (err, event) => {
    if (err) console.error("[SetThresholdEvent]", err);
    console.log(`* [SetThresholdEvent] threshold:`, event.returnValues.threshold);
  });
}

async function addRequestToQueue(event) {
  const callerAddress = event.returnValues.callerAddress;
  const id = event.returnValues.id;
  pendingRequests.push({ callerAddress, id });
}

async function processQueue(oracleContract, ownerAddress) {
  console.log(new Date().toISOString(), "Checking [processQueue]", `(${pendingRequests.length} Pending)`);

  let processedRequests = 0;

  while (pendingRequests.length > 0 && processedRequests < CHUNK_SIZE) {
    const req = pendingRequests.shift();
    await processRequest(oracleContract, ownerAddress, req.id, req.callerAddress);
    processedRequests++;
  }
}

async function processRequest(oracleContract, ownerAddress, id, callerAddress) {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const ethPrice = await retrieveLatestEthPrice();
      await setLatestEthPrice(oracleContract, callerAddress, ownerAddress, ethPrice, id);

      return;
    } catch (error) {
      if (retries === MAX_RETRIES - 1) {
        await setLatestEthPrice(oracleContract, callerAddress, ownerAddress, "0", id);

        return;
      }

      retries++;
    }
  }
}

async function setLatestEthPrice(oracleContract, callerAddress, ownerAddress, ethPrice, id) {
  ethPrice = ethPrice.replace(".", "");
  const multiplier = new BN(10 ** 10, 10);
  const ethPriceInt = new BN(parseInt(ethPrice), 10).mul(multiplier);
  const idInt = new BN(parseInt(id));

  try {
    await oracleContract.methods
      .setLatestEthPrice(ethPriceInt.toString(), callerAddress, idInt.toString())
      .send({ from: ownerAddress, gas: 1000000 });
  } catch (error) {
    console.log("[setLatestEthPrice]", error);
  }
}

async function init() {
  const { ownerAddress, web3js } = await loadAccount();
  const oracleContract = await getOracleContract(web3js);
  filterEvents(oracleContract, web3js);

  console.log("Provider Initialized:", ownerAddress);

  return { oracleContract, ownerAddress };
}

(async () => {
  const { oracleContract, ownerAddress } = await init();

  process.on("SIGINT", () => {
    process.exit();
  });

  try {
    await oracleContract.methods.addOracle(ownerAddress).send({ from: ownerAddress, gas: 1000000 });
  } catch {}

  try {
    await oracleContract.methods.setThreshold(1).send({ from: ownerAddress, gas: 1000000 });
  } catch {}

  while (true) {
    await processQueue(oracleContract, ownerAddress);
    await new Promise((res) => setTimeout(res, SLEEP_INTERVAL));
  }
})();
