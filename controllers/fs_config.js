'use strict';

var debug = require('debug')('e-agent:fs_config');
var fs = require('fs');

class fs_config {
    static parse(path) {
        return JSON.parse(fs.readFileSync(path, 'utf-8'));
    };

    static write(path, conf) {
        fs.writeFileSync(path, JSON.stringify(conf), 'utf-8');
    };
}

module.exports = fs_config;
