/**
 *
 * Created by yin on 5/11/15.
 */

module.exports = {
    appName: 'nyparking'

    ,mysqlConfig: {
        host: 'cat1ny.ch67iaxvc4uj.us-east-1.rds.amazonaws.com',
        user: 'iteacat',
        password: 'ChafNod9',
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
        port: 80
    }

    ,isDebug: false

    ,logPath: process.cwd() + '/'
};