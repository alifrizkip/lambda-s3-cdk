import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { join as pathJoin } from "path";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import {
    AttributeType,
    BillingMode,
    StreamViewType,
    Table,
} from "aws-cdk-lib/aws-dynamodb";
import {
    DynamoEventSource,
    S3EventSource,
} from "aws-cdk-lib/aws-lambda-event-sources";

const RESOURCE_PREFIX = "LAMBDA_S3";

export class LambdaS3Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const s3Bucket = new s3.Bucket(this, `${RESOURCE_PREFIX}-Bucket`, {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        // setup dynamodb
        const photosTable = new Table(this, `${RESOURCE_PREFIX}-Table`, {
            partitionKey: { name: "PK", type: AttributeType.STRING },
            sortKey: { name: "SK", type: AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST,
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
        });

        // setup lambda function
        const envVars = {
            BUCKET_NAME: s3Bucket.bucketName,
            TABLE_NAME: photosTable.tableName,
            ELASTICSEARCH_URL: "",
        };
        const rootLambda = this.createLambdaFunction("root", envVars);
        const generateUploadUrlLambda = this.createLambdaFunction(
            "generateUploadUrl",
            envVars
        );
        const createPresignedPostLambda = this.createLambdaFunction(
            "createPresignedPost",
            envVars
        );
        const listPhotosLambda = this.createLambdaFunction(
            "listPhotos",
            envVars
        );
        const createPhotoLambda = this.createLambdaFunction(
            "createPhoto",
            envVars
        );
        const resizePhotoLambda = new NodejsFunction(
            this,
            `${RESOURCE_PREFIX}-resizePhoto`,
            {
                runtime: Runtime.NODEJS_22_X,
                entry: pathJoin(
                    __dirname,
                    "..",
                    "src",
                    "handlers",
                    `resizePhoto.ts`
                ),
                handler: "main",
                environment: envVars,
                bundling: {
                    nodeModules: ["sharp"],
                },
                timeout: cdk.Duration.seconds(60),
            }
        );
        const syncDataLambda = this.createLambdaFunction("syncData", envVars);

        photosTable.grantReadData(listPhotosLambda);
        photosTable.grantReadWriteData(createPhotoLambda);

        const s3PutEventSource = new S3EventSource(s3Bucket, {
            events: [s3.EventType.OBJECT_CREATED_PUT],
            filters: [{ prefix: "photos/" }],
        });
        resizePhotoLambda.addEventSource(s3PutEventSource);

        const dynamodbEventSource = new DynamoEventSource(photosTable, {
            startingPosition: StartingPosition.LATEST,
        });
        syncDataLambda.addEventSource(dynamodbEventSource);

        // setup api gateway
        const api = new RestApi(this, `${RESOURCE_PREFIX}-RestApi`, {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowHeaders: [
                    ...Cors.DEFAULT_HEADERS,
                    "Access-Control-Allow-Origin",
                ],
            },
        });
        const rootPath = api.root;
        const photosPath = rootPath.addResource("photos");
        const uploadUrlPath = rootPath.addResource("upload-url");
        const presignedUrlPath = rootPath.addResource("presigned-url");

        const rootIntegration = new LambdaIntegration(rootLambda);
        const generateUploadUrlIntegration = new LambdaIntegration(
            generateUploadUrlLambda
        );
        const createPresignedPostIntegration = new LambdaIntegration(
            createPresignedPostLambda
        );
        const listPhotosIntegration = new LambdaIntegration(listPhotosLambda);
        const createPhotoIntegration = new LambdaIntegration(createPhotoLambda);

        // '/'
        rootPath.addMethod("GET", rootIntegration);

        // '/upload-url'
        uploadUrlPath.addMethod("POST", generateUploadUrlIntegration);

        // '/presigned-url'
        presignedUrlPath.addMethod("POST", createPresignedPostIntegration);

        // '/photos'
        photosPath.addMethod("GET", listPhotosIntegration);
        photosPath.addMethod("POST", createPhotoIntegration);

        // grant access
        s3Bucket.grantWrite(generateUploadUrlLambda);
        s3Bucket.grantWrite(createPresignedPostLambda);
        s3Bucket.grantReadWrite(resizePhotoLambda);
    }

    createLambdaFunction(name: string, env?: Record<string, string>) {
        return new NodejsFunction(this, `${RESOURCE_PREFIX}-${name}`, {
            runtime: Runtime.NODEJS_22_X,
            entry: pathJoin(__dirname, "..", "src", "handlers", `${name}.ts`),
            handler: "main",
            environment: env,
        });
    }
}
