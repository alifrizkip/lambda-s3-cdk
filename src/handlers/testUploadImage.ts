import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { respSuccess } from "../utils/response";

export const main: APIGatewayProxyHandler = async function (
    event: APIGatewayProxyEvent
) {
    return respSuccess(null, "testUploadImage");
};
