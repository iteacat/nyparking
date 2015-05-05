/**
 * Created by yin on 4/6/15.
 */

var mapModule = angular.module('mapModule', ['ngResource']);

mapModule.factory('chatRsc', function ($resource) {
    return $resource("/chats.json");
});

mapModule.factory('initMap', function ($resource) {

    var myLatLng = {lat: 40.739648, lng: -73.9993346};
    var map = null;
    var infoWins = [];
    var markers = [];
    var chatHistory = []
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
                    map: map
                }
            );
            google.maps.event.addListener(marker, 'click', function () {
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

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                map.setCenter(initialLocation);

                var curLocMarker = new google.maps.Marker(
                    {
                        position: {lat: position.coords.latitude, lng: position.coords.longitude},
                        map: map,
                        title: 'Your current location',
                        icon: "../images/current_location.png"
                    }
                );
            });
        }

        map.mapTypes.set('map_style', styledMap);
        map.setMapTypeId('map_style');

        google.maps.event.addListener(map, 'zoom_changed', function () {
            if (map.zoom < 13) {
                removeMarkers(markers);
            }
        });

        google.maps.event.addListener(map, 'idle', function () {
            /*
            if (map.zoom < 18) {
                console.log('Not shown on event: zoom < 18');
                return;
            }
            */
            window.setTimeout(function () {
                removeMarkers(markers);
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

function removeMarkers(markers) {
    markers.forEach(function(marker) {
        marker.setMap(null);
    });
    markers.length = 0;
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
