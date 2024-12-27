import { DynamoDBStreamEvent } from "aws-lambda";
import { getEsClient } from "../utils/elasticsearch";

export const main = async function (event: DynamoDBStreamEvent) {
    console.log("incoming dynamodb stream event");

    const esClient = getEsClient();

    await Promise.all(
        event.Records.map(async (record) => {
            const recordStr = JSON.stringify(record);
            console.log(recordStr);
        })
    );
};
