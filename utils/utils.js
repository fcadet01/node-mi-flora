var debug = require('debug')('e-agent:utils');

var utils = {};

utils.generate_key = function (str) {
    var d = new Date();

    if(!str)
        str = 'xxxxxxxx-xxxx-42xx-yxxx-xxxxxxxxxxxx';

    return str.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

utils.obj_to_sql = function (objects) {
    var data = [],
        first = true;
    var sql = '';
    for (var obj in objects) {
        if(first) {
            sql += ' WHERE';
            first = false;
        }
        if(objects[obj] != null) {
            sql += ' ' + obj + '=? AND';
            data.push(objects[obj]);
        }
    }
    sql = sql.substr(0, sql.length-4);
    sql += ';';

    return {sql: sql, data: data};
};

utils.get_mac = function(){
    var res = null;

    var net = require('os').networkInterfaces();
    Object.keys(net).forEach(function(key){
        if(key != 'lo'){
            net[key].forEach(function(status){
                if(status.mac != null && res == null)
                    res = status.mac;
            });
        }
    });
    return res;
};

module.exports = utils;