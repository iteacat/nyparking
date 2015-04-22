/**
 *
 * Created by yin on 4/21/15.
 */

var mysql = require('mysql');

exports.dbConfig = {
    host: 'cat1ny.ch67iaxvc4uj.us-east-1.rds.amazonaws.com',
    user: 'iteacat',
    password: 'ChafNod9',
    port: '3306',
    database: 'cat1ny',
    connectionLimit : 50,
    multipleStatements : true
};

exports.dbConfigDev = {
    host: '192.168.56.101',
    user: 'root',
    password: null,
    port: '3306',
    database: 'cat1ny',
    connectionLimit : 50,
    multipleStatements : true
};

var pool  = mysql.createPool(
    process.argv[2] === '80' ? this.dbConfig : this.dbConfigDev
);

exports.getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        if (err)
            console.error('CAO! Error on getting connection. ');
        callback(err, connection);
    });
}
