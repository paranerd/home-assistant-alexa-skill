const homeAssistant = require('./home_assistant');

exports.handler = async (request, context) => {
    console.log("DEBUG | ", "Request | ", request);

    if (request.directive.header.namespace === 'Alexa.Discovery' && request.directive.header.name === 'Discover') {
        await handleDiscovery(request, context);
    }
    else if (request.directive.header.namespace === 'Alexa.Authorization') {
        if (['AcceptGrant'].includes(request.directive.header.name)) {
            await handleAcceptGrant(request, context);
        }
    }
    else if (request.directive.header.namespace === 'Alexa.PowerController') {
        if (['TurnOn', 'TurnOff'].includes(request.directive.header.name)) {
            await handlePowerControl(request, context);
        }
    }
    else if (request.directive.header.namespace === 'Alexa.PlaybackController') {
        await handlePlaybackControl(request, context);
    }
    else if (request.directive.header.namespace === 'Alexa') {
        if (['ReportState'].includes(request.directive.header.name)) {
            await handleReportState(request, context);
        }
    }
    else if (request.directive.header.namespace === 'Alexa.ChannelController') {
        if (['ChangeChannel', 'SkipChannels'].includes(request.directive.header.name)) {
            await handleChangeChannel(request, context);
        }
    }
    else if (request.directive.header.namespace === 'Alexa.Speaker') {
        if (['AdjustVolume', 'SetVolume', 'SetMute'].includes(request.directive.header.name)) {
            await handleVolumeControl(request, context);
        }
    }
    else if (request.directive.header.namespace === 'Alexa.SceneController') {
        if (['Activate'].includes(request.directive.header.name)) {
            await handleSceneControl(request, context);
        }
    }
    else if (request.directive.header.namespace === 'Alexa.InputController') {
        if (['SelectInput'].includes(request.directive.header.name)) {
            await handleInputSelect(request, context);
        }
    }
    else {
        console.log("Unhandled", JSON.stringify(request));
    }

    async function handleAcceptGrant(request, context) {
        await homeAssistant.sendToken(request);

        let header = request.directive.header;
        header.name = "AcceptGrant.Response";
        context.succeed({ event: { header: header, payload: {} } });
    }

    async function handleDiscovery(request, context) {
        let payload = await homeAssistant.discover();

        let header = request.directive.header;
        header.name = "Discover.Response";
        context.succeed({ event: { header: header, payload: payload } });
    }

    async function handlePowerControl(request, context) {
        // Calling device cloud
        let state = await homeAssistant.setDeviceState(request);

        let contextResult = {
            "properties": [{
                "namespace": "Alexa.PowerController",
                "name": "powerState",
                "value": state,
                "timeOfSample": "2017-09-03T16:20:50.52Z",
                "uncertaintyInMilliseconds": 50
            }]
        };

        let response = buildResponse(request, contextResult);
        context.succeed(response);
    }

    async function handlePlaybackControl(request, context) {
        // Set device
        await homeAssistant.setDeviceState(request);

        let contextResult = {
            "properties": [{
                "namespace": "Alexa.EndpointHealth",
                "name": "connectivity",
                "value": {
                    "value": "OK"
                },
                "timeOfSample": "2017-09-03T16:20:50.52Z", //retrieve from result.
                "uncertaintyInMilliseconds": 50
            }]
        };

        let response = buildResponse(request, contextResult);
        context.succeed(response);
    }

    async function handleChangeChannel(request, context) {
        // Get device state
        let channel = await homeAssistant.setDeviceState(request);

        // Build context
        let contextResult = {
            "properties": [
                {
                    "namespace": "Alexa.ChannelController",
                    "name": "channel",
                    "value": {
                        "number": channel
                    },
                    "timeOfSample": "2017-02-03T16:20:50.52Z",
                    "uncertaintyInMilliseconds": 0
                },
                {
                    "namespace": "Alexa.PowerController",
                    "name": "powerState",
                    "value": "ON",
                    "timeOfSample": "2017-02-03T16:20:50.52Z",
                    "uncertaintyInMilliseconds": 500
                }
            ]
        };

        let response = buildResponse(request, contextResult);
        context.succeed(response);
    }

    async function handleVolumeControl(request, context) {
        // Set device
        await homeAssistant.setDeviceState(request);

        // Build context
        let contextResult = {
            "properties": [
                {
                    "namespace": "Alexa.Speaker",
                    "name": "volume",
                    "value": 50,
                    "timeOfSample": "2017-02-03T16:20:50.52Z",
                    "uncertaintyInMilliseconds": 0
                },
                {
                    "namespace": "Alexa.Speaker",
                    "name": "muted",
                    "value": false,
                    "timeOfSample": "2017-02-03T16:20:50.52Z",
                    "uncertaintyInMilliseconds": 0
                },
                {
                    "namespace": "Alexa.PowerController",
                    "name": "powerState",
                    "value": "ON",
                    "timeOfSample": "2017-02-03T16:20:50.52Z",
                    "uncertaintyInMilliseconds": 500
                }
            ]
        };

        let response = buildResponse(request, contextResult);
        context.succeed(response);
    }

    async function handleSceneControl(request, context) {
        // Set device
        await homeAssistant.setDeviceState(request);

        let payload = {

        }

        let response = buildResponse(request, {}, "Alexa", "Alexa.SceneController", "ActivationStarted", payload);
        context.succeed(response);
    }

    async function handleInputSelect(request, context) {
        // Calling device cloud
        let input = await homeAssistant.setDeviceState(request);

        let contextResult = {
            "properties": [{
                "namespace": "Alexa.InputController",
                "name": "input",
                "value": input,
                "timeOfSample": "2017-09-03T16:20:50.52Z",
                "uncertaintyInMilliseconds": 50
            }]
        };

        let response = buildResponse(request, contextResult);
        context.succeed(response);
    }

    async function handleReportState(request, context) {
        // Get device state
        let state = await homeAssistant.getDeviceState(request.directive.endpoint.endpointId);

        // Build context
        let contextResult = {
            "properties": [{
                "namespace": "Alexa.PowerController",
                "name": "powerState",
                "value": state,
                "timeOfSample": "2017-09-03T16:20:50.52Z",
                "uncertaintyInMilliseconds": 50
            }]
        };

        let response = buildResponse(request, contextResult, "Alexa", "StateReport");
        context.succeed(response);
    }

    function buildResponse(request, contextResult, namespace = "Alexa", responseName = "Response", payload = {}) {
        let responseHeader = request.directive.header;
        responseHeader.namespace = namespace;
        responseHeader.name = responseName;
        responseHeader.messageId = responseHeader.messageId + "-R";

        let response = {
            context: contextResult,
            event: {
                header: responseHeader,
                endpoint: {
                    scope: {
                        type: "BearerToken",
                        token: request.directive.endpoint.scope.token
                    },
                    endpointId: request.directive.endpoint.endpointId
                },
                payload: payload
            }
        };

        console.log("DEBUG | ", "Response |  ", JSON.stringify(response));

        return response;
    }
};
