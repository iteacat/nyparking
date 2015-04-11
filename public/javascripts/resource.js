/**
 * Created by yin on 4/9/15.
 */
var app = angular.module('myApp', ['mapModule']);

app.controller("MainCtrl", function($scope, initMap) {
    //SignsApi.get({ x:40.740352, y:-73.8861533 }, function(data) {
        //$scope.post = data;
    //});
    initMap();
});