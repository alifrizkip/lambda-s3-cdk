import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { TEST_USER_ID } from "../config";
import { getDynamoDBClient } from "../utils/dynamoDBClient";
import { respError, respSuccess } from "../utils/response";
import { z } from "zod";
import { ulid } from "ulid";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

export const main: APIGatewayProxyHandler = async function (
    event: APIGatewayProxyEvent
) {
    const dbClient = getDynamoDBClient();
    // const userSub = event.requestContext.authorizer?.claims.sub;
    const userSub = TEST_USER_ID;

    try {
        const reqBody = JSON.parse(event.body ?? "{}");
        const photoSchema = z
            .object({
                title: z.string(),
                description: z.string().optional(),
                photo: z.string(),
            })
            .required();
        const validData = photoSchema.parse(reqBody);

        const photoId = ulid();
        const data = {
            PK: `USER#${userSub}`,
            SK: `PHOTO#${photoId}`,
            TYPE: "PHOTO",
            id: photoId,
            title: validData.title,
            description: validData.description,
            photo: validData.photo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const cmd = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: data,
        });
        await dbClient.send(cmd);

        const resData = {
            id: data.id,
            title: data.title,
            description: data.description,
            photo: data.photo,
            smallPhoto: null,
            largePhoto: null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };

        return respSuccess(resData, "success create photo", 201);
    } catch (error) {
        console.error(error);
        if (error instanceof z.ZodError) {
            return respError(error.format(), "unprocessable entity", 422);
        }

        return respError(null, "internal server error", 500, error as Error);
    }
};
