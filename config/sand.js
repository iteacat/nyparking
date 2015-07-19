/**
 *
 * Created by yin on 5/11/15.
 */

module.exports = {
    appName: 'simpleEtlSand',

    mysqlConfig: {
        host: 'localhost',
        user: 'root',
        password: null,
        port: '3306',
        database: 'cat1ny',
        connectionLimit : 50,
        multipleStatements : true
    }
};
