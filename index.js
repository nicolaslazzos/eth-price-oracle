const axios = require("axios");
const BN = require("bn.js");
const common = require("./utils/common.js");

const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000;
const PRIVATE_KEY_FILE_NAME = process.env.PRIVATE_KEY_FILE || "./oracle/oracle_private_key";
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3;
const MAX_RETRIES = process.env.MAX_RETRIES || 5;
const OracleJSON = require("./oracle/build/contracts/EthPriceOracle.json");

const pendingRequests = [];
