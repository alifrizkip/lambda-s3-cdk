import { APIGatewayProxyHandler } from "aws-lambda";
import { respSuccess } from "../utils/response";

export const main: APIGatewayProxyHandler = async function () {
    return respSuccess({ up: true, status: "✅" }, "success");
};
