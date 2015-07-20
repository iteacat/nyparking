var express = require('express');
var router = express.Router();
var signsDao = require('../dao/sign_dao.js');
var chatDao = require('../dao/chat_dao.js');
var logger = require('../dao/logger.js');

/* GET home page. */
router.get('/signs.json/:lat/:lng', function(req, res, next) {
    var start = new Date();
    signsDao.getSigns(Number(req.params.lat), Number(req.params.lng), null, function(result) {
        res.json({'signs': result});
        var end = new Date();
        logger.info("req-res time: %dms, content length: %d", end - start, res.getHeader("content-length"));
    });
});

router.get('/signs_with_time/:lat/:lng', function(req, res, next) {
    signsDao.getSignsWithTime(Number(req.params.lat), Number(req.params.lng), null, function(err, result) {
        res.json({'signs': result});
    });
});

router.get('/chats.json', function(req, res, next) {
    res.json({'chats' : chatDao.chats});
});

router.get('/', function(req, res, next) {
    res.sendFile('public/mapchat.html', { root: './' });
});

module.exports = router;
