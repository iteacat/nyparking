var express = require('express');
var router = express.Router();
var dao = require('../dao/sign_dao.js');
var chatDao = require('../dao/chat_dao.js');

/* GET home page. */
router.get('/signs.json/:lat/:lng', function(req, res, next) {
    dao(Number(req.params.lat), Number(req.params.lng), 0.0015, function(result) {
        res.json({'signs': result});
    });
});

router.get('/chats.json', function(req, res, next) {
    res.json({'chats' : chatDao.chats});
});

router.get('/', function(req, res, next) {
    res.sendfile('public/mapchat.html');
});

router.get('/test', function(req, res, next) {
    res.sendfile('public/mapchat.html');
});

router.get('/chat', function(req, res, next) {
    res.sendfile('public/chat.html');
});


module.exports = router;
