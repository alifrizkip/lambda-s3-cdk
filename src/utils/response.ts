import { APIGatewayProxyResult } from "aws-lambda";
import { ZodIssue } from "zod";

export function respSuccess(
    data: Record<string, unknown> | Record<string, unknown>[] | null,
    message: string,
    statusCode: number = 200
): APIGatewayProxyResult {
    return {
        statusCode,
        body: JSON.stringify({
            success: true,
            message,
            data,
        }),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    };
}

export function respError(
    data:
        | Record<string, unknown>
        | Record<string, unknown>[]
        | ZodIssue[]
        | null,
    message: string,
    statusCode: number,
    err?: Error
) {
    const body = {
        success: false,
        message,
        data,
        __error__: err,
    };

    return {
        statusCode,
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    };
}
