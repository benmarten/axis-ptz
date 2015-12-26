'use strict';

var express = require('express');
var app = express();
var http = require('http');
var Q = require('q');

var MOVE_WAIT = parseInt(process.env.MOVE_WAIT) || 10000;
var CAM_IP = '192.168.178.54';
var CAM_CREDENTIALS = 'root:shIt7Bu8';
var CAM_RES_W = 704;
var CAM_RES_H = 576;
var CAM_FACTOR_X = parseInt(process.env.CAM_FACTOR) || 10;
var CAM_FACTOR_Y = parseInt(process.env.CAM_FACTOR) || 12;
var CAM_START_POS = {
  x: 50,
  y: -30
};

var lastMotionTime;
var schedulePositionResetId;

var extractPosition = function(req) {
  console.log('Query Params: ' + JSON.stringify(req.query));
  if (!req.query || !req.query.x || !req.query.y) {
    return;
  }
  return {
    x: Math.round(-(CAM_RES_W / 2 - req.query.x) / CAM_FACTOR_X),
    y: Math.round((CAM_RES_H / 2 - req.query.y) / CAM_FACTOR_Y)
  };
};

var moveCameraRelative = function(newPosition) {
  var deferred = Q.defer();
  http.get('http://' + CAM_CREDENTIALS + '@' + CAM_IP +
    '/axis-cgi/com/ptz.cgi?rpan=' + newPosition.x +
    '&rtilt=' + newPosition.y,
    function() {
      console.log('Camera moved.');
      deferred.resolve();
    }).on('error', function(e) {
    console.log("Got error: " + e.message);
    deferred.reject();
  });
  return deferred.promise;
};

var moveCamera = function(newPosition) {
  var deferred = Q.defer();
  http.get('http://' + CAM_CREDENTIALS + '@' + CAM_IP +
    '/axis-cgi/com/ptz.cgi?pan=' + newPosition.x +
    '&tilt=' + newPosition.y,
    function() {
      console.log('Camera moved.');
      deferred.resolve();
    }).on('error', function(e) {
    console.log("Got error: " + e.message);
    deferred.reject();
  });
  return deferred.promise;
};

var schedulePositionReset = function() {
  console.log('Camera position reset scheduled.');
  if (schedulePositionResetId) {
    clearTimeout(schedulePositionResetId);
  }
  schedulePositionResetId = setTimeout(function() {
    var now = (new Date()).getTime();
    lastMotionTime = now;
    moveCamera(CAM_START_POS).then(function() {
      console.log('Camera position reset!');
    });
  }, 30000);
};

app.get('/', function(req, res) {
  var now = (new Date()).getTime();
  if (!lastMotionTime || lastMotionTime + MOVE_WAIT < now) {
    lastMotionTime = now;

    var newPosition = extractPosition(req);
    console.log('New position: ' + JSON.stringify(newPosition));
    if (newPosition) {
      schedulePositionReset();
      moveCameraRelative(newPosition).then(function() {
        return res.status(200).send('Camera moved.');
      }, function() {
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
  moveCamera(CAM_START_POS).then(function() {
    console.log('Camera position reset!');
  });
  var port = server.address().port;
  console.log('Server listening at http://127.0.0.1:%s', port);
  return;
});
