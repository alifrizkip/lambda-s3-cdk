import { APIGatewayProxyEvent } from "aws-lambda";
import Busboy = require("busboy");

interface MultipartFile {
    filename: string;
    content: Buffer;
    contentType: string;
    encoding: string;
    fieldname: string;
}

type MultipartRequest = { files: MultipartFile[] } & Record<string, string>;

type ParseFn = (event: APIGatewayProxyEvent) => Promise<MultipartRequest>;

const parse: ParseFn = (event) =>
    new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: {
                "content-type":
                    event.headers["content-type"] ||
                    event.headers["Content-Type"],
            },
        });
        const result: MultipartRequest = {
            files: [],
        };

        busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
            const uploadFile: MultipartFile = {
                filename: "",
                content: undefined,
                contentType: "",
                encoding: "",
                fieldname: "",
            };

            file.on("data", (data) => {
                uploadFile.content = data;
            });

            file.on("end", () => {
                if (uploadFile.content) {
                    uploadFile.filename = filename;
                    uploadFile.contentType = mimetype;
                    uploadFile.encoding = encoding;
                    uploadFile.fieldname = fieldname;
                    result.files.push(uploadFile);
                }
            });
        });

        busboy.on("field", (fieldname, value) => {
            result[fieldname] = value;
        });

        busboy.on("error", (error) => {
            reject(error);
        });

        busboy.on("finish", () => {
            resolve(result);
        });

        const encoding =
            event.encoding || (event.isBase64Encoded ? "base64" : "binary");

        busboy.write(event.body, encoding);
        busboy.end();
    });

module.exports.parse = parse;
