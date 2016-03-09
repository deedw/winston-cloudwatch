var AWS = require('aws-sdk'),
    cloudwatchlogs,
    _ = require('lodash'),
    logEvents = [],
    logGroupName = '',
    logStreamName = '',
    messageAsJSON,
    intervalId;



module.exports.init = function(options) {
    options = options || {};

    var awsLogGroupName = options.logGroupName;
    var awsLogStreamName = options.logStreamName;
    var awsAccessKeyId = options.awsAccessKeyId;
    var awsSecretKey = options.awsSecretKey;
    var awsRegion = options.awsRegion;
    var jsonMessage = options.jsonMessage;
    var proxyServer = options.proxyServer;

   if (proxyServer) {
      AWS.config.update({
          httpOptions: {
              agent: require('proxy-agent')(proxyServer)
          }
      });
  }
  if (awsAccessKeyId && awsSecretKey && awsRegion) {
    cloudwatchlogs = new AWS.CloudWatchLogs({accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretKey, region: awsRegion});
  } else if (awsRegion && !awsAccessKeyId && !awsSecretKey) {
    // Amazon SDK will automatically pull access credentials from IAM Role when running on EC2 but region still needs to be configured
    cloudwatchlogs = new AWS.CloudWatchLogs({region: awsRegion});
  } else {
    cloudwatchlogs = new AWS.CloudWatchLogs();
  }
  logGroupName = awsLogGroupName;
  logStreamName = awsLogStreamName;
  messageAsJSON = jsonMessage;
};

module.exports.add = function(log) {
  log = _.clone(log);
  var now = new Date();
  log.timestamp = now.toISOString();
  logEvents.push({
    message: messageAsJSON ? JSON.stringify(log, null, '  ') : [log.level, log.msg, JSON.stringify(log.meta, null, '  ')].join(' - '),
    timestamp: now.getTime()
  });

  var lastFree = new Date().getTime();
  function upload() {
    if (new Date().getTime() - 2000 > lastFree) {
      token(function(err, sequenceToken) {
        if (err) {
          return console.log(err, err.stack);
        }

        if (logEvents.length <= 0) {
          return;
        }

        var payload = {
          logGroupName: logGroupName,
          logStreamName: logStreamName,
          logEvents: logEvents.splice(0, 20)
        };
        if (sequenceToken) payload.sequenceToken = sequenceToken;

        cloudwatchlogs.putLogEvents(payload, function(err, data) {
          if (err) return console.log(err, err.stack);
          lastFree = new Date().getTime();
        });
      });
    }
  }
  if (!intervalId) {
    intervalId = setInterval(upload, 1000);
  }
};

function findLogStream(logGroupName, logStreamName, cb) {
  function next(token) {
    var params = {
      logStreamNamePrefix: logStreamName,
      logGroupName: logGroupName
    };
    cloudwatchlogs.describeLogStreams(params, function(err, data) {
      if (err) {
        if(err.code === 'ResourceNotFoundException'){
          return createLogGroup(logGroupName, cb);
        }
        return cb(err);
      }

      var matches = _.find(data.logStreams, function(logStream) {
        return (logStream.logStreamName === logStreamName);
      });
      if (matches) {
        cb(null, matches);
      } else if (!data.nextToken) {
        cb(new Error('Stream not found'));
      } else {
        next(data.nextToken);
      }
    });
  }
  next();
}

function token(cb) {
  findLogStream(logGroupName, logStreamName, function(err, logStream) {
    if (err) {
      if(err.message === 'Stream not found'){
        return createLogStream(logGroupName, logStreamName, cb);
      }
      return cb(err);
    }
    cb(null, logStream.uploadSequenceToken);
  });
}

function createLogStream(logGroupName, logStreamName, cb){
  cloudwatchlogs.createLogStream({
    logGroupName: logGroupName,
    logStreamName: logStreamName
  }, function(err, data){
      if(err) cb(err);
      else token(cb);
  });
}

function createLogGroup(logGroupName, cb){
  cloudwatchlogs.createLogGroup({
    logGroupName: logGroupName
  }, function(err, data){
      if(err) cb(err);
      else findLogStream(logGroupName, logStreamName, cb);
  });
}
