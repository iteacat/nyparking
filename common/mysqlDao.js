/**
 *
 * Created by yin on 7/17/15.
 */

var mysql = require('mysql');
var config = require('../config');
var logger = require('../common/logger');

var pool  = mysql.createPool(
    config.mysqlConfig
);

exports.getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        if (err)
            logger.error('CAO! Error on getting connection. ');
        callback(err, connection);
    });
}
