/**
 * Created by yin on 4/9/15.
 */
var app = angular.module('myApp', ['mapModule']);

app.controller("MainCtrl", function(initMap) {
    initMap();
});

app.controller("ChatCtrl", ['$scope', 'chatRsc', function($scope, chatRsc) {
    var socket = io();
    $scope.msg = '';
    chatRsc.get(function(data) {
        $scope.chats = data.chats;
    });
    $scope.CHAT_LEN = 100;

    socket.on('new msg', function (text) {
        $scope.chats.unshift(text);
        while ($scope.CHAT_LEN < $scope.chats.length) {
            $scope.chats.pop();
        }
        $scope.$apply();
        console.log('received new msg: ', $scope.chats);
    });
    $scope.submit = function () {
        console.log('sending msg: ', $scope.msg);
        socket.emit('new msg', $scope.msg);
        $scope.msg = '';
    };
}]);
