/**
 * Created by yin on 4/6/15.
 */
var mapModule = angular.module('mapModule', ['ngResource']);

mapModule.factory('initMap', function($resource) {

    var myLatLng = { lat: 40.739648, lng: -73.9993346 };
    var map = null;

    function getSigns(location) {
        var rsc = $resource("/signs.json/:lat/:lng");
        rsc.get(location, function (data) {
            showSign(data);
        });
    }

    function showSign(data) {
        console.log('haha, get the data');
        data.signs.forEach(function(sign) {
            var infoWindow = new google.maps.InfoWindow(
                {
                    content: sign.sign_desc
                }
            );
            var marker = new google.maps.Marker(
                {
                    position: {lat: sign.x, lng: sign.y},
                    map: map,
                    title: 'You rock'
                }
            );
            google.maps.event.addListener(marker, 'click', function() {
                if (infoWindow.getMap())
                    infoWindow.close();
                else
                    infoWindow.open(map, marker);
            });
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
                    { "saturation": 34 }
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
            });
        }

        map.mapTypes.set('map_style', styledMap);
        map.setMapTypeId('map_style');

        google.maps.event.addListener(map, 'idle', function() {
            if (map.zoom < 18) {
                console.log('Not shown on event: zoom < 18');
                return;
            }
            window.setTimeout(function () {
                var loc = map.getCenter();
                getSigns({lat: loc.lat(), lng: loc.lng()});
            }, 0);
        });
    }

    return function() {
        initialize();
    }
});
