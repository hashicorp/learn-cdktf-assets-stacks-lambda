import * as path from "path";
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";

import * as aws from '@cdktf/provider-aws';

import { NodejsFunction } from './lib/nodejs-lambda'

interface LambdaFunctionConfig {
  name: string,
  path: string,
  handler: string,
  runtime: string,
  stageName: string,
  version: string,
}

const lambdaRolePolicy = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new aws.AwsProvider(this, "provider", {
      region: "us-west-2",
    });

    // Create unique S3 bucket that hosts Lambda executable
    const bucket = new aws.S3Bucket(this, "bucket", {
      bucketPrefix: `learn-cdktf-${name}`,
    });

    this.addLambda(bucket, {
      name: "lambda-hello-world",
      path: "../lambda-hello-world/dist",
      handler: "index.handler",
      runtime: "nodejs16.x",
      stageName: "hello-world",
      version: "v0.0.2"
    })

    this.addLambda(bucket, {
      name: 'lambda-hello-name',
      path: "../lambda-hello-name/dist",
      handler: "index.handler",
      runtime: "nodejs16.x",
      stageName: "hello-name",
      version: "v0.0.1"
    })
  }

  addLambda(bucket: aws.S3Bucket, config: LambdaFunctionConfig) {
    const nodeJsFunction = new NodejsFunction(this, `${config.name}-nodejs`, {
      handler: 'index.foo',
      path: path.join(__dirname, '..', config.name)
    })

    // Upload Lambda zip file to newly created S3 bucket
    const lambdaArchive = new aws.S3BucketObject(this, `${config.name}-lambda-archive-${nodeJsFunction.asset.assetHash}`, {
      bucket: bucket.bucket,
      key: `${config.name}-lambda-archive-${nodeJsFunction.asset.assetHash}`,
      source: nodeJsFunction.asset.path, // returns a posix path
    });

    // Create Lambda role
    const role = new aws.IamRole(this, `${config.name}-role`, {
      name: `${config.name}`,
      assumeRolePolicy: JSON.stringify(lambdaRolePolicy)
    })

    // Add execution role for lambda to write to CloudWatch logs
    new aws.IamRolePolicyAttachment(this, `${config.name}-policy`, {
      policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      role: role.name
    })

    // Create Lambda function
    const lambdaFunc = new aws.LambdaFunction(this, `${config.name}-lambda`, {
      functionName: `${config.name}`,
      s3Bucket: bucket.bucket,
      s3Key: lambdaArchive.key,
      handler: config.handler,
      runtime: config.runtime,
      role: role.arn
    });

    // Create and configure API gateway
    const api = new aws.Apigatewayv2Api(this, `${config.name}-api-gw`, {
      name: config.name,
      protocolType: "HTTP",
      target: lambdaFunc.arn
    })

    new aws.LambdaPermission(this, `${config.name}-apigw-permission`, {
      functionName: lambdaFunc.functionName,
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",

      sourceArn: `${api.executionArn}/*/*`,
    })

    new TerraformOutput(this, `${config.name}-url`, {
      value: api.apiEndpoint
    });
  }
}


const app = new App();

new MyStack(app, "test-stack")

app.synth();
