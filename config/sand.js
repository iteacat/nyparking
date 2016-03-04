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

    ,mongoDbConfig: {
        baseUrl: 'mongodb://localhost:27017/cat1ny?',
        poolSize: 100,
        autoReconnect: true
    }

    ,appConfig: {
        port: 3000
    }

    ,isDebug: true

    ,logPath: './'
};
