import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { TEST_USER_ID } from "../config";
import { z } from "zod";
import { v4 } from "uuid";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { respError, respSuccess } from "../utils/response";

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB

export const main: APIGatewayProxyHandler = async function (
    event: APIGatewayProxyEvent
) {
    // const userSub = event.requestContext.authorizer?.claims.sub;
    const userSub = TEST_USER_ID;

    try {
        const reqBody = JSON.parse(event.body ?? "{}");

        const fileSchema = z
            .object({
                md5HashFile: z.string(),
                fileExtension: z
                    .string()
                    .refine(
                        (ext) => ["jpg", "jpeg", "png", "webp"].includes(ext),
                        {
                            message:
                                "Invalid file extension. Only jpg, jpeg, png, & webp",
                        }
                    ),
            })
            .required();
        const passedData = fileSchema.parse(reqBody);

        const s3Key = `${userSub}/${v4()}.${passedData.fileExtension}`;

        const s3Client = new S3Client();
        const { url, fields } = await createPresignedPost(s3Client, {
            Bucket: process.env.BUCKET_NAME!,
            Key: s3Key,
            Expires: 3600,
            Conditions: [
                { "Content-MD5": passedData.md5HashFile },
                ["content-length-range", 1024, MAX_FILE_SIZE],
                ["starts-with", "$Content-Type", "image/"],
            ],
        });

        return respSuccess({ file: s3Key, url, fields }, "success");
    } catch (error) {
        console.log(error);
        if (error instanceof z.ZodError) {
            return respError(error.format(), "unprocessable entity", 422);
        }

        return respError(null, "internal server error", 500, error as Error);
    }
};
