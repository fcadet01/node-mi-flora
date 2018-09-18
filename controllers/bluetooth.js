'use strict';

const DEFAULT_DEVICE_NAME = 'Flower care';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);

const SERVICE_UUIDS = [DATA_SERVICE_UUID];
const CHARACTERISTIC_UUIDS = [DATA_CHARACTERISTIC_UUID, FIRMWARE_CHARACTERISTIC_UUID, REALTIME_CHARACTERISTIC_UUID];

var _blink_timer;
var _blink_process;
var _scan_process;
var _scan_interval;
var _retry_process;
var _search_process;
var _device_list = [];
var _try_list = [];
var _iter = 0;

var debug = require('debug')('nocturlab:bluetooth');
var utils = require('../utils/utils');

var noble = require('noble');

var EventEmitter = require("events").EventEmitter;


class ble extends EventEmitter{
    constructor(config) {
        super();

        var me = this;

        Object.assign(this, {
            name: 'ble0',
            mac: noble.address,
            noble: noble,
            devices: [],
            blink_count: 5,
            try_count: 5,
            retry_delay: 10,
            parent: null
        }, config);
        debug('Loaded.');
        this.noble.on('stateChange', function(state) {
            if (state === 'poweredOn') {
                debug('Bluetooth turned on');
                me.noble.startScanning();
            } else {
                debug('Bluetooth turned off');
                me.noble.stopScanning();
            }
        });

        this.noble.on('scanStart', function(){
            debug('Start Scanning');
        });
        this.noble.on('scanStop', function(){
            debug('Stop Scanning');
        });
        this.noble.on('warning', function(warn){
            debug(warn);
        });

    }

    /**
     *  search(): that function launch a search to detect devices at proximities.
     */
    search(callback) {
        var me = this;
        this.stop_scan();
        this.noble.startScanning(null, false, function(){
            _search_process = setTimeout(function(){
                me.noble.stopScanning();
                if(_scan_interval != null)
                    me.start_scan();
            }, 10000);
            if(callback) {
                me.noble.on('discover', function (peripheral) {
                    callback(peripheral);
                });
            }
        });
    }

    _blink(peripheral){
        clearTimeout(_blink_timer);
        peripheral.connect(function(){
            _blink_timer = setTimeout(function() {
                peripheral.disconnect();
            }, 2000);
        });
    };

    blink(device_id){
        var me = this;

        clearInterval(_blink_process);
        clearTimeout(_blink_timer);

        this.stop_scan();
        var peripheral = me.noble._peripherals[device_id];
        if(peripheral) {
            debug("Device %s are blinking", peripheral.id);
            var i = 0;
            _blink_process = setInterval(function(){
                me._blink(peripheral);
                if(i++ >= me.blink_count) {
                    clearInterval(_blink_process);
                    if(_scan_interval != null)
                        me.start_scan();
                }
            }, 2000);
        }
    }

    connect(device_id, callback){
        var me = this;

        this.stop_scan();

        var peripheral = this.noble._peripherals[device_id];

        if(peripheral) {
            debug("Connecting to %s", device_id);
            peripheral.connect(function (error) {
                if (error) {
                    var nb_try = _try_list[device_id];
                    if(nb_try)
                        nb_try++;
                    else
                        nb_try = _try_list[device_id] = 1;
                    if(nb_try <= me.try_count) {
                        _retry_process = setTimeout(function () {
                            me.connect(device_id);
                        }, me.retry_delay*1000);
                    }else{
                        if(_scan_interval != null)
                            me.start_scan();
                        debug("Unable to connect to %s", device_id);
                        me.emit('warning', error);
                    }
                } else {
                    debug("Connected to %s", device_id);
                    me.get_data(peripheral, function(data) {
                        _search_process = setTimeout(function() {
                            peripheral.disconnect();
                            if (!_device_list[device_id]) {
                                _device_list[device_id] = peripheral;
                            }
                            if (callback)
                                callback(data);
                            if (_scan_interval != null)
                                me.start_scan();
                        }, 1000);
                    });
                }
            });
        }else{
            me.emit('warning', new Error('The device was not found. Try rescan to find it.'));
        }
    }

    get_data(peripheral, callback){
        var me = this;
        peripheral.discoverSomeServicesAndCharacteristics(SERVICE_UUIDS, CHARACTERISTIC_UUIDS, function (error, services, characteristics) {
            var device = {
                device_id: peripheral.id,
                name: peripheral.advertisement.localName,
                measure : {
                    time: null
                }
            };
            characteristics.forEach(function (characteristic) {
                var time = {time: Date.now()};
                switch (characteristic.uuid) {
                    case DATA_CHARACTERISTIC_UUID:
                        characteristic.read(function (error, data) {
                            var res = me._parse_data(peripheral, data);
                            Object.assign(device.measure, res, time);
                        });
                        break;
                    case FIRMWARE_CHARACTERISTIC_UUID:
                        characteristic.read(function (error, data) {
                            var res = me._parse_firmware(peripheral, data);
                            Object.assign(device, res);
                        });
                        break;
                    case REALTIME_CHARACTERISTIC_UUID:
                        debug('Enabling realtime on %s', peripheral.id);
                        characteristic.write(REALTIME_META_VALUE, false);
                        break;
                    default:
                        debug('Found characteristic uuid %s but not matched the criteria', characteristic.uuid);
                }
            });
            if(callback)
                callback(device);
        });
    }

    _parse_data(peripheral, data) {
        let temperature = data.readUInt16LE(0) / 10;
        let lux = data.readUInt32LE(3);
        let moisture = data.readUInt16BE(6);
        let fertility = data.readUInt16LE(8);
        return {
            temperature: temperature,
            lux: lux,
            moisture: moisture,
            fertility: fertility
        };
    }

    _parse_firmware(peripheral, data) {
        return {
            battery_level: parseInt(data.toString('hex', 0, 1), 16),
            firmware_version: data.toString('ascii', 2, data.length)
        };
    }

    _scan(){
        var me = this;
        var list = Object.values(_device_list);
        var peripheral = list[_iter++];
        if(peripheral){
            peripheral.connect(function (error) {
                if (error) {
                    me.emit('warning', error);
                    if(_iter < list.length) {
                        me._scan();
                    }
                } else {
                    me.get_data(peripheral, function (data) {
                        _scan_process = setTimeout(function() {
                            peripheral.disconnect(function () {
                                me.emit('data', data);
                                if (_iter < list.length) {
                                    me._scan();
                                }else{
                                    if(_scan_process != null)
                                        me.start_scan();
                                }
                            });
                        }, 1000);
                    });
                }
            });
        }
    };
    start_scan(interval){
        if(interval == null)
            interval = _scan_interval;
        else
            _scan_interval = interval;
        this.stop_scan();

        _scan_process = setTimeout(function(me){
            _iter = 0;
            me._scan();
        }, interval*1000, this);
    }
    stop_scan(){
        clearTimeout(_scan_process);
        _scan_process = null;
        clearTimeout(_retry_process);
        _retry_process = null
        clearTimeout(_search_process);
        _search_process = null
        clearTimeout(_blink_timer);
        _blink_timer = null;
        if(_blink_process) {
            debug("Device stopped blinking");
            clearInterval(_blink_process);
            _blink_process = null;
        }
        this.noble.removeAllListeners('discover');
    }

}

module.exports = ble;
