# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

-   `npm run build` compile typescript to js
-   `npm run watch` watch for changes and compile
-   `npm run test` perform the jest unit tests
-   `npx cdk deploy` deploy this stack to your default AWS account/region
-   `npx cdk diff` compare deployed stack with current state
-   `npx cdk synth` emits the synthesized CloudFormation template

## User Requirements

-   User can upload image (title, description, image)
-   User can list images they've uploaded
-   User can delete image they've uploaded

## Tech Requirements

-   Every image uploaded will be rezise to 3 different width. Small: 100. Medium: 512. Large: 1200.
-   File uploaded in S3 bucket will be grouped by userId
