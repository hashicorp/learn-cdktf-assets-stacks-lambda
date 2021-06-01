import * as path from "path";
import { Construct } from "constructs";
import { App, TerraformStack, TerraformAsset, AssetType, TerraformOutput } from "cdktf";

import * as aws from '@cdktf/provider-aws';

const randPrefix = "edu"

interface LambdaFunctionConfig {
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

class LambdaStack extends TerraformStack {
  constructor(scope: Construct, name: string, config: LambdaFunctionConfig) {
    super(scope, name);

    new aws.AwsProvider(this, "provider", {
      region: "us-west-2",
    });

    // Create Lambda executable
    const asset = new TerraformAsset(this, "lambda-asset", {
      path: path.resolve(__dirname, config.path),
      type: AssetType.ARCHIVE, // if left empty it infers directory and file
    });

    // Unique bucket name
    const bucketName = `learn-terraform-cdktf-${name}-${randPrefix}`;

    // Create S3 bucket that hosts Lambda executable
    const bucket = new aws.S3Bucket(this, `${name}-bucket`, {
      bucket: bucketName,
    });

    // Upload Lambda zip file to newly created S3 bucket
    const lambdaArchive = new aws.S3BucketObject(this, `${name}-lambda-archive`, {
      bucket: bucket.bucket,
      key: `${config.version}/${asset.fileName}`,
      source: asset.path, // returns a posix path
    });

    // Create Lambda role
    const role = new aws.IamRole(this, "lambda-exec", {
      name: `learn-cdktf-${name}`,
      assumeRolePolicy: JSON.stringify(lambdaRolePolicy)
    })

    // Create Lambda function
    const lambdaFunc = new aws.LambdaFunction(this, `learn-cdktf-lambda-${name}`, {
      functionName: `learn-cdktf-${name}`,
      s3Bucket: bucket.bucket,
      s3Key: lambdaArchive.key,
      handler: config.handler,
      runtime: config.runtime,
      role: role.arn
    });

    // Create and configure API gateway
    const api = new aws.Apigatewayv2Api(this, `api-gw-${name}`, {
      name: name,
      protocolType: "HTTP",
      target: lambdaFunc.arn
    })

    new aws.LambdaPermission(this, `${name}-apigw`, {
      functionName: lambdaFunc.functionName,
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      sourceArn: `${api.executionArn}/*/*`,
    })

    new TerraformOutput(this, 'url', {
      value: api.apiEndpoint
    });

  }
}

const app = new App();

new LambdaStack(app, 'lambda-hello-world', {
  path: "../lambda-hello-world/dist",
  handler: "index.handler",
  runtime: "nodejs10.x",
  stageName: "hello-world",
  version: "v0.0.2"
});

new LambdaStack(app, 'lambda-hello-name', {
  path: "../lambda-hello-name/dist",
  handler: "index.handler",
  runtime: "nodejs10.x",
  stageName: "hello-name",
  version: "v0.0.1"
});

app.synth();
