/**
 * Created by yin on 7/17/15.
 */

var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var config = require('../config/index');
var db;

var getDb = function (cb) {
    if (db)
        return cb(null, db);

    MongoClient.connect(config.mongoDbConfig.baseUrl,
        {
            db: {},
            server: {
                poolSize: config.mongoDbConfig.poolSize,
                auto_reconnect: config.mongoDbConfig.autoReconnect
            },
            replSet: {},
            mongos: {}
        },
        function (err, database) {
            assert.equal(err, null, 'mongodb returns error: ' + err);
            db = database;
            return cb(err, db)
        });
};

module.exports = {
    getDb: getDb
};
