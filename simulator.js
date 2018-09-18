
var Debug = require('debug');
var debug;

var fs_config = require('./controllers/fs_config');
var broker = require('mqtt');

debug = Debug('e-agent:simulator');

debug("Running...");

var config = fs_config.parse('config.ini');

debug("Load config : %O", config);

debug('Connecting to MQTT.');
server = broker.connect('ws://'+ config.mqtt.ip_address +':'+ config.mqtt.port);

server.on('connect', function () {
    debug('MQTT server connected to broker.');
    debug('Subscribe to %s', config.mqtt.subscribe_topic);
    server.subscribe(config.mqtt.subscribe_topic);
    server.publish(config.mqtt.subscribe_topic, JSON.stringify({event: 'core_connected', data: {}}));
});


var blink_device = function(rasp_id, device_id){
    server.publish(config.mqtt.push_topic + rasp_id, JSON.stringify({event: 'blink', data: device_id}));
};

var connect_device = function(rasp_id, device_id){
    server.publish(config.mqtt.push_topic + rasp_id, JSON.stringify({event: 'connect', data: device_id}));
};

var first_device = true;
server.on('message', function(topic, message){
    var json = JSON.parse(message);
    debug('Receive message from %s: %O', topic, json);
    if(topic === config.mqtt.subscribe_topic) {
        switch (json.event) {
            case 'subscribe':
                setTimeout(function () {
                    debug("Pushing Scan event to %s", config.mqtt.push_topic + json.data.serial);
                    server.subscribe(config.mqtt.push_topic + json.data.serial);
                    server.publish(config.mqtt.push_topic + json.data.serial, JSON.stringify({event: 'scan'}));
                    first_device = true;
                }, 5000);
                break;
        }
    }else if(topic.startsWith('sensors/')){
        var rasp_id = topic.split("/")[1];
        switch(json.event){
            case 'discover':
                if(json.data.name === "Flower care") {
                    if(rasp_id == "b827eba42bd2"){
                        if(json.data.id == "c47c8d65ff20") {
                            setTimeout(function () {
                                blink_device(rasp_id, "c47c8d65ff20");
                                setTimeout(function () {
                                    connect_device(rasp_id, "c47c8d65ff20");
                                }, 40000);
                            }, 10000);
                        }
                    }else {
                        if(json.data.id == "c47c8d660183") {
                            setTimeout(function () {
                                blink_device(rasp_id, "c47c8d660183");
                                setTimeout(function () {
                                    connect_device(rasp_id, "c47c8d660183");
                                }, 50000);
                            }, 10000);
                        }else if(json.data.id == "c47c8d660128") {
                            setTimeout(function () {
                                blink_device(rasp_id, "c47c8d660128");
                                setTimeout(function () {
                                    connect_device(rasp_id, "c47c8d660128");
                                }, 60000);
                            }, 100000);
                        }
                    }
                }
                break;
            case 'measures':
                // TODO: Send to elasticsearch <- device;
                break;
        }
    }
});