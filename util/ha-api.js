/* eslint-disable no-use-before-define */
const fs = require('fs');
const http = require('./http');

const capabilities = JSON.parse(fs.readFileSync('config/capabilities.json'));
const specialDevices = fs.existsSync('config/special_devices.json')
  ? JSON.parse(fs.readFileSync('config/special_devices.json'))
  : {};

const { API_URL } = process.env;
const HEADERS = {
  Authorization: `Bearer ${process.env.API_TOKEN}`,
  'Content-Type': 'application/json',
};

/**
 * Get domain from entity ID.
 *
 * @param {string} entityId
 * @returns {string}
 */
function getDomain(entityId) {
  const domain = entityId.split('.')[0];

  if (domain === 'group') {
    return 'homeassistant';
  }

  return domain;
}

/**
 * Translate Alexa command to HA command.
 *
 * @param {string} domain
 * @param {string} command
 * @returns {string}
 */
function commandAlexaToHome(domain, command) {
  switch (command) {
    case 'TurnOn':
      return domain === 'input_button' ? 'press' : 'turn_on';

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

/**
 * Translate HA state into Alexa state.
 *
 * @param {string} state
 * @returns {string}
 */
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

/**
 * Translate Alexa command to Alexa state.
 *
 * @param {string} command
 * @returns {string}
 */
function commandToState(command) {
  switch (command) {
    case 'TurnOn':
      return 'on';

    case 'TurnOff':
      return 'off';

    default:
      return '';
  }
}

/**
 * Handle device discovery.
 *
 * @return {Object}
 */
async function discover() {
  const entities = await http.get(API_URL, 'states', {}, HEADERS);
  const endpoints = [];

  const includePattern = process.env.INCLUDE_PATTERN
    ? new RegExp(process.env.INCLUDE_PATTERN)
    : null;
  const excludePattern = process.env.EXCLUDE_PATTERN
    ? new RegExp(process.env.EXCLUDE_PATTERN)
    : null;

  entities.forEach((entity) => {
    if (
      !includePattern ||
      (includePattern.test(entity.entity_id) &&
        (!excludePattern || !excludePattern.test(entity.entity_id)))
    ) {
      if (entity.entity_id in specialDevices) {
        endpoints.push(buildEndpoint(entity, specialDevices[entity.entity_id]));
      } else {
        endpoints.push(buildEndpoint(entity));
      }
    }
  });

  /* for (const entity of entities) {
    if (
      !includePattern ||
      (includePattern.test(entity.entity_id) &&
        (!excludePattern || !excludePattern.test(entity.entity_id)))
    ) {
      if (entity.entity_id in specialDevices) {
        endpoints.push(buildEndpoint(entity, specialDevices[entity.entity_id]));
      } else {
        endpoints.push(buildEndpoint(entity));
      }
    }
  } */

  return { endpoints };
}

/**
 * Build an Alexa interpretable endpoint.
 *
 * @param {Object} entity
 * @param {Object} deviceConfig
 * @return {Object}
 */
function buildEndpoint(entity, deviceConfig) {
  const domain = entity.entity_id.split('.')[0];
  let entityCategories = [];
  let entityCapabilities = [capabilities.base];
  let friendlyName = entity.attributes.friendly_name;
  const description = friendlyName;

  if (deviceConfig) {
    friendlyName =
      friendlyName in deviceConfig ? deviceConfig.friendlyName : friendlyName;
    entityCategories = entityCategories.concat(deviceConfig.categories);
    entityCapabilities = entityCapabilities.concat(
      deviceConfig.capabilities.map((x) => capabilities[x])
    );
  } else if (domain === 'light') {
    entityCategories.push('LIGHT');
    entityCapabilities.push(capabilities.power);
  } else if (domain === 'media_player') {
    entityCategories.push('STREAMING_DEVICE');
    entityCapabilities.push(capabilities.power);
    entityCapabilities.push(capabilities.playback);
    entityCapabilities.push(capabilities.volume);
  } else if (domain === 'scene') {
    entityCategories.push('ACTIVITY_TRIGGER');
    entityCapabilities.push(capabilities.scene);
  } else if (domain === 'input_button') {
    entityCategories.push('SWITCH');
    entityCapabilities.push(capabilities.power);
  } else {
    entityCategories.push('SWITCH');
    entityCapabilities.push(capabilities.power);
  }

  return {
    endpointId: entity.entity_id,
    manufacturerName: process.env.MANUFACTURER,
    friendlyName,
    description,
    displayCategories: entityCategories,
    capabilities: entityCapabilities,
  };
}

/**
 * Set device state.
 *
 * @param {Object} request Alexa directive
 * @return {mixed}
 */
async function setDeviceState(request) {
  const entityId = request.directive.endpoint.endpointId;
  const domain = getDomain(request.directive.endpoint.endpointId);
  const command = request.directive.header.name;
  const service = commandAlexaToHome(domain, command);
  let data = request.directive.payload;
  data = Object.keys(data).length ? data : { entity_id: entityId };

  // Special devices
  if (entityId in specialDevices && specialDevices[entityId].handler) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const device = require(`./special_devices/${specialDevices[entityId].handler}`);
    return device.setDeviceState(entityId, command, data);
  }

  await http.post(API_URL, `services/${domain}/${service}`, data, HEADERS);
  const state = commandToState(command);

  return state;
}

/**
 * Get device state.
 *
 * @param {string} entityId
 * @return {mixed}
 */
async function getDeviceState(entityId) {
  const res = await http.get(API_URL, `states/${entityId}`, {}, HEADERS);
  const state = stateHomeToAlexa(res.state);

  return state;
}

/**
 * Send OAuth2 token.
 * Uses a NodeRED handler on the receiving end.
 *
 * @param {Object} payload
 */
async function sendToken(payload) {
  try {
    const res = await http.post(API_URL, 'token', payload, HEADERS);
    console.log('Successfully sent token', res.data);
  } catch (e) {
    console.log('Error caught: ', e);
  }
}

module.exports = {
  sendToken,
  discover,
  setDeviceState,
  getDeviceState,
  commandAlexaToHome,
  stateHomeToAlexa,
  commandToState,
  getDomain,
};
