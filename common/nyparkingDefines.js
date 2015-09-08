/**
 *
 * Created by yin on 8/16/15.
 */

/*
 > db.nyparking_signs.distinct("arrow");
 [ "", "S", "N", "E", "W", "N/S", "E/W", "L", "R" ]
 > db.nyparking_signs.distinct("side")
 [ "E", "N", "W", "S", " ARROW & HANDICAP SYMBOLS", "M" ]
 > db.nyparking_signs.distinct("signType")
 [ "NO STANDING", "NO PARKING", "HOUR PARKING", "HMP", "NO STOPPING" ]
 */

var ARROW_TYPE = {
    S: "S",
    N: "N",
    E: "E",
    W: "W",
    NS: "N/S",
    EW: "E/W",
    L: "L",
    R: "R"
};

var SIGN_TIME_COVERAGE = {
    MISS: "M",
    COVER_FULL: "F",
    COVER_HEAD: "H",
    COVER_TAIL: 'T',
    COVER_PARTIAL: 'P'
};

var SIDE_TYPE = {
    S: "S",
    N: "N",
    E: "E",
    W: "W"
};

var SIGN_TYPE = {
    NO_STANDING : "NO STANDING",
    NO_PARKING : "NO PARKING",
    NO_STOPPING : "NO STOPPING",

    HOUR_PARKING : "HOUR PARKING",
    HMP : "HMP"
};

var MARKER_DIRECTION = {
    VERTICAL: "V",
    HORIZONTAL: "H",
    FULL: "F"
};

