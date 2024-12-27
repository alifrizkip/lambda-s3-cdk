import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { respError, respSuccess } from "../utils/response";
import { TEST_USER_ID } from "../config";
import { z } from "zod";
import { v4 } from "uuid";

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
];

export const main: APIGatewayProxyHandler = async function (
    event: APIGatewayProxyEvent
) {
    // const userSub = event.requestContext.authorizer?.claims.sub;
    const userSub = TEST_USER_ID;

    try {
        const reqBody = JSON.parse(event.body ?? "{}");

        const fileSchema = z
            .object({
                fileSize: z.number().min(1024).max(MAX_FILE_SIZE, {
                    message: "Max file size is 5MB",
                }),
                fileType: z
                    .string()
                    .refine((mime) => ALLOWED_MIME_TYPES.includes(mime), {
                        message:
                            "Invalid type. Only JPG, JPEG, PNG, and WebP are allowed.",
                    }),
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

        const s3Key = `photos/${userSub}_${v4()}.${passedData.fileExtension}`;

        const s3Client = new S3Client();
        const cmd = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: s3Key,
        });
        const url = await getSignedUrl(s3Client, cmd, {
            expiresIn: 3600,
        });

        return respSuccess({ url, file: s3Key }, "success");
    } catch (error) {
        console.log(error);
        if (error instanceof z.ZodError) {
            return respError(error.format(), "unprocessable entity", 422);
        }

        return respError(null, "internal server error", 500, error as Error);
    }
};
