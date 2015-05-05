/**
 * Created by yin on 4/6/15.
 */

var mapModule = angular.module('mapModule', ['ngResource']);
var markerClicked = false;

mapModule.factory('chatRsc', function ($resource) {
    return $resource("/chats.json");
});

mapModule.factory('initMap', function ($resource) {

    var myLatLng = {lat: 40.739648, lng: -73.9993346};
    var map = null;
    var infoWins = [];
    var markers = [];
    var chatHistory = []
    var curLocMarker = [];
    var rsc = $resource("/signs.json/:lat/:lng", {}, {
        get: {
            cache: true,
            method: 'GET'
        }
    });

    function getSigns(location) {

        rsc.get(location, function (data) {
            showSign(data);
        });
    }

    function showSign(data) {
        console.log('haha, get the data');
        data.signs.forEach(function (sign) {
            var descs = sign.sign_desc.split('|');
            var descStr = '';
            descs.forEach(function (desc) {
                descStr += "<p>" + desc + "</p>";
            })
            var infoWindow = new google.maps.InfoWindow(
                {
                    content: descStr
                }
            );
            var marker = new google.maps.Marker(
                {
                    position: {lat: sign.x, lng: sign.y},
                    title: "click for parking information",
                    map: map,
                    icon: "../images/dot.png"
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

    function initialize() {
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

        /* not working on bootstrap
        google.maps.event.addListener(map, 'dblclick', function() {
            resizeMap();
        });
        */

        google.maps.event.addListener(map, 'idle', function () {
            if (markerClicked) {
                markerClicked = false;
                console.log('recenter after marker click. No action');
                return;
            }

            if (map.zoom < 15) {
                console.log('Not shown on event: zoom < 18');
                removeMarkers(markers, infoWins);
                return;
            }

            window.setTimeout(function () {
                removeMarkers(markers, infoWins);
                var loc = map.getCenter();
                console.log("orig loc: ", loc);
                var roundedLat = getRoundedLoc(loc.lat());
                var roundedLng = getRoundedLoc(loc.lng());
                console.log("rounded loc: %f %f", roundedLat, roundedLng);
                getSigns({lat: roundedLat, lng: roundedLng});
            }, 0);
        });

        google.maps.event.addListener(map, 'click', function () {
            infoWins.forEach(function (infoWin) {
                infoWin.close();
            });
        });
    }

    return function () {
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
            initialize();
        });
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
