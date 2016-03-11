var AWS = require('aws-sdk'),
    cloudwatchlogs,
    _ = require('lodash'),
    logEvents = [],
    logGroupName = '',
    logStreamName = '',
    messageAsJSON,
    includeTimestamp,
    intervalId;



module.exports.init = function(options) {
  options = options || {};

  var awsAccessKeyId = options.awsAccessKeyId;
  var awsSecretKey = options.awsSecretKey;
  var awsRegion = options.awsRegion;
  var proxyServer = options.proxyServer;

  logGroupName = options.logGroupName;
  logStreamName = options.logStreamName;
  messageAsJSON = options.json !== false;
  includeTimestamp = options.timestamp !== false;

  // Optionally pass in pre-existing Cloudwatch object
  if (options.cloudwatchlogs) {
    cloudwatchlogs = options.cloudwatchlogs;
  } else {
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
  }

};

module.exports.add = function(log) {
  var logEventMsg = '';

  if (messageAsJSON) {
    var jsonlog = _.clone(log);
    if (!includeTimestamp) jsonlog = _.omit(jsonlog, ['timestamp']);
    logEventMsg = JSON.stringify(jsonlog, null, '  ');
  } else {
    var txtlog = [];
    if (includeTimestamp) txtlog.push(log.timestamp.toISOString());
    txtlog.push(log.level, log.msg, JSON.stringify(log.meta, null, '  '));
    logEventMsg = txtlog.join(' - ');
  }
  logEvents.push({
    message: logEventMsg,
    timestamp: log.timestamp.getTime()
  });

  var lastFree = new Date().getTime();
  function upload() {
    if (logEvents.length <= 0) return;

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
      if (err && err.code != 'ResourceAlreadyExistsException') return cb(err);

      token(cb);
  });
}

function createLogGroup(logGroupName, cb){
  cloudwatchlogs.createLogGroup({
    logGroupName: logGroupName
  }, function(err, data){
      if (err && err.code != 'ResourceAlreadyExistsException') return cb(err);

      findLogStream(logGroupName, logStreamName, cb);
  });
}
