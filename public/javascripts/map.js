/**
 * Created by yin on 4/6/15.
 */

var mapModule = angular.module('mapModule', ['ngResource']);
var markerClicked = false;
var map = null;
var isDebug = false;

var SIGN_COLOR = {
    RED: "R",
    GREEN: "G",
    BLUE: "B",
    NONE: "N"
};

mapModule.factory('chatRsc', function ($resource) {
    return $resource("/chats.json");
});

mapModule.factory('map', function() {
    return map;
});

mapModule.factory('mapDao', function ($resource) {

    var myLatLng = {lat: 40.739648, lng: -73.9993346};
    var infoWins = [];
    var markers = [];
    var curLocMarker = [];
    var mapEpoch = 0;
    var mapDuration = 0;

    var rscSignsWithTime = $resource('/signs_with_time/:lat/:lng/:epoch/:duration', {}, {
        get: {
            cache: true,
            method: 'GET'
        }
    })

    function getSignsWithTime(location) {
        rscSignsWithTime.get(location, function(data) {
            showSignsWithTime(data);
        })
    }

    // the function that renders the markers
    function showSignsWithTime(data) {
        //console.log('yin - debug: ', data.signs);
        isDebug = data.isDebug ? data.isDebug : false;

        data.signs.forEach(function(loc) {
            var descStr = '';
            var pos = null;

            var locColor = 'grey';
            switch(loc.locColor) {
                case SIGN_COLOR.NONE:
                    locColor = 'grey';
                    break;
                case SIGN_COLOR.GREEN:
                    locColor = 'green';
                    break;
                case SIGN_COLOR.RED:
                    locColor = 'red';
                    break;
                case SIGN_COLOR.BLUE:
                    locColor = 'blue';
                    break;
            }

            loc.signs.forEach(function(sign) {
                //console.log('each sign: ', sign);
                var desc = (sign.subDesc ? sign.subDesc : sign.desc);
                descStr += "<p>" + desc + "</p>" + sign.direction;
                if (!pos) {
                    pos = {
                        x: sign.loc.coordinates[1],
                        y: sign.loc.coordinates[0]
                    };
                }
                if (isDebug) {
                    descStr += "<p>";
                    descStr += "****DEBUG BEGIN****";
                    descStr += "<p>";
                    descStr += "Sign type: " + sign.signType || "NULL";
                    descStr += "<p>";
                    descStr += "Sign desc: " + sign.desc || "NULL";
                    descStr += "<p>";
                    descStr += "availability: " + (sign.availability ? sign.availability.coverage : "NULL");
                    descStr += "<p>";
                    descStr += "overlaps: " + (sign.availability ? sign.availability.overlaps : "NULL");
                    descStr += "<p>";
                    descStr += "Sign desc time ranges: " + sign.signTimeRanges || "NULL";
                    descStr += "<p>";
                    descStr += "Current query interval: " + JSON.stringify(sign.queryInterval) || "NULL";
                    descStr += "<p>";
                    descStr += "****DEBUG END****";
                }
            });

            var infoWindow = new google.maps.InfoWindow(
                {
                    content: descStr
                }
            );
            var marker = new google.maps.Marker(
                {
                    position: {lat: pos.x, lng: pos.y},
                    title: "click for parking information",
                    map: map,
                    icon: "../images/marker-" + locColor + ".png"
                }
            );

            google.maps.event.addListener(marker, 'click', function () {
                markerClicked = true
                if (infoWindow.getMap())
                    infoWindow.close();
                else {
                    infoWins.forEach(function (infoWin) {
                        infoWin.close();
                    });
                    infoWindow.open(map, marker);
                }
            });

            infoWins.push(infoWindow);
            markers.push(marker);
        });
    }

    var refreshMap = function (epoch, duration) {
        mapEpoch = epoch;
        mapDuration = duration;

        //console.log('epoch and duration: ', epoch, duration);

        if (map.zoom < 15) {
            console.log('Not shown on event: zoom < 18');
            removeMarkers(markers, infoWins);
            return;
        }

        window.setTimeout(function () {
            removeMarkers(markers, infoWins);
            var loc = map.getCenter();
            //console.log("orig loc: ", loc);
            var roundedLat = getRoundedLoc(loc.lat());
            var roundedLng = getRoundedLoc(loc.lng());
            //console.log("rounded loc: %f %f", roundedLat, roundedLng);
            getSignsWithTime({lat: roundedLat, lng: roundedLng, epoch: mapEpoch, duration: mapDuration});
        }, 0);
    };

    var initialize = function(epoch, duration) {
        mapEpoch = epoch;
        mapDuration = duration;

        var mapOptions = {
            center: myLatLng,
            zoom: 18
        };

        var styles = [
            {
                "stylers": [
                    {"saturation": 34}
                ]
            }
        ];

        var styledMap = new google.maps.StyledMapType(styles,
            {name: "Styled Map"});

        map = new google.maps.Map(document.getElementById('map-canvas'),
            mapOptions);

        var curLocationControlDiv = document.createElement('div');
        var curLocationControl = new CurrentLocationControl(curLocationControlDiv, map, curLocMarker);
        curLocationControlDiv.index = 1;
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(curLocationControlDiv);

        goToCurrentLocation(map, curLocMarker);

        map.mapTypes.set('map_style', styledMap);
        map.setMapTypeId('map_style');

        google.maps.event.addListener(map, 'idle', function () {
            if (markerClicked) {
                markerClicked = false;
                console.log('recenter after marker click. No action');
                return;
            }

            refreshMap(mapEpoch, mapDuration);
        });

        google.maps.event.addListener(map, 'click', function () {
            infoWins.forEach(function (infoWin) {
                infoWin.close();
            });
        });
    }

    return {
        init: function(epoch, duration) {
            $(document).ready(function () {
                /*
                 var h = $(window).height(),
                 offsetTop = 60; // Calculate the top offset

                 $('#map-canvas').css('height', (h));
                 $('#map-canvas').css('width', '100%');
                 $('#map-canvas').css('padding', '0px');
                 $('#map-canvas').css('margin', '0px');
                 $('#map-canvas').css('float', 'left');
                 */
                initialize(epoch, duration);
            });
        },
        refresh: refreshMap
    }
});



function goToCurrentLocation(map, curLocMarker) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(initialLocation);
            if (curLocMarker.length !== 0) {
                curLocMarker[0].setMap(null);
            }
            curLocMarker[0] = new google.maps.Marker(
                {
                    position: {lat: position.coords.latitude, lng: position.coords.longitude},
                    map: map,
                    title: 'Your current location',
                    icon: "../images/current_location.png"
                }
            );
        });
    }
}

function removeMarkers(markers, infoWins) {
    markers.forEach(function(marker) {
        marker.setMap(null);
    });
    markers.length = 0;
    infoWins.length = 0;
}

function getRoundedLoc(orig) {
    var isNeg = false;
    if (orig < 0) {
        isNeg = true;
        orig = -orig;
    }

    var rounded = Math.floor(orig*1000) / 1000;

    var lastDigit = rounded * 1000 % 10;
    if (lastDigit >= 5) {
        rounded = rounded - (lastDigit / 1000 - 0.005);
    } else {
        rounded = rounded - lastDigit / 1000;
    }
    return isNeg ? -rounded : rounded;
}

// not working on bootstrap
function resizeMap() {
    console.log('resizing...');
    $("#map-canvas").toggleClass("fullscreen")
}

function CurrentLocationControl(controlDiv, map, curLocMarker) {
    var controlUI = document.createElement('img');
    controlUI.src = "../images/curLocIcon.png";

    controlDiv.appendChild(controlUI);

    google.maps.event.addDomListener(controlUI, 'click', function() {
        goToCurrentLocation(map, curLocMarker);
    });
}
