import { Client } from "@elastic/elasticsearch";

let esClient: Client;

export const getEsClient = (): Client => {
    if (esClient) {
        return esClient;
    }

    esClient = new Client({ node: process.env.ELASTICSEARCH_URL });

    return esClient;
};
