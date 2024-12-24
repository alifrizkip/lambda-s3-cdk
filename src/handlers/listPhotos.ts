import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { getDynamoDBClient } from "../utils/dynamoDBClient";
import { respError, respSuccess } from "../utils/response";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { TEST_USER_ID } from "../config";

export const main: APIGatewayProxyHandler = async function (
    event: APIGatewayProxyEvent
) {
    const dbClient = getDynamoDBClient();
    // const userSub = event.requestContext.authorizer?.claims.sub;
    const userSub = TEST_USER_ID;

    try {
        const cmd = new QueryCommand({
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "PK=:pk",
            ExpressionAttributeValues: {
                ":pk": `USER#${userSub}`,
            },
        });
        const records = await dbClient.send(cmd);
        const datas = records.Items!.map((t) => {
            const {
                id,
                title,
                description,
                originalPhoto,
                smallPhoto,
                largePhoto,
                createdAt,
                updatedAt,
            } = t;
            return {
                id,
                title,
                description,
                originalPhoto,
                smallPhoto,
                largePhoto,
                createdAt,
                updatedAt,
            };
        });

        return respSuccess(datas, "");
    } catch (error) {
        console.error(error);
        return respError(null, "internal server error", 500, error as Error);
    }
};
