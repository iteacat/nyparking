/**
 * Created by yin on 4/5/15.
 */

var logger = require('./logger.js');
var mysqlDao = require('../common/mysqlDao');
var mongoDao = require('../common/mongoDao');
var config = require('../config');
var assert = require('assert');
var moment = require('moment');
var _ = require('lodash');

var default_radius = 0.2;
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

var toInterval = function(nowInEpoch, durationInMinutes) {
    var interval = {};
    var today = moment(nowInEpoch);
    console.log('debug - today: ', today);
    interval.first = 24 * 60 * (today.isoWeekday() - 1) + today.hour() * 60 + today.minute();
    interval.second = interval.first + durationInMinutes;
    return interval;
}

function getSignsWithTime(x, y, radius, nowInEpoch, durationInMinutes, callback) {
    console.log('getSignsWithTime', x, y, radius, nowInEpoch, durationInMinutes);
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
                        $centerSphere: [[location.y, location.x], getRadius(location.radius)]
                    }
                }
            }).toArray(function(err, items) {
                if (err)  {
                    logger.error('Failed to query: ', x, y, location.radius, err);
                    return callback(err);
                }

                var interval = toInterval(nowInEpoch, durationInMinutes);
                console.log('Calculated interval: ', interval);

                items.forEach(function(item) {
                    var intervalResult = findInterval(item.signTimeRanges, interval);
                    item.availability = intervalResult;
                    if (item.signTimeRanges)
                        delete item.signTimeRanges;
                })

                console.log('get location: ', items);

                var dataByLoc = _.chain(items)
                    .groupBy(function(each) {
                        return each.loc.coordinates;
                    })
                    .pairs()
                    .map(function(each) {
                        return each[1];
                    })
                    .value();

                callback(null, dataByLoc);
            })
    })
}

/**
 * 1. No intersect -> red
 * 2. fully covered by a single interval -> green
 * 3. fully covered by more than one intervals (in the case the intervals that cover it are continuous -> green
 * 4. partial covered by a single interval
 * 4.1 first part is covered -> green_first
 * 4.2. middle part is covered -> green_middle
 * 4.3 last part is covered -> green_last
 * 5. partial covered by more than one intervals -> green_multi
 *
 * @param intervals
 * @param interval
 *
 * @return color - indicated by above; overlaps -> array of numbers of minutes overlapped
 */
var findInterval = function (intervals, interval) {
    if (!intervals) {
        return null;
    }
    var first = -1, second = -1;
    var firstPos = 'out', secondPos = 'out';

    for (var i = 0; i < intervals.length; i++) {
        if (first === -1 && interval.first <= intervals[i][1]) {
            first = i;
            if (interval.first >= intervals[i][0] && interval.first <= intervals[i][1]) {
                firstPos = 'in';
            }
        }
        if (second === -1 && interval.second <= intervals[i][1]) {
            second = i;
            if (interval.second >= intervals[i][0] && interval.second <= intervals[i][1]) {
                secondPos = 'in';
            }
        }
    }

    if (first === -1) {
        return {
            color: 'red',
            overlaps: []
        }
    }

    if (second === -1)
        second = intervals.length;


    // 1
    if (first === second && firstPos === 'out' && secondPos === 'out') {
        return {
            color: 'red',
            overlaps: []
        }
    }

    //2
    if (first === second && firstPos === 'in' && secondPos === 'in') {
        return {
            color: 'green',
            overlaps: [interval.second - interval.first]
        };
    }

    //3
    if (first < second && firstPos === 'in' && secondPos === 'in') {
        var continuous = true;
        for (var i = first; i < second; i++) {
            if (intervals[i][1] < intervals[i + 1][0]) {
                continuous = false;
                break;
            }
        }
        if (continuous) {
            return {
                color: 'green',
                overlaps: [interval.second - interval.first]
            }
        }
    }

    //4.1
    if (first === second - 1 && firstPos === 'in' && secondPos === 'out') {
        return {
            color: 'green_first',
            overlaps: [intervals[first][1] - interval.first]
        }
    }

    //4.2
    if (first === second - 1 && firstPos === 'out' && secondPos === 'out') {
        return {
            color: 'green_middle',
            overlaps: [intervals[first][1] - intervals[first][0]]
        }
    }

    //4.3
    if (first === second && firstPos === 'out' && secondPos === 'in') {
        return {
            color: 'green_last',
            overlaps: [interval.second - intervals[second][0]]
        }
    }

    return {
        color: 'red',
        overlaps: []
    }
};

assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 1, second: 2}), {color: 'red', overlaps: []});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 1, second: 7}), {color: 'green_last', overlaps: [2]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 5, second: 7}), {color: 'green', overlaps: [2]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 6, second: 7}), {color: 'green', overlaps: [1]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 8, second: 12}), {color: 'red', overlaps: []});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 5, second: 11}), {color: 'green_first', overlaps: [3]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 10, second: 19}), {color: 'green_middle', overlaps: [5]});
assert.deepEqual(findInterval([[5, 8], [ 12, 16], [ 17, 30]], {first: 13, second: 23}), {color: 'red', overlaps: []});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 17, 30]], {first: 13, second: 23}), {color: 'green', overlaps: [10]});

assert.deepEqual(toInterval(moment('201507210100', 'YYYYMMDDHHmm').valueOf(), 30), {first: 1500, second: 1530});
assert.deepEqual(toInterval(moment('201507211430', 'YYYYMMDDhhmm').valueOf(), 70), {first: 870 + 1440, second: 940 + 1440});

module.exports = {
    getSigns: getSigns,
    getSignsWithTime: getSignsWithTime
};
