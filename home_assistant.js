const fs = require('fs');
const util = require('./util');
const tv = require('./special_devices/tv');

const config = JSON.parse(fs.readFileSync('config/config.json'));
const capabilities = JSON.parse(fs.readFileSync('config/capabilities.json'));

const manufacturer = config.manufacturer;

const specialDevices = {
  "remote.living_room": {
    "categories": ["TV"],
    "capabilities": [
      "power",
      "channel",
      "volume",
      "playback"
    ],
    "handler": tv.setDeviceState
  }
}

async function discover() {
  let entities = await util.callApi('states');
  let endpoints = [];

  let devicesByPattern = new RegExp("^(" + config.discoveryPatterns.join("|") + ")");

  for (let entity of entities) {
    if (devicesByPattern.test(entity.entity_id)) {
      if (entity.entity_id in specialDevices) {
        endpoints.push(buildEndpoint(entity, specialDevices[entity.entity_id]))
      }
      else {
        endpoints.push(buildEndpoint(entity));
      }
    }
  }

  endpoints.push(createScene());

  return {endpoints: endpoints};
}

function buildEndpoint(entity, deviceConfig) {
  let domain = entity.entity_id.split(".")[0];
  let entityCategories = [];
  let entityCapabilities = [capabilities.base]

  if (deviceConfig) {
    console.log(deviceConfig);
    entityCategories = entityCategories.concat(deviceConfig["categories"]);
    entityCapabilities = entityCapabilities.concat(deviceConfig["capabilities"].map(x => capabilities[x]));
  }
  else if (domain == 'light') {
    entityCategories.push("LIGHT");
    entityCapabilities.push(capabilities.power);
  }
  else if (domain == 'media_player') {
    entityCategories.push("STREAMING_DEVICE");
    entityCapabilities.push(capabilities.playback);
    entityCapabilities.push(capabilities.volume);
  }
  else {
    entityCategories.push("SWITCH");
    entityCapabilities.push(capabilities.power);
  }

  return {
    "endpointId": entity.entity_id,
    "manufacturerName": manufacturer,
    "friendlyName": entity.attributes.friendly_name,
    "description": entity.attributes.friendly_name,
    "displayCategories": entityCategories,
    "capabilities": entityCapabilities
  }
}

function createScene() {
  return {
    "endpointId": "scene.glotze",
    "manufacturerName": manufacturer,
    "friendlyName": "Glotze",
    "description": "Turn on my TV",
    "displayCategories": ["ACTIVITY_TRIGGER"],
    "capabilities": [capabilities.scene]
  }
}

async function setDeviceState(entityId, command, data = {}) {
  // Special devices
  if (entityId in specialDevices) {
    return await specialDevices[entityId]["handler"](entityId, command, data);
  }

  let domain = getDomain(entityId);
  let service = commandAlexaToHome(command);
  data = Object.keys(data).length ? data : {entity_id: entityId};

  let res = await util.callApi('services/' + domain + '/' + service, 'POST', data);
  let state = commandToState(command);

  return state;
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

async function getDeviceState(entityId) {
  let res = await util.callApi('states/' + entityId);
  let state = stateHomeToAlexa(res.state);

  return state;
}

/**
 * Send OAuth2 token
 * Uses a NodeRED handler on the receiving end
 *
 * @param{Object} payload
 */
async function sendToken(payload) {
  try {
    let res = await util.callApi('token', 'POST', payload);
    console.log("Successfully sent token", res.data);
  } catch (e) {
    console.log("Error caught: ", e);
  }
}

module.exports = {
  sendToken: sendToken,
  discover: discover,
  setDeviceState: setDeviceState,
  getDeviceState: getDeviceState
}
