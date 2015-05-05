var express = require('express');
var router = express.Router();
var dao = require('../dao/sign_dao.js');
var chatDao = require('../dao/chat_dao.js');
var logger = require('../dao/logger.js');

/* GET home page. */
router.get('/signs.json/:lat/:lng', function(req, res, next) {
    var start = new Date();
    dao(Number(req.params.lat), Number(req.params.lng), null, function(result) {
        res.json({'signs': result});
        var end = new Date();
        logger.info("req-res time: %dms, content length: %d", end - start, res.getHeader("content-length"));
    });
});

router.get('/chats.json', function(req, res, next) {
    res.json({'chats' : chatDao.chats});
});

router.get('/', function(req, res, next) {
    res.sendFile('public/mapchat.html', { root: './' });
});

module.exports = router;
