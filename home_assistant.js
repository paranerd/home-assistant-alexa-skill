const fs = require('fs');
const util = require('./util');

const config = JSON.parse(fs.readFileSync('config/config.json'));
const capabilities = JSON.parse(fs.readFileSync('config/capabilities.json'));
const specialDevices = JSON.parse(fs.readFileSync('config/special_devices.json'));

const API_URL = process.env.API_URL;
const HEADERS = {
  'Authorization': 'Bearer ' + process.env.API_TOKEN,
  'Content-Type': 'application/json'
};

/**
 * Handle device discovery
 *
 * @return {Object}
 */
async function discover() {
  const entities = await util.get(API_URL, 'states', {}, HEADERS);
  const endpoints = [];

  const devicesByPattern = new RegExp("^(" + config.discoveryPatterns.join("|") + ")");

  for (const entity of entities) {
    if (devicesByPattern.test(entity.entity_id)) {
      if (entity.entity_id in specialDevices) {
        endpoints.push(buildEndpoint(entity, specialDevices[entity.entity_id]))
      }
      else {
        endpoints.push(buildEndpoint(entity));
      }
    }
  }

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
  const domain = entity.entity_id.split(".")[0];
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
    const entityId = request.directive.endpoint.endpointId;
    const domain = util.getDomain(request.directive.endpoint.endpointId);
    const command = request.directive.header.name;
    const service = util.commandAlexaToHome(command);
    let data = request.directive.payload;
    data = Object.keys(data).length ? data : {entity_id: entityId};

    // Special devices
    if (entityId in specialDevices && specialDevices[entityId]["handler"]) {
        const device = require('./special_devices/' + specialDevices[entityId]["handler"]);
        return await device.setDeviceState(entityId, command, data);
    }

    await util.post(API_URL, 'services/' + domain + '/' + service, data, HEADERS);
    const state = util.commandToState(command);

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
  const res = await util.get(API_URL, 'states/' + entityId, {}, HEADERS);
  const state = util.stateHomeToAlexa(res.state);

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
    const res = await util.post(API_URL, 'token', payload, HEADERS);
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
