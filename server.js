'use strict';

var express = require('express');
var app = express();
var http = require('http');

var MOVE_WAIT = process.env.MOVE_WAIT || 10000;
var CAM_IP = '192.168.178.54';
var CAM_CREDENTIALS = 'root:shIt7Bu8';
var CAM_RES_W = 704;
var CAM_RES_H = 576;
var CAM_FACTOR = process.env.CAM_FACTOR || 10;

var lastMotionTime;

var extractPosition = function(req) {
  console.log('Query Params: ' + JSON.stringify(req.query));
  if (!req.query || !req.query.x || !req.query.y) {
    return;
  }
  return {
    x: Math.round(-(CAM_RES_W / 2 - req.query.x) / CAM_FACTOR),
    y: Math.round(-(CAM_RES_H / 2 - req.query.y) / CAM_FACTOR)
  };
};

app.get('/', function(req, res) {
  var now = (new Date()).getTime();
  if (!lastMotionTime || lastMotionTime + MOVE_WAIT < now) {
    lastMotionTime = now;

    var newPosition = extractPosition(req);
    console.log('New position: ' + JSON.stringify(newPosition));
    if (newPosition) {
      http.get('http://' + CAM_CREDENTIALS + '@' + CAM_IP +
        '/axis-cgi/com/ptz.cgi?rpan=' + newPosition.x +
        '&rtilt=' + newPosition.y,
        function() {
          console.log('Camera moved.');
          return res.status(200).send('Camera moved.');
        }).on('error', function(e) {
        console.log("Got error: " + e.message);
        return res.status(500);
      });
    } else {
      console.log('New position missing.');
      return res.status(500).send('New position missing.');
    }
  } else {
    console.log('Skipping request.');
    return res.status(200).send('Skipping request.');
  }
});

var server = app.listen(3000, function() {
  var port = server.address().port;
  console.log('Server listening at http://127.0.0.1:%s', port);
  return;
});
