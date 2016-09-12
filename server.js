// modules =================================================
var express         = require('express');
var app             = express();
var pg              = require('pg');
var bodyParser      = require('body-parser');
var session         = require('express-session');
var methodOverride  = require('method-override');
var crypto          = require('crypto');

// configuration ===========================================

// config files
var db = require('./config/db');

// set our port
app.set('port', (process.env.PORT || 7000));

// connect to our postgres database 
var client = new pg.Client(db.url);

client.connect(function(err) {
    if(err) throw err;
});

// create mailingList table if it does not exist
client.query("CREATE TABLE IF NOT EXISTS mailingList (id SERIAL PRIMARY KEY NOT NULL, email CHAR(100) NOT NULL);", function(err, result){
    if(err) throw err;

    console.log('mailingList\n' + result.rows + '\n');
});

// create userList table if it does not exist
client.query("CREATE TABLE IF NOT EXISTS userList (id SERIAL PRIMARY KEY NOT NULL, username CHAR(50) NOT NULL, hash CHAR(100) NOT NULL);", function(err, result){
    if(err) throw err;

    console.log('userList\n' + result.rows + '\n');

    // create admin user if admin does not exist
    var hash = crypto.createHash('SHA256');
    var pass = process.env.ADMINPASS || "hb=#}4v'd{f4kFS{";

    pass = hash.update(pass).digest('base64');

    // if no rows are updated, then admin does not exist
    client.query("UPDATE userList SET username='admin', hash='" + pass + "' WHERE username='admin';", function(err, result) {
        if(err) throw err;

        console.log('checking if admin exists\n' + result.rows + '\n');

        // check number of updated records
        if(result.rowCount < 1) {

            // create admin
            client.query("INSERT INTO userList (username, hash) VALUES ('admin', '" + pass + "');", function(err, result) {
                if(err) throw err;

                console.log('creating admin\n' + result.rows + '\n');

                client.end(function(err) {
                    if(err) throw err;
                });
            });
        } else {
            client.end(function(err) {
                if(err) throw err;
            });
        }
    });
});

// get all data/stuff of the body (POST) parameters
// parse application/json 
app.use(bodyParser.json()); 

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse cookies
var key = process.env.COOKIE_SECRET || "gf'BTtV4E%^A%!/>s$rDk8#@cQqkV#739x+k";
app.use(session({path: '/', name: 'ruhacks', secret: key, httpOnly: true, secure: false, maxAge: null, resave: false}));

// override with the X-HTTP-Method-Override header in the request. simulate DELETE/PUT
app.use(methodOverride('X-HTTP-Method-Override')); 

// set the static files location /public/img will be /img for users
app.use(express.static(__dirname + '/public'));

// routes ==================================================
require('./app/routes')(app); // configure our routes

// start app ===============================================
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// expose app           
exports = module.exports = app;