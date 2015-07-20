var _ = require('lodash');
var path = require('path');

var all = {
    appName: 'simpleEtl'

    ,mysqlConfig: {
        port: '3306',
        database: 'cat1ny',
        connectionLimit : 50,
        multipleStatements : true
    }

    ,mongoDbConfig: {
        baseUrl: 'mongodb://localhost:27017/cat1ny?',
        poolSize: 100,
        autoReconnect: true
    }

    ,nyparkingCollection: 'nyparking_signs'
};

var config= _.merge(
    all,
    require('./' + process.env.NODE_ENV + '.js') || {}
);

module.exports = config;
