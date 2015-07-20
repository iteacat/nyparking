/**
 * Created by yin on 4/5/15.
 */

var logger = require('./logger.js');
var mysqlDao = require('../common/mysqlDao');
var mongoDao = require('../common/mongoDao');
var config = require('../config');

var default_radius = 0.003;
var DISTANCE_MULTIPLIER = 3963.2;

var getRadius = function (miles) {
    return miles / DISTANCE_MULTIPLIER;
}

var sql = "set @center=point(?, ?);" +
    " SET @radius = ?; " +
    " SET @bbox = CONCAT('POLYGON((', " +
    " X(@center) - @radius, ' ', Y(@center) - @radius, ',', " +
    " X(@center) + @radius, ' ', Y(@center) - @radius, ',', " +
    " X(@center) + @radius, ' ', Y(@center) + @radius, ',', " +
    " X(@center) - @radius, ' ', Y(@center) + @radius, ',', " +
    " X(@center) - @radius, ' ', Y(@center) - @radius, '))' " +
    " ); " +
    " SELECT " +
    "X(location) as x, Y(location) as y, boro, GROUP_CONCAT(CONCAT(sign_desc, ', ', case arrow when '' then 'BOTH SIDES' else arrow END) SEPARATOR '|') as sign_desc, " +
    "SQRT(POW( ABS( X(location) - X(@center)), 2) + POW( ABS(Y(location) - Y(@center)), 2 )) AS distance " +
    " FROM nyparking_signs " +
    " WHERE Intersects(location, GeomFromText(@bbox) ) " +
    //" AND SQRT(POW( ABS( X(location) - X(@center)), 2) + POW( ABS(Y(location) - Y(@center)), 2 )) < @radius " +
    "GROUP BY location";

function getSigns(x, y, radius, callback) {
    var location = normalizeLocation(x, y, radius);

    mysqlDao.getConnection(function (err, conn) {
        if (err) {
            logger.error('CAO! Error on db connection. Returning null result for getSigns.');
            return [];
        }
        conn.query(sql, [location.x, location.y, location.radius], function (err, rows, fields) {
            conn.release();
            if (err && err.errno !== 1062) {

                console.error('error writing to db ', err);
            }

            var ret;
            if (rows === undefined || rows.length === 0)
                ret = [];
            else
                ret = rows.splice(3)[0];
            callback(ret);
        });
    });
};

var normalizeLocation = function(x, y, radius) {
    if (radius === null)
        radius = default_radius;
    x = x + 0.0025;
    y = y - 0.0025;
    return {
        x: x,
        y: y,
        radius: radius
    };
}

function getSignsWithTime(x, y, radius, callback) {
    var location = normalizeLocation(x, y, radius);

    mongoDao.getDb(function(err, db) {
        if (err) {
            logger.error('Failed to get db: ', location.x, location.y, location.radius, err);
            return callback(err);
        }

        console.log('query: ', location);

        db.collection(config.nyparkingCollection).find(
            {
                loc: {
                    $geoWithin: {
                        $centerSphere: [[location.y, location.x], getRadius(0.03)]
                    }
                }
            }).toArray(function(err, result) {
                if (err)  {
                    logger.error('Failed to query: ', x, y, radius, err);
                    return callback(err);
                }

                console.log('get location: ', result);
                // TODO
                callback(null, result);
            })
    })
}

module.exports = {
    getSigns: getSigns,
    getSignsWithTime: getSignsWithTime
};
