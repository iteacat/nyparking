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

    ,appConfig: {
        port: 80
    }
};