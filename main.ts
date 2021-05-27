import * as path from "path";
import { Construct } from "constructs";
import { App, TerraformStack, TerraformAsset, AssetType, TerraformOutput } from "cdktf";

// AWS specific imports
import { AwsProvider } from "./cdktf/.gen/providers/aws/aws-provider";
import { S3Bucket } from "./cdktf/.gen/providers/aws/s3-bucket";
import { S3BucketObject } from "./cdktf/.gen/providers/aws/s3-bucket-object";
import { IamRole } from "./cdktf/.gen/providers/aws/iam-role";
import { LambdaFunction } from "./cdktf/.gen/providers/aws/lambda-function";
import { LambdaPermission } from "./cdktf/.gen/providers/aws/lambda-permission";

// API Gateway
import { ApiGatewayRestApi } from "./cdktf/.gen/providers/aws/api-gateway-rest-api";
import { ApiGatewayResource } from "./cdktf/.gen/providers/aws/api-gateway-resource";
import { ApiGatewayMethod } from "./cdktf/.gen/providers/aws/api-gateway-method";
import { ApiGatewayIntegration } from "./cdktf/.gen/providers/aws/api-gateway-integration";
import { ApiGatewayDeployment } from "./cdktf/.gen/providers/aws/api-gateway-deployment";

const randPrefix = "dos"

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

class LambdaStack extends TerraformStack {
  constructor(scope: Construct, name: string, config: LambdaFunctionConfig) {
    super(scope, name);

    const bucketName = `learn-terraform-cdktf-${config.name}-${randPrefix}`;

    new AwsProvider(this, "provider", {
      region: "us-west-2",
    });

    // Create S3 bucket that hosts Lambda executable
    const bucket = new S3Bucket(this, `${config.name}-bucket`, {
      bucket: bucketName,
    });

    // Create Lambda executable
    const asset = new TerraformAsset(this, "lambda-asset", {
      path: path.resolve(__dirname, config.path),
      type: AssetType.ARCHIVE, // if left empty it infers directory and file
    });

    // Upload Lambda zip file to newly created S3 bucket
    const lambdaArchive = new S3BucketObject(this, `${config.name}-lambda-archive`, {
      bucket: bucket.bucket,
      key: `${config.version}/${asset.fileName}`,
      source: asset.path, // returns a posix path
    });

    // Create Lambda role
    const lambdaExec = new IamRole(this, "lambda-exec", {
      name: "learn-cdktf-lambda",
      assumeRolePolicy: JSON.stringify(lambdaRolePolicy)
    })

    // Create Lambda function
    const lambdaFunc = new LambdaFunction(this, `learn-cdktf-lambda-${config.name}`, {
      functionName: `learn-cdktf-lambda-${config.name}`,
      s3Bucket: bucket.bucket,
      s3Key: lambdaArchive.key,
      handler: config.handler,
      runtime: config.runtime,
      role: lambdaExec.arn
    });


    // Create and configure API gateway
    const gateWayRestApi = new ApiGatewayRestApi(this, config.name, {
      name: name,
      description: "Terraform Serverless Application Example"
    });

    const gatewayResourceProxy = new ApiGatewayResource(this, `${config.name}-proxy`, {
      restApiId: gateWayRestApi.id,
      parentId: gateWayRestApi.rootResourceId,
      pathPart: "{proxy+}"
    })

    const gatewayMethodProxy = new ApiGatewayMethod(this, `${config.name}-method-proxy`, {
      restApiId: gateWayRestApi.id,
      resourceId: gatewayResourceProxy.id,
      httpMethod: "ANY",
      authorization: "NONE"
    })

    const gatewayIntegrationLambda = new ApiGatewayIntegration(this, `${config.name}-lambda`, {
      restApiId: gateWayRestApi.id,
      resourceId: gatewayMethodProxy.resourceId,
      httpMethod: gatewayMethodProxy.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: lambdaFunc.invokeArn
    })

    const gatewayMethodProxyRoot = new ApiGatewayMethod(this, `${config.name}-proxy-root`, {
      restApiId: gateWayRestApi.id,
      resourceId: gateWayRestApi.rootResourceId,
      httpMethod: "ANY",
      authorization: "NONE"
    })

    const gatewayIntegrationLambdaRoot = new ApiGatewayIntegration(this, `${config.name}-lambda-root`, {
      restApiId: gateWayRestApi.id,
      resourceId: gatewayMethodProxyRoot.resourceId,
      httpMethod: gatewayMethodProxyRoot.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: lambdaFunc.invokeArn
    })

    const gatewayDeployment = new ApiGatewayDeployment(this, `${config.name}-deployment`, {
      restApiId: gateWayRestApi.id,
      stageName: config.stageName,
      dependsOn: [gatewayIntegrationLambda, gatewayIntegrationLambdaRoot],
    })

    new LambdaPermission(this, `${config.name}-apigw`, {
      statementId: "AllowAPIGatewayInvoke",
      action: "lambda:InvokeFunction",
      functionName: lambdaFunc.functionName,
      principal: "apigateway.amazonaws.com",
      sourceArn: `${gateWayRestApi.executionArn}/*/*`,
    })

    new TerraformOutput(this, 'base_url', {
      value: gatewayDeployment.invokeUrl
    });

  }
}

const app = new App();
new LambdaStack(app, 'learn-terraform-cdktf-assets-stacks-lambda', {
  name: "lambda-hello-world",
  path: "./lambda-hello-world/dist",
  handler: "index.handler",
  runtime: "nodejs10.x",
  stageName: "hello-world",
  version: "v0.0.1"
});

app.synth();
