# winston-cloudwatch [v1.5.2](https://github.com/deedw/winston-cloudwatch/blob/master/CHANGELOG.md#150)

Send logs to Amazon Cloudwatch using Winston.

 * [Features](#features)
 * [Installing](#installing)
 * [Configuring](#configuring)
 * [Usage](#usage)
 * [Options](#options)
 * [Examples](#examples)

### Features

 * logging to AWS CloudWatchLogs
 * logging to multiple streams
 * logging with multiple levels
 * creates group / stream if they don't exist
 * doesn't try to buffer your unsent logs (you should use more streams)
 * waits for an upload to suceed before trying the next
 * truncates messages that are too big
 * batches messages taking care of the AWS limit
 * [see options for more](#options)
 * 100% code coverage in lib layer (WIP for the rest)

### Installing

```sh
$ npm install --save deedw/winston winston-cloudwatch
```

### Configuring

AWS configuration works using `~/.aws/credentials` as written in [AWS JavaScript SDK guide](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_AWS_Credentials).

As specified [in the docs](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_the_Region):

 > The AWS SDK for Node.js doesn't select the region by default.

so you should take care of that. See the examples below.

If either the group or the stream do not exist they will be created for you.

For displaying time you should click on the gear in the top right corner on page with your logs and enable checkbox "Creation Time".

### Usage

Please refer to [AWS CloudWatch Logs documentation](http://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutLogEvents.html) for possible contraints that might affect you.
Also have a look at [AWS CloudWatch Logs limits](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/cloudwatch_limits.html).

```js
var winston = require('winston'),
    WinstonCloudWatch = require('../index');

winston.add(WinstonCloudWatch, {
  logGroupName: 'testing',
  logStreamName: 'first'
});

winston.error('1');
```

You could also log to multiple streams with / without different log levels, have a look at [this example](https://github.com/deedw/winston-cloudwatch/blob/master/examples/multiple-loggers.js).

### Options

This is the list of options you could pass as argument to `winston.add`:

 * level - defaults to `info`
 * logGroupName
 * logStreamName
 * cloudwatchlogs - `object`, pre-configured AWS CloudWatchLogs object. If provided then awsAccessKeyId, awsSecretKey, awsRegion, awsOptions & proxyServer are ignored
 * awsAccessKeyId
 * awsSecretKey
 * awsRegion
 * awsOptions - `object`, params as per [docs](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudWatchLogs.html#constructor-property), values in `awsOptions` are overridden by any other if specified, run [this example](https://github.com/lazywithclass/winston-cloudwatch/blob/master/examples/simple-with-aws-options.js) to have a look
 * timestamp - `boolean`, include a timestamp in the log message. Defaults to `true`
 * json - `boolean`, format the message as JSON
 * messageFormatter - `function`, format the message the way you like. This function will receive a `log` object that has the following properties: `level`, `msg`, and `meta`, which are passed by winston to the `log` function (see [CustomLogger.prototype.log as an example](https://github.com/winstonjs/winston#adding-custom-transports)). json should be false for this option to work.
 * proxyServer - `String`, use `proxyServer` as proxy in httpOptions. If using this, you will need to add "proxy-agent" (v2.0.0) to your application dependencies
 * uploadRate - `Number`, how often logs have to be sent to AWS. Be careful of not hitting [AWS CloudWatch Logs limits](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/cloudwatch_limits.html), the default is 2000ms.
 * errorHandler - `function`, invoked with an error object, if not provided the error is sent to `console.error`

AWS keys are usually picked by aws-sdk so you don't have to specify them, I provided the option just in case. Remember that `awsRegion` should still be set if you're using IAM roles.

### Examples

Please refer to [the provided examples](https://github.com/deedw/winston-cloudwatch/blob/master/examples) for more hints.

Note that when running the examples the process will not exit because of the [`setInterval`](https://github.com/lazywithclass/winston-cloudwatch/blob/master/index.js#L73)
