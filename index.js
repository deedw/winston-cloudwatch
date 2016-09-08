'use strict';

var util = require('util'),
    winston = require('winston'),
    AWS = require('aws-sdk'),
    cloudWatchIntegration = require('./lib/cloudwatch-integration'),
    _ = require('lodash');


var WinstonCloudWatch = function(options) {
  var customProps = ['logGroupName', 'logStreamName', 'awsAccessKeyId', 'awsSecretKey',
        'awsRegion', 'proxyServer', 'cloudwatchlogs', 'uploadRate', 'messageFormatter',
        'errorHandler'];

  winston.Transport.call(this, _.omit(options, customProps));
  this.level = options.level || 'info';
  this.name = options.name || 'CloudWatch';
  this.logGroupName = options.logGroupName;
  this.logStreamName = options.logStreamName;
  this.cloudwatchlogs = options.cloudwatchlogs;
  this.includeTimestamp = options.timestamp !== false;
  this.jsonMessage = options.jsonMessage; // for backwards compatibility
  if (_.has(options), "json") this.jsonMessage = options.json;
  this.jsonMessage = options.json || options.json;
  var awsAccessKeyId = options.awsAccessKeyId;
  var awsSecretKey = options.awsSecretKey;
  var awsRegion = options.awsRegion;
  var messageFormatter = options.messageFormatter ? options.messageFormatter : function(log) {
      var txtlog = [];
      if (this.includeTimestamp) txtlog.push(log.timestamp.toISOString());
      txtlog = txtlog.concat([ log.level, log.msg, stringify(log.meta) ]);
      return txtlog.join(' - ');
  };
  this.formatMessage = this.jsonMessage ? stringify : messageFormatter;
  var proxyServer = this.proxyServer = options.proxyServer;
  this.uploadRate = options.uploadRate || 2000;
  this.logEvents = [];
  this.errorHandler = options.errorHandler;

  if (this.proxyServer) {
    AWS.config.update({
      httpOptions: {
        agent: require('proxy-agent')(this.proxyServer)
      }
    });
  }

  var config = {};

  if (!this.cloudwatchlogs) {
    if (awsAccessKeyId && awsSecretKey && awsRegion) {
      config = { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretKey, region: awsRegion };
    } else if (awsRegion && !awsAccessKeyId && !awsSecretKey) {
      // Amazon SDK will automatically pull access credentials
      // from IAM Role when running on EC2 but region still
      // needs to be configured
      config = { region: awsRegion };
    }

    if(options.awsOptions){
      config = _.assign(config, options.awsOptions);
    }

    this.cloudwatchlogs = new AWS.CloudWatchLogs(config);
  }
};

util.inherits(WinstonCloudWatch, winston.Transport);

WinstonCloudWatch.prototype.log = function(level, msg, meta, callback) {
  var log = { level: level, msg: msg, timestamp: new Date(), meta: meta };
  this.add(log);

  // do not wait, just return right away
  callback(null, true);
};

WinstonCloudWatch.prototype.add = function(log) {
  var self = this;

  log = _.clone(log);
  var timestamp = log.timestamp;
  if (!this.includeTimestamp) log = _.omit(log, ['timestamp']);

  self.logEvents.push({
    message: self.formatMessage(log),
    timestamp: timestamp.getTime()
  });

  if (!self.intervalId) {
    self.intervalId = setInterval(function() {
      cloudWatchIntegration.upload(
        self.cloudwatchlogs,
        self.logGroupName,
        self.logStreamName,
        self.logEvents,
        function(err) {
          if (err) {
            if (self.errorHandler) {
              return self.errorHandler(err);
            } else {
              return console.error(err);
            }
          }
        });
    }, self.uploadRate);
  }
};

function stringify(o) { return JSON.stringify(o, null, '  '); }

module.exports = WinstonCloudWatch;
