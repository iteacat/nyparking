var express = require('express');
var router = express.Router();
var dao = require('../dao/sign_dao.js');

/* GET home page. */
router.get('/signs.json/:lat/:lng', function(req, res, next) {
    dao(Number(req.params.lat), Number(req.params.lng), 0.0015, function(result) {
        res.json({'signs': result});
    });
});

router.get('/', function(req, res, next) {
    res.sendfile('public/map.html');
});

router.get('/test', function(req, res, next) {
    res.sendfile('public/map-test.html');
});

router.get('/chat', function(req, res, next) {
    res.sendfile('public/chat.html');
});


module.exports = router;
