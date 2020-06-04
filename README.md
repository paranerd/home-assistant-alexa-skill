# Home Assistant Alexa Smart Home Skill
This skill provides an interface between the Home Assistant REST API and Alexa

# Setup
## Install the SDK
Follow [this tutorial](https://docs.aws.amazon.com/de_de/cli/latest/userguide/install-cliv2-linux.html)

## Complete config
- apiUrl: Url to your Home Assistant API
- token: [Long Lived Access Token](https://www.home-assistant.io/docs/authentication/#your-account-profile)
- loggerUrl: (optional) For example a NodeRED endpoint to get instant logging instead - of having to wait for cloud logging to reload
- loggerAuth: (optional) For Basic Auth of your logger endpoint
- manufacturer: The manufacturer to be displayed in the Alexa App
- discoveryPatterns: Regex patterns to filter which Home Assistant devices are discovered

# Deploy
## First time
`zip -x "*out*" -x "*.git*" -r lambda.zip . && aws lambda update-function-code --function-name <name-of-your-lambda-function> --zip-file fileb://lambda.zip`

## Subsequent times
`zip -x "*node_modules*" -x "*out*" -x "*.git*" -r lambda.zip . && aws lambda update-function-code --function-name <name-of-your-lambda-function> --zip-file fileb://lambda.zip`

# Special Devices
To add custom behavior you can add special devices.  
That way you can for example make a switch control a TV.  

Adding special devices requires an entry in the special_devices.json as well as a handler file in the special_devices/ directory.

## Special Devices config
- categories: Alexa [display categories](https://developer.amazon.com/de-DE/docs/alexa/device-apis/alexa-discovery.html#display-categories)
- capabilities: Alexa [capability interfaces](https://developer.amazon.com/de-DE/docs/alexa/device-apis/list-of-interfaces.html)
  currently supported:
  1. playback
  2. volume
  3. power
  4. channel
  5. scene
  6. input
- handler: name of the handler file in special_devices/
