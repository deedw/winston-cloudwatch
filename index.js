var util = require('util'),
    winston = require('winston'),
    cloudwatchIntegration = require('./lib/cloudwatch-integration'),
    _ = require('lodash');

var CloudWatch = winston.transports.CloudWatch = function(options) {
  this.name = 'CloudWatch';
  this.level = options.level || 'info';

  var customProps = ['logGroupName', 'logStreamName', 'awsAccessKeyId', 'awsSecretKey',
        'awsRegion', 'proxyServer'];

  winston.Transport.call(this, _.omit(options, customProps));

  cloudwatchIntegration.init(options);
};

util.inherits(CloudWatch, winston.Transport);

CloudWatch.prototype.log = function(level, msg, meta, callback) {
  var log = { level: level, msg: msg, timestamp: new Date(), meta: meta };
  cloudwatchIntegration.add(log);

  // do not wait, just return right away
  callback(null, true);
};

module.exports = CloudWatch;
