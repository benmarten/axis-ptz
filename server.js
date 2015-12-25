'use strict';

var express = require('express');
var app = express();
var http = require('http');

var MOVE_WAIT = 3000;
var CAMERA_IP = '192.168.178.54';
var CAMERA_CREDENTIALS = 'root:shIt7Bu8';

var lastMotionTime;

var extractPosition = function(req) {
  if (!req.query || !req.query.x || !req.query.y) {
    return;
  }
  return {
    x: req.query.x,
    y: req.query.y
  };
};

app.get('/', function(req, res) {
  var now = (new Date()).getTime();
  if (!lastMotionTime || lastMotionTime + MOVE_WAIT < now) {
    lastMotionTime = now;

    var newPosition = extractPosition(req);
    if (newPosition) {
      http.get('http://' + CAMERA_CREDENTIALS + '@' + CAMERA_IP +
        '/axis-cgi/com/ptz.cgi?rpan=-10',
        function() {
          return res.status(200).send('Camera moved.');
        }).on('error', function(e) {
        return console.log("Got error: " + e.message);
      });
    } else {
      return res.status(500).send('New position missing.');
    }
  } else {
    return res.status(200).send('Skipping request.');
  }
});

var server = app.listen(3000, function() {
  var port = server.address().port;
  console.log('Server listening at http://127.0.0.1:%s', port);
  return;
});
