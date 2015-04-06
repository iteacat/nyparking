/**
 * Created by yin on 4/5/15.
 */

var mysql = require('mysql');

var radius = 0.001;
var sql = "set @center=point(?, ?);" +
" SET @radius = ?; " +
" SET @bbox = CONCAT('POLYGON((', " +
" X(@center) - @radius, ' ', Y(@center) - @radius, ',', " +
" X(@center) + @radius, ' ', Y(@center) - @radius, ',', " +
" X(@center) + @radius, ' ', Y(@center) + @radius, ',', " +
" X(@center) - @radius, ' ', Y(@center) + @radius, ',', " +
" X(@center) - @radius, ' ', Y(@center) - @radius, '))' " +
" ); " +
" SELECT AsText(location), boro, sign_desc, SQRT(POW( ABS( X(location) - X(@center)), 2) + POW( ABS(Y(location) - Y(@center)), 2 )) AS distance " +
" FROM nyparking_signs " +
" WHERE Intersects(location, GeomFromText(@bbox) ) " +
" AND SQRT(POW( ABS( X(location) - X(@center)), 2) + POW( ABS(Y(location) - Y(@center)), 2 )) < @radius " +
" ORDER BY distance";

var connection  = mysql.createConnection({
    host     : 'cat1ny.ch67iaxvc4uj.us-east-1.rds.amazonaws.com',
    user     : 'iteacat',
    password : 'ChafNod9',
    port     : '3306',
    database : 'cat1ny',
    multipleStatements : true
});

function getSigns(x, y, radius, callback) {
    //connection.connect(function(err) {
        //if (err) {
            //console.error('error connecting: ' + err.stack);
            //return;
        //}
//
        //console.log('connected as id ' + connection.threadId);
    //});

    //console.log(sql);

    connection.query(sql, [x, y, radius], function(err, rows, fields) {
        if (err && err.errno !== 1062) {

            console.error('error writing to db ', err);
        }

        //console.log("rows ", rows.splice(3)[0]);
        callback(rows.splice(3)[0]);
    });

}

//getSigns(40.740352, -73.8861533, radius);

module.exports = getSigns;
