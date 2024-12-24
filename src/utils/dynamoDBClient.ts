import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let ddbDocClient: DynamoDBDocumentClient;

export const getDynamoDBClient = (): DynamoDBDocumentClient => {
    if (ddbDocClient) {
        return ddbDocClient;
    }

    const client = new DynamoDBClient();
    ddbDocClient = DynamoDBDocumentClient.from(client);

    return ddbDocClient;
};
