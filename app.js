var debug = require('debug')('e-agent:app');

/* User defined libraries */
var conf = require('./controllers/fs_config');

class app{

    static run() {

        var file = 'config.ini';

        var Gateway = require('./controllers/gateway');

        var config = conf.parse(file);

        debug('Application Started !!');

        var gateway = new Gateway(config);
        gateway.start();
    }
}

module.exports = app;
