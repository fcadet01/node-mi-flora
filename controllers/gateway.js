'use strict';


var Bluetooth = require('./bluetooth');
var Broker = require('./mqtt');
var Device = require('./device');
var debug = require('debug')('e-agent:gateway');
var util = require("util");
var utils = require("../utils/utils");
var EventEmitter = require("events").EventEmitter;

class gateway extends EventEmitter{
    constructor(config) {
        super();
        var me = this;

        var serial = config.gateway.serial || utils.get_mac().replace(/:/g, "");

        Object.assign(this, {
            serial: serial,
            /**
             * scan_interval (int): the interval in second to get new data from devices.
             */
            scan_interval: 15,
            /**
             * push_interval (int): the interval in second to send new data to remote server.
             */
            push_interval: 15,

            mqtt: new Broker({
                parent: me,
                serial: serial,
		        ip_address: config.mqtt.ip_address,
                port: config.mqtt.port,
                subscribe_topic: 'init/default',
                push_topic: 'sensors/'+ serial
            }),

            ble: new Bluetooth({
                parent: me
            }),

            /**
             * devices (Array): This array will contain all devices connected to the gateway.
             */
            devices: []

        }, config.gateway);

        debug('Enabled on serial: '+ this.serial);

        this.ble.on('data', function (data) {
            debug('Recieve form %s : %O', data.device_id, data);

            var device = me.devices[data.device_id];
            if(device) {
                Object.assign(device, {
                    battery_level: data.battery_level,
                    firmware_version: data.firmware_version,
                });
                device.measures.push(data.measure);
            }
        });

        this.mqtt.on('scan', function() {
            me.ble.search(function (data) {
                var device = {
                    id: data.id,
                    mac: data.address,
                    name: data.advertisement.localName
                };

                if(data.connectable) {
                    debug('New devices found: '+ data.id);

                    me.mqtt.push({
                        serial: me.serial,
                        event: "discover",
                        data: device
                    });
                }
            });
        });

        this.mqtt.on('connect', function(data){
            me.ble.connect(data, function(data){
                if(data != null) {
                    var device = me.devices[data.device_id];
                    if(!device) {
                        me.devices[data.device_id] = new Device({
                            device_id: data.device_id,
                            name: data.name
                        });
                    }
                }
            });
        });

        this.mqtt.on('blink', function (data) {
            me.ble.blink(data);
        });


        this.on('push', function (data) {
            var res = [];

            data.forEach(function(device){
                if(device.measures.length != 0)
                    res.push(device);
            });

            if(res.length != 0){
                me.mqtt.push({
                    serial: this.serial,
                    event: "measures",
                    data: Object.values(res)
                }, function () {
                    data.forEach(function (device) {
                        device.measures.splice(0, device.measures.length);
                    });
                });
            }
        });
    }

    start(){
        debug('Started !! %d', this.push_interval);
        this.ble.start_scan(this.scan_interval);

        setInterval(function(gw) {
            gw.emit('push', Object.values(gw.devices));
        }, this.push_interval * 1000, this);
    }
}

module.exports = gateway;
