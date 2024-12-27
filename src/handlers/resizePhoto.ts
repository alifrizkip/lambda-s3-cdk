import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { S3Event, S3EventRecord } from "aws-lambda";
import sharp = require("sharp");
import { Readable } from "stream";

const s3Client = new S3Client();

export const main = async function (event: S3Event) {
    try {
        await Promise.all(
            event.Records.map(async (record) => {
                await proceedRecord(record);
            })
        );
    } catch (error) {
        console.error("error on proceed records: ", error);
    }
};

async function proceedRecord(record: S3EventRecord) {
    const srcKey = record.s3.object.key;

    let srcFolder = "";
    if (srcKey.includes("/")) {
        srcFolder = srcKey.split("/").shift() ?? "";
    }
    const srcFilename = srcKey.split("/").pop();
    const srcFileExt = srcFilename?.split(".").pop();

    if (srcFilename && srcFilename.indexOf("thumbnail") === 0) {
        console.log("skip thumbnail image: ", srcFilename);
        return;
    }

    if (!["jpg", "jpeg", "png", "webp"].includes(srcFileExt!)) {
        throw new Error("only image file allowed");
    }

    const srcRes = await s3Client.send(
        new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: srcKey,
        })
    );
    const srcStream = srcRes.Body;
    if (!(srcStream instanceof Readable)) {
        throw new Error("unknown src stream type");
    }
    const srcBuffer = Buffer.concat(await srcStream.toArray());

    // resize image
    const dstWidth = 200;
    const dstFolder = "thumbnails";
    const dstFilename = `thumbnail_${srcFilename}`;
    const dstKey = `${dstFolder}/${dstFilename}`;

    const dstBuffer = await sharp(srcBuffer).resize(dstWidth).toBuffer();
    await s3Client.send(
        new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: dstKey,
            Body: dstBuffer,
            ContentType: "image",
        })
    );

    console.log(`Successfully create thumbnail for image: ${srcKey}`);
}
