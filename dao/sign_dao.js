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

var SIGN_TIME_COVERAGE = {
    MISS: "M",

    COVER_FULL: "F",

    COVER_HEAD: "H",
    COVER_TAIL: 'T',
    COVER_PARTIAL: 'P'
};

var SIGN_TYPE = {
    NO_STANDING: "NO STANDING",
    NO_PARKING: "NO PARKING",
    NO_STOPPING: "NO STOPPING",

    HOUR_PARKING: "HOUR PARKING",
    HMP: "HMP"
};

var SIGN_COLOR = {
    RED: "R",
    GREEN: "G",
    BLUE: "B",
    NONE: "N"
};

/**
 *
 * @param signTimeCoverage
 * @param signType
 * @returns {string} RED if parking not allown. Green if parking allown. Blue if part of all of the portion are metered
 * parking (should check before showing blue - if there are green at the same time, then show blue; if there are red at
 * the same time, then should red. If there ain't other color at the same time, and if the signTimeCoverage is COVER_FULL,
 * then show blue. Otherwise, show NONE.
 */
var getSignColor = function(signTimeCoverage, signType) {
    if (!signTimeCoverage || !signType) {
    }

    var color = SIGN_COLOR.NONE;

    switch(signType) {
        case SIGN_TYPE.NO_PARKING:
        case SIGN_TYPE.NO_STANDING:
        case SIGN_TYPE.NO_STOPPING:
            switch(signTimeCoverage) {
                case SIGN_TIME_COVERAGE.COVER_FULL:
                case SIGN_TIME_COVERAGE.COVER_HEAD:
                case SIGN_TIME_COVERAGE.COVER_TAIL:
                case SIGN_TIME_COVERAGE.COVER_PARTIAL:
                    color = SIGN_COLOR.RED;
                    break;
                case SIGN_TIME_COVERAGE.MISS:
                    color = SIGN_COLOR.GREEN;
                    break;
                default:
                    color = SIGN_COLOR.NONE;
            }
            break;
        case SIGN_TYPE.HOUR_PARKING:
        case SIGN_TYPE.HMP:
            switch(signTimeCoverage) {
                case SIGN_TIME_COVERAGE.COVER_FULL:
                case SIGN_TIME_COVERAGE.COVER_HEAD:
                case SIGN_TIME_COVERAGE.COVER_TAIL:
                case SIGN_TIME_COVERAGE.COVER_PARTIAL:
                    color = SIGN_COLOR.BLUE;
                    break;
                case SIGN_TIME_COVERAGE.MISS:
                    color = SIGN_COLOR.NONE;
                    break;
            }
            break;
    }

    return color;
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
                        //$centerSphere: [[location.y, location.x], getRadius(location.radius)]
                        $box: [
                            [location.y - 0.003, location.x - 0.003],
                            [location.y + 0.003, location.x + 0.003]
                        ]
                    }
                }
            }).toArray(function(err, items) {
                if (err)  {
                    logger.error('Failed to query: ', x, y, location.radius, err);
                    return callback(err);
                }

                var interval = toInterval(nowInEpoch, durationInMinutes);
                console.log('Calculated interval: ', interval);

                var filteredItems = [];
                items.forEach(function(item) {
                    // Skip description that doesn't have sign type
                    if (!config.isDebug && !item.signType) {
                        return;
                    }

                    var intervalResult = findInterval(item.signTimeRanges, interval);
                    item.availability = intervalResult;

                    if (config.isDebug) {
                        item.queryInterval = interval;
                    }

                    if (item.signTimeRanges && config.isDebug === false) {
                        delete item.signTimeRanges;
                    }

                    filteredItems.push(item);
                })

                items = filteredItems;

                var dataByLoc = _.chain(items)
                    .groupBy(function(each) {
                        return each.loc.coordinates;
                    })
                    .pairs()
                    .map(function(each) {
                        return each[1];
                    })
                    .value();

                var dataByLocRet = updateMarkerType(dataByLoc);

                callback(null, dataByLocRet);
            })
    })
}

/**
 * 1. No intersect -> MISS
 * 2. fully covered by a single interval -> COVER_FULL
 * 3. fully covered by more than one intervals (in the case the intervals that cover it are continuous -> COVER_FULL
 * 4. partial covered by a single interval
 * 4.1 first part is covered -> COVER_HEAD
 * 4.2. middle part is covered -> COVER_PARTIAL
 * 4.3 last part is covered -> COVER_TAIL
 * 5. partial covered by more than one intervals -> COVER_PARTIAL
 *
 * @param intervals
 * @param interval
 *
 * @return coverage - indicated by above; overlaps -> array of numbers of minutes overlapped
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
            coverage: SIGN_TIME_COVERAGE.MISS,
            overlaps: []
        }
    }

    if (second === -1)
        second = intervals.length;


    // 1
    if (first === second && firstPos === 'out' && secondPos === 'out') {
        return {
            coverage: SIGN_TIME_COVERAGE.MISS,
            overlaps: []
        }
    }

    //2
    if (first === second && firstPos === 'in' && secondPos === 'in') {
        return {
            coverage: SIGN_TIME_COVERAGE.COVER_FULL,
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
                coverage: SIGN_TIME_COVERAGE.COVER_FULL,
                overlaps: [interval.second - interval.first]
            }
        }
    }

    //4.1
    if (first === second - 1 && firstPos === 'in' && secondPos === 'out') {
        return {
            coverage: SIGN_TIME_COVERAGE.COVER_HEAD,
            overlaps: [intervals[first][1] - interval.first]
        }
    }

    //4.2
    if (first === second - 1 && firstPos === 'out' && secondPos === 'out') {
        return {
            coverage: SIGN_TIME_COVERAGE.COVER_PARTIAL,
            overlaps: [intervals[first][1] - intervals[first][0]]
        }
    }

    //4.3
    if (first === second && firstPos === 'out' && secondPos === 'in') {
        return {
            coverage: SIGN_TIME_COVERAGE.COVER_TAIL,
            overlaps: [interval.second - intervals[second][0]]
        }
    }

    return {
        coverage: SIGN_TIME_COVERAGE.MISS,
        overlaps: []
    }
};

/*
dataByLoc sample:
 [ { _id: 55a867ead667fd4a51d20daf,
 loc: { type: 'Point', coordinates: [Object] },
 boro: 'Q',
 orderNumber: 'S-271387',
 sequenceNumber: '3',
 arrow: '',
 desc: 'NO PARKING (SANITATION SYMBOL)11AM-2PM FRIDAY',
 side: 'E',
 signType: 'NO PARKING',
 signHour: null,
 availability: { coverage: 'red', overlaps: [] } } ]
 */
var updateMarkerType = function(dataByLoc) {
    if (!dataByLoc)
        return;

    var dataByLocResult = [];

    dataByLoc.forEach(function(eachLoc) {
        //console.log('===========');
        locColor = SIGN_COLOR.NONE;
        var hasGreen = false;
        var hasRed = false;
        var hasBlue = false;
        var isFullBlue = false;
        var isHourParkingSignTypeOnly = true;

        eachLoc.forEach(function(eachSign) {
            //console.log(JSON.stringify(eachSign));
            var direction = "Direction: ";
            switch (eachSign.arrow) {
                case 'N':
                    direction += 'North';
                    break;
                case 'S':
                    direction += 'South';
                    break;
                case 'E':
                    direction += 'East';
                    break;
                case 'W':
                    direction += 'West';
                    break;
                case 'N/S':
                case 'E/W':
                    direction += 'Both';
                    break;
                case 'L':
                    direction += 'Left';
                    break;
                case 'R':
                    direction += 'Right';
                    break;
                default:
                    direction += 'Both';
            }
            eachSign.direction = direction;
            eachSign.color = getSignColor(eachSign.availability === null ? null : eachSign.availability.coverage, eachSign.signType);
            if (eachSign.color === SIGN_COLOR.GREEN) {
                hasGreen = true;
            } else if (eachSign.color === SIGN_COLOR.RED) {
                hasRed = true;
            } else if (eachSign.color === SIGN_COLOR.BLUE) {
                hasBlue = true;
                if (eachSign.availability.coverage === SIGN_TIME_COVERAGE.COVER_FULL) {
                    isFullBlue = true;
                }
            }

            if (eachSign.signType !== SIGN_TYPE.HOUR_PARKING && eachSign.signType !== SIGN_TYPE.HMP) {
                isHourParkingSignTypeOnly = false;
            }
        });

        if (hasGreen) {
            if (hasBlue) {
                locColor = SIGN_COLOR.BLUE;
            } else {
                locColor = SIGN_COLOR.GREEN;
            }
        } else if (hasRed) {
            locColor = SIGN_COLOR.RED;
        } else if (hasBlue) {
            locColor = SIGN_COLOR.BLUE;
        } else if (isHourParkingSignTypeOnly) {
            // no green, no red and no blue but HOUR_PARKING - consider it as okay to park
            locColor = SIGN_COLOR.GREEN;
        }

        dataByLocResult.push({locColor: locColor, signs: eachLoc});
    });

    return dataByLocResult;
}

assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 1, second: 2}), {coverage: SIGN_TIME_COVERAGE.MISS, overlaps: []});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 1, second: 7}), {coverage: SIGN_TIME_COVERAGE.COVER_TAIL, overlaps: [2]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 5, second: 7}), {coverage: SIGN_TIME_COVERAGE.COVER_FULL, overlaps: [2]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 6, second: 7}), {coverage: SIGN_TIME_COVERAGE.COVER_FULL, overlaps: [1]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 8, second: 12}), {coverage: SIGN_TIME_COVERAGE.MISS, overlaps: []});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 5, second: 11}), {coverage: SIGN_TIME_COVERAGE.COVER_HEAD, overlaps: [3]});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 20, 30]], {first: 10, second: 19}), {coverage: SIGN_TIME_COVERAGE.COVER_PARTIAL, overlaps: [5]});
assert.deepEqual(findInterval([[5, 8], [ 12, 16], [ 17, 30]], {first: 13, second: 23}), {coverage: SIGN_TIME_COVERAGE.MISS, overlaps: []});
assert.deepEqual(findInterval([[5, 8], [ 12, 17], [ 17, 30]], {first: 13, second: 23}), {coverage: SIGN_TIME_COVERAGE.COVER_FULL, overlaps: [10]});

assert.deepEqual(toInterval(moment('201507210100', 'YYYYMMDDHHmm').valueOf(), 30), {first: 1500, second: 1530});
assert.deepEqual(toInterval(moment('201507211430', 'YYYYMMDDhhmm').valueOf(), 70), {first: 870 + 1440, second: 940 + 1440});

module.exports = {
    getSigns: getSigns,
    getSignsWithTime: getSignsWithTime
};
