/**
 *
 * Created by yin on 7/17/15.
 */

var mysql = require('mysql');
var config = require('../config');

var pool  = mysql.createPool(
    config.mysqlConfig
);

exports.getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        if (err)
            console.error('CAO! Error on getting connection. ');
        callback(err, connection);
    });
}
