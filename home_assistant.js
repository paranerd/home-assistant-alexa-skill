const fs = require('fs');
const util = require('./util');
const logger = require('./logger');

const config = JSON.parse(fs.readFileSync('config/config.json'));
const capabilities = JSON.parse(fs.readFileSync('config/capabilities.json'));
const specialDevices = JSON.parse(fs.readFileSync('config/special_devices.json'));

const API_URL = config.apiUrl;
const HEADERS = {
  'Authorization': 'Bearer ' + config.token,
  'Content-Type': 'application/json'
};

/**
 * Handle device discovery
 *
 * @return {Object}
 */
async function discover() {
  let entities = await util.get(API_URL, 'states', {}, HEADERS);
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

/**
 * Build an Alexa interpretable endpoint
 *
 * @param {Object} entity
 * @param {Object} deviceConfig
 *
 * @return {Object}
 */
function buildEndpoint(entity, deviceConfig) {
  let domain = entity.entity_id.split(".")[0];
  let entityCategories = [];
  let entityCapabilities = [capabilities.base];
  let friendlyName = entity.attributes.friendly_name;
  let description = friendlyName;

  if (deviceConfig) {
    friendlyName = (friendlyName in deviceConfig) ? deviceConfig["friendlyName"] : friendlyName;
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
  else if (domain == 'scene') {
      entityCategories.push("ACTIVITY_TRIGGER");
      entityCapabilities.push(capabilities.scene);
  }
  else {
    entityCategories.push("SWITCH");
    entityCapabilities.push(capabilities.power);
  }

  return {
    "endpointId": entity.entity_id,
    "manufacturerName": config.manufacturer,
    "friendlyName": friendlyName,
    "description": description,
    "displayCategories": entityCategories,
    "capabilities": entityCapabilities
  }
}

/**
 * Set device state
 *
 * @param {Object} request Alexa directive
 *
 * @return {mixed}
 */
async function setDeviceState(request) {
    let entityId = request.directive.endpoint.endpointId;
    let domain = util.getDomain(request.directive.endpoint.endpointId);
    let command = request.directive.header.name;
    let service = util.commandAlexaToHome(command);
    let data = request.directive.payload;
    data = Object.keys(data).length ? data : {entity_id: entityId};

    // Special devices
    if (entityId in specialDevices && specialDevices[entityId]["handler"]) {
        const device = require('./special_devices/' + specialDevices[entityId]["handler"]);
        return await device.setDeviceState(entityId, command, data);
    }

    let res = await util.post(API_URL, 'services/' + domain + '/' + service, data, HEADERS);
    let state = util.commandToState(command);

    return state;
}

/**
 * Get device state
 *
 * @param {string} entityId
 *
 * @return {mixed}
 */
async function getDeviceState(entityId) {
  let res = await util.get(API_URL, 'states/' + entityId, {}, HEADERS);
  let state = util.stateHomeToAlexa(res.state);

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
    let res = await util.post(API_URL, 'token', payload, HEADERS);
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
