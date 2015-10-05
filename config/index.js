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

    ,nyparkingCollection: 'nyparking_signs'
};

var config= _.merge(
    all,
    require('./' + process.env.NODE_ENV + '.js') || {}
);

module.exports = config;
