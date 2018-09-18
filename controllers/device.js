'use strict';

var utils = require('../utils/utils');

class device {
    constructor(config) {
        Object.assign(this, {
            device_id: utils.generate_key('xyxyxyxyxyxy'),
            name: 'Flower care',
            firmware_version: '0.0.1',
            battery_level: null,
            measures: []
        }, config);
    }
}

module.exports = device;