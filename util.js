const axios = require('axios');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config/config.json'));
const apiUrl = config.apiUrl;
const headers = {
  'Authorization': 'Bearer ' + config.token,
  'Content-Type': 'application/json'
};

function paramsToQueryString(params) {
  let queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');

  return queryString
}

async function callApi(apiEndpoint, method = 'GET', params = {}) {
  // GET
  if (method.toLowerCase() == 'get') {
    let queryString = paramsToQueryString(params);
    let res = await axios.get(apiUrl + '/' + apiEndpoint + '?' + queryString, {headers: headers});
    return res.data;
  }
  // POST
  else {
    let res = await axios.post(apiUrl + '/' + apiEndpoint, params, {headers: headers});
    return res.data;
  }
}

module.exports = {
  callApi: callApi
}
