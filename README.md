# winston-cloudwatch

Send logs to Amazon Cloudwatch using Winston.

This is a fork of [lazywithclass/winston-cloudwatch](https://github.com/lazywithclass/winston-cloudwatch).

## Installing

```sh
$ npm install --save winston deedw/winston-cloudwatch
```

## Configuring

You can pass in a pre-configured AWS.CloudWatchLogs object or rely on the module to create and configure the CloudWatchLogs connection.

AWS configuration works using `~/.aws/credentials` as written in [AWS JavaScript SDK guide](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_AWS_Credentials).

As specified [in the docs](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_the_Region)

 > The AWS SDK for Node.js doesn't select the region by default.

so you should take care of that. See the examples below.

If either the group or the stream do not exist they will be created for you.

## Usage

Please refer to [AWS CloudWatch Logs documentation](http://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutLogEvents.html) for possible contraints that might affect you.
Also have a look at [AWS CloudWatch Logs limits](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/cloudwatch_limits.html).

```js
var winston = require('winston'),
  options = {
    logGroupName: 'your-log-group',
    logStreamName: 'your-log-stream'
  };
winston.add(require('winston-cloudwatch'), options);

winston.error('log this', { and: 'this too' });
```

### Options

This is the list of options you could pass as argument to `winston.add`:

 * level - defaults to `info`
 * logGroupName
 * logStreamName
 * cloudwatchlogs - preconfigured CloudWatchLogs object. Optional
 * awsAccessKeyId - ignored if cloudwatchlogs object provided
 * awsSecretKey - ignored if cloudwatchlogs object provided
 * awsRegion - ignored if cloudwatchlogs object provided
 * json - `boolean`, format the message as JSON. Defaults to true
 * timestamp - `boolean`, include timestamp in log entry. Defaults to true

AWS keys are usually picked by aws-sdk so you don't have to specify them, I provided the option just in case. Remember that `awsRegion` should still be set if you're using IAM roles.

Please refer to [the provided example](https://github.com/lazywithclass/winston-cloudwatch/blob/master/test/example.js) for more hints.
