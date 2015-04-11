var express = require('express');
var router = express.Router();
var dao = require('../dao/sign_dao.js');

/* GET home page. */
router.get('/signs.json/:lat/:lng', function(req, res, next) {
  //res.render('index', { title: 'Express' });
    //dao(40.740352, -73.8861533, 0.001, function(result) {
    dao(Number(req.params.lat), Number(req.params.lng), 0.0015, function(result) {
        res.json({'signs': result});
    });
});

router.get('/map', function(req, res, next) {
    res.sendfile('public/map.html');
});

router.get('/hello', function(req,res,next) {
    res.send('Jing is killed :)');
});

module.exports = router;
