'use strict';

var broker = require('mqtt');
var debug = require('debug')('e-agent:mqtt');
var EventEmitter = require("events").EventEmitter;
var fs_config = require('./fs_config');

class mqtt extends EventEmitter{
    constructor(config) {
        super();
        var me = this;
        Object.assign(this, {
            serial: null,
            ip_address: 'localhost',
            port: 1883,
            push_topic: 'sensors/mesures',// +/serial
            subscribe_topic: 'init/default', // 1er
        }, config);

        this.connect(me.ip_address, me.port);

        this.client.on('connect', function () {
            me.subscribe({
                serial: me.serial,
                time: new Date()
            }, function () {
                debug('Connected with Serial: '+ me.serial);
                me.client.subscribe(me.push_topic);
                me.client.subscribe(me.subscribe_topic);
            });
        });

        this.client.on('message', function (topic, message) {
            var json = JSON.parse(message);
            if(topic == 'init/default'){
                if(json.event == 'core_connected'){
                    me.client.end(true, function(){
                        me.client.reconnect();
                    });
                }
            }else if(topic == me.push_topic){
                if(json.event == 'configure'){
                    fs_config.write("../config.ini", json.data);
                }else if(json.event == 'scan'){
                    me.emit('scan', json.data);
                }else if(json.event == 'connect'){
                    me.emit('connect', json.data);
                }else if(json.event == 'blink'){
                    me.emit('blink', json.data);
                }
            }
        });
    }

    connect(ip, port){
        this.client = broker.connect('ws://'+ ip +':'+ port);
    }

    push(data, callback) {
        this.client.publish(this.push_topic, JSON.stringify(data), function(result){
            if(callback)
                callback(result);
        });
    }

    subscribe(data, callback) {
        this.client.publish(this.subscribe_topic, JSON.stringify({serial: this.serial, event: 'subscribe', data: data}), callback);
    }
}

module.exports = mqtt;
