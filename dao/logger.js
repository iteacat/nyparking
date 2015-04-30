/**
 * Created by yin on 4/29/15.
 */

var bunyan = require("bunyan"); // Bunyan dependency


var logger = bunyan.createLogger({
    name: 'nyparking',
    streams: [
        {
            type: 'rotating-file',
            level: 'info',
            path: './log/application.log',  // log INFO and above to a file
            peroid: '1d',
            count: 7
        }
    ]
});

module.exports = logger;