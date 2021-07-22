#!/usr/bin/node

try {
  var config = require('./config.js');
} catch(e) { console.log('Missing config!',e); process.exit(1); }

var express = require('express');
const app = express();
var bodyParser = require("body-parser");
app.use(bodyParser.json());
const request = require('request');
var graylog = require('graylog-api');
var port = config.service.port;

const SimpleNodeLogger = require('simple-node-logger'),
    opts = {
        logFilePath:'/var/log/HEPSUB-Graylog.log',
        timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
    },
log = SimpleNodeLogger.createSimpleLogger( opts );


/* API SETTINGS */
app.all('*', function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "X-Requested-With");
   next();
});

/* HEP Post Paths */
app.post('/get/:id', function (req, res) {
  var data = { params: req.params, body: req.body }
  log.info('NEW API POST REQ ',data);
  var cids=req.body.data;

/* Graylog Connect */
var api = graylog.connect({
  basicAuth: {
  username: config.graylog.username,
  password: config.graylog.password
  },
  protocol: config.graylog.protocol,
  host: config.graylog.host,
  port: config.graylog.port,
  path: config.graylog.path
});

if (config.debug) {
  log.info('Graylog connect params: ',api);
}
log.info('NEW API POST REQ CIDs: ',cids);
log.info('Number of CIDs: ',cids.length);


/* Graylog Prepare */
var query_to_graylog = "";

for (let i = 0; i <= cids.length-1; i++) {
  if (i == cids.length-1) {
        var cid_cleaned = "";
        var cid_cleaned = cids[i].replace(/\:/g, '\\:');
//	console.log("IF - XCID cleaned and prepared for graylog:",cid_cleaned);
        query_to_graylog += config.graylog.search_field + ":" + cid_cleaned;
  } else {
 	var cid_cleaned = "";
        var cid_cleaned = cids[i].replace(/\:/g, '\\:');	
//	console.log("ELSE - XCID cleaned and prepared for graylog:",cid_cleaned);
        query_to_graylog += config.graylog.search_field + ":" + cid_cleaned + " OR ";
  }

}

log.info("Query to Graylog constructed: ",query_to_graylog);

/* Graylog Query */
try {

api.searchRelative({
  query: query_to_graylog,
  keyword: '3000000',
  limit: config.graylog.limit,
  fields: config.graylog.fields
}, function(err, data) {
  if (err) {
    log.info (err);
    res.send (err)
  } else {
    if (config.debug) {
      log.info("Response from Graylog:", data);
      log.info("Response from Graylog -> Hepic response", data.messages);
    }
      
    if (data.messages == "") {
      data = JSON.stringify({ data: "No data returned from Graylog" })
      res.send (JSON.stringify({ data: "No data returned from Graylog" }))
      log.info("No data returned from Graylog");
    } else {
      res.send (data.messages)
    }

  }
});

} catch(e) { 
  console.error(e)
  log.info("Graylog request send error",e)
}

})

app.listen(port, () => log.info('API Server started',port))


/* HEP PUBSUB Hooks */
var req = require('req-fast');
var api = config.backend;
const uuidv1 = require('uuid/v1');
var uuid = uuidv1();
var ttl = config.service.ttl;
var token = config.token;

var publish = function(){
  try {
    var settings = config.service;
    settings.uuid = uuid;

    const data = JSON.stringify(settings)

    const options = {
        url: api,
        method: 'POST',
        json: settings,
        headers: {
          'Auth-Token': token
        }
    }

    if (config.debug) log.info("Body:", JSON.stringify(options));

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            if (config.debug) log.info("BODY", body) // Print the shortened url.
        } else {
            if (config.debug) log.info('REGISTER API ERROR: ', body.message)
        }
    });
  } catch(e) { console.error(e) }
}


/* REGISTER SERVICE w/ TTL REFRESH */
if (ttl) {
	publish();
	/* REGISTER LOOP */
	setInterval(function() {
	   publish()
	}, (.9 * ttl)*1000 );
}
