const fs = require('fs');
const util = require('./util');

const config = JSON.parse(fs.readFileSync('config/config.json'));

const HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + config.loggerAuth
};

async function log(msg) {
    if (config.loggerUrl) {
        let payload = {msg: msg};
        await util.post(config.loggerUrl, "", payload, HEADERS);
    }
    else {
        console.log(msg);
    }
}

module.exports = {
    log: log
}
