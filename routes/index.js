var express = require('express');
var router = express.Router();
var dao = require('../dao/sign_dao.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
    dao(40.740352, -73.8861533, 0.001, function(result) {
        res.json(result);
    });
});

module.exports = router;
