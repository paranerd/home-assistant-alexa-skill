const fs = require('fs');
const util = require('../util');
const logger = require('../logger');

// Read config
const config = JSON.parse(fs.readFileSync(__dirname + '/../config/config.json'));

// Set network info
const API_URL = config.apiUrl;
const HEADERS = {
  'Authorization': 'Bearer ' + config.token,
  'Content-Type': 'application/json'
};

/**
 * Handle TV set state request
 *
 * @param {string} entityId
 * @param {string} command
 * @param {Object} payload
 */
async function setDeviceState(entityId, command, payload = {}) {
    entityId = "remote.living_room";

    // Set defaults
    let domain = 'remote';
    let service = 'send_command';
    let device;
    let activity;
    let commands = [];
    let forcedResponse;

    switch (command) {
        case 'TurnOn':
            activity = '44073790';
            service = util.commandAlexaToHome(command);
            forcedResponse = "ON";
            break;

        case 'TurnOff':
            activity = '44073790';
            service = util.commandAlexaToHome(command);
            forcedResponse = "OFF";
            break;

        case 'AdjustVolume':
            device = '69043882';
            let count = payload.volumeDefault ? 1 : Math.abs(payload.volume);
            let commandTmp = payload.volume < 0 ? 'VolumeDown' : 'VolumeUp';
            commands = Array(count).fill(commandTmp);
            break;

        case 'SetMute':
            device = '69043882';
            commands = ['Mute'];
            break;

        case 'ChangeChannel':
            if (payload.channel.number) {
                device = '69043881';
                commands = commands.concat(payload.channel.number.split(""));
                commands.push("Select");
                forcedResponse = payload.channel.number;
            }
            else if (payload.channelMetadata.name) {
                domain = "script";
                service = "turn_on";
                channel = payload.channelMetadata.name.toLowerCase().replace(/[^\w]/, "");
                entityId = "script.tv_channel_" + channel;
            }

            break;

        case 'SkipChannels':
            device = '69043881';
            commands = payload.channelCount > 0 ? ['ChannelUp'] : ['ChannelDown'];
            forcedResponse = "1";
            break;

        case 'SelectInput':
            device = '69043881';
            switch (payload.input) {
                case 'HDMI 1':
                    commands.push('InputHdmi1');
                    break;

                case 'HDMI 2':
                    commands.push('InputHdmi2');
                    break;

                default:
                    commands.push('InputTv');
            }

            commands.push('Select');

            forcedResponse = payload.input;
            break;

        case 'Play':
        case 'Pause':
        case 'Stop':
            entityId = 'media_player.chromecast_tv';
            domain = 'media_player';
            service = util.commandAlexaToHome(command);
            break;
    }

    // Build data
    let data = {entity_id: entityId};

    // Set commands
    if (commands.length) {
        data = Object.assign({command: commands}, data);
    }

    // Set activity
    if (activity) {
        data = Object.assign({activity: activity}, data);
    }
    // Set device
    else if (device) {
        data = Object.assign({device: device}, data);
    }
    // Set entity ID
    else if (entityId) {
        data = Object.assign({entity_id: entityId});
    }

    // Call API
    let apiRes = await util.post(API_URL, 'services/' + domain + '/' + service, data, HEADERS);

    return forcedResponse ? forcedResponse : apiRes;
}

module.exports = {
  setDeviceState: setDeviceState
}
