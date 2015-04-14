/**
 * Created by yin on 4/9/15.
 */
var app = angular.module('myApp', ['mapModule']);

app.controller("MainCtrl", function(initMap) {
    initMap();
});

app.controller("ChatCtrl", ['$scope', function($scope) {
    var socket = io();
    $scope.msg = '';
    $scope.chats = [];

    socket.on('new msg', function (text) {
        $scope.chats.push(text);
        $scope.$apply();
        console.log('received new msg: ', $scope.chats);
    });
    $scope.submit = function () {
        console.log('sending msg: ', $scope.msg);
        socket.emit('new msg', $scope.msg);
        $scope.msg = '';
    };
}]);
