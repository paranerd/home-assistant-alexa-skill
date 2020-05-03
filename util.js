const axios = require('axios');

function paramsToQueryString(params) {
  let queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');

  return queryString
}

async function get(url, path, params = {}, headers = {}) {
    let queryString = paramsToQueryString(params);
    let res = await axios.get(url + '/' + path + '?' + queryString, {headers: headers});
    return res.data;
}

async function post(url, path, params = {}, headers = {}) {
    let res = await axios.post(url + '/' + path, params, {headers: headers});
    return res.data;
}

function getDomain(entityId) {
  return entityId.split(".")[0];
}

function commandAlexaToHome(command) {
  switch (command) {
    case 'TurnOn':
      return 'turn_on';

    case 'TurnOff':
      return 'turn_off';

    case 'Play':
      return 'media_play';

    case 'Pause':
      return 'media_pause';

    case 'Stop':
      return 'media_stop';

    default:
      return null;
  }
}

function stateHomeToAlexa(state) {
  switch (state) {
    case 'on':
      return 'ON';

    case 'off':
      return 'OFF';

    case 'media_play':
      return 'Play';

    case 'media_pause':
      return 'Pause';

    case 'media_stop':
      return 'Stop';

    default:
      return null;
  }
}

function commandToState(command) {
  switch (command) {
    case 'TurnOn':
      return 'on';

    case 'TurnOff':
      return 'off';
  }
}

module.exports = {
  get: get,
  post: post,
  commandAlexaToHome: commandAlexaToHome,
  stateHomeToAlexa: stateHomeToAlexa,
  commandToState: commandToState,
  getDomain: getDomain
}
