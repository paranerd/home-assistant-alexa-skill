const util = require('../util');

async function setDeviceState(entityId, command, payload) {
  // Set defaults
  let domain = 'remote';
  let service = 'send_command';
  let device = '69043881';
  let commands = [];

  switch (command) {
    case 'TurnOn':
      commands.push("PowerOn");
      break;

    case 'TurnOff':
      commands.push("PowerOff");
      break;

    case 'AdjustVolume':
      let count = payload.volumeDefault ? 1 : Math.abs(payload.volume);
      let commandTmp = payload.volume < 0 ? 'VolumeDown' : 'VolumeUp';
      device = '69043882';
      commands = Array(count).fill(commandTmp);
      break;

    case 'SetMute':
      device = '69043882';
      commands = ['Mute'];
      break;

    case 'ChangeChannel':
      let channel = payload.channel.number;
      commands = commands.concat(payload.channel.number.split(""));
      commands.push("Select");
      break;
  }

  let data = {entity_id: entityId, device: device, command: commands};

  let res = await util.callApi('services/' + domain + '/' + service, 'POST', data);
  return res;
}

module.exports = {
  setDeviceState: setDeviceState
}
