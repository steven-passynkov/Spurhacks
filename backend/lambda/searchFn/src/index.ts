import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleError, productSchema, ServerError } from './utils';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

const AWS_REGION = process.env.AWS_REGION as string;
const OPENSEARCH_COLLECTION_ENDPOINT = process.env.OPENSEARCH_COLLECTION_ENDPOINT as string;
const INDEX_NAME = process.env.INDEX_NAME as string;
const S3_BUCKET = process.env.S3_BUCKET as string;
const GOOGLE_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT as string;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID as string;

const client = new Client({
    ...AwsSigv4Signer({
        region: AWS_REGION,
        service: 'es',
        getCredentials: () => defaultProvider()()
    }),
    node: OPENSEARCH_COLLECTION_ENDPOINT
});

const s3 = new S3Client({region: AWS_REGION});

const googleAuth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
    credentials: JSON.parse(GOOGLE_SERVICE_ACCOUNT)
});

const allowedFields = [
    'sku', 'companyId', 'embedding', 'name', 'description', 'category', 'brand', 'images',
    'price', 'currency', 'createdAt', 'updatedAt', 'inStock', 'reviews', 'location'
];

async function uploadImages(images: string[], companyId: string, sku: string): Promise<string[]> {
    return Promise.all(images.map(async (img, idx) => {
        let buffer: Buffer, contentType: string, extension: string;
        if (/^https?:\/\//.test(img)) {
            const response = await axios.get(img, {responseType: 'arraybuffer'});
            buffer = Buffer.from(response.data);
            contentType = response.headers['content-type'] || 'application/octet-stream';
            extension = contentType.split('/')[1] || 'jpg';
        } else if (/^data:image\/([a-zA-Z]+);base64,/.test(img)) {
            const match = img.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
            if (!match) throw new ServerError(400, 'Invalid base64 image string');
            extension = match[1];
            buffer = Buffer.from(match[2], 'base64');
            contentType = `image/${extension}`;
        } else {
            buffer = Buffer.from(img, 'base64');
            extension = 'jpg';
            contentType = 'image/jpeg';
        }
        const key = `${companyId}/${sku}_${idx}.${extension}`;
        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType
        }));
        return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    }));
}

async function fetchEmbedding(doc: Record<string, any>, accessToken: string): Promise<number[]> {
    const response = await fetch(
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/text-embedding-005:predict`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                instances: [
                    {
                        task_type: 'RETRIEVAL_QUERY',
                        content: JSON.stringify(doc)
                    }
                ]
            })
        }
    );
    if (!response.ok) {
        const errorText = await response.text();
        throw new ServerError(500, `Failed to fetch embedding: ${errorText}`);
    }
    const embeddingJson = await response.json();
    const values = embeddingJson?.predictions?.[0]?.embeddings?.values;
    if (!Array.isArray(values)) throw new ServerError(500, 'Invalid embedding response');
    return values;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.info(`EVENT: ${JSON.stringify(event, null, 2)}`);

    const invokedEndpoint = `${event.httpMethod} ${event.resource}`;
    let statusCode = 200;
    let body: any;
    const companyId = event.headers['company-id'];

    try {
        if (!companyId || typeof companyId !== 'string' || !companyId.trim()) {
            throw new ServerError(400, 'Missing or invalid company-id header');
        }

        const googleClient = await googleAuth.getClient();
        const googleAccessToken = (await googleClient.getAccessToken()).token;
        if (!googleAccessToken) {
            throw new ServerError(500, 'Failed to obtain Google access token');
        }

        switch (invokedEndpoint) {
            case 'GET /search': {
                const sizeParam = event.queryStringParameters?.size;
                let size = 4;
                if (sizeParam !== undefined) {
                    const parsedSize = parseInt(sizeParam, 10);
                    if (isNaN(parsedSize) || parsedSize <= 0) {
                        throw new ServerError(400, 'Invalid size parameter');
                    }
                    size = parsedSize;
                }
                const randomSeed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                const response = await client.search({
                    index: INDEX_NAME,
                    size,
                    body: {
                        query: {
                            function_score: {
                                query: {
                                    bool: {
                                        must: [{match: {companyId}}]
                                    }
                                },
                                functions: [{random_score: {seed: randomSeed}}]
                            }
                        }
                    }
                });
                const items = response.body?.hits?.hits?.map((hit: any) => {
                    if (hit._source) {
                        const {embedding, ...rest} = hit._source;
                        return rest;
                    }
                    return {};
                }) || [];
                body = items;
                break;
            }

            case 'POST /search': {
                if (!event.body) throw new ServerError(400, 'Missing request body');
                let data: any;
                try {
                    data = JSON.parse(event.body);
                } catch {
                    throw new ServerError(400, 'Invalid JSON in request body');
                }
                const items = Array.isArray(data) ? data : [data];
                const results = await Promise.all(items.map(async (item) => {
                    const parsed = productSchema.safeParse(item);
                    if (!parsed.success) return {success: false, error: parsed.error.errors};
                    let doc = parsed.data as Record<string, any>;
                    doc.companyId = companyId;

                    if (doc.images && Array.isArray(doc.images) && doc.images.length > 0) {
                        try {
                            doc.images = await uploadImages(doc.images, companyId, doc.sku);
                        } catch {
                            throw new ServerError(500, 'Failed to upload one or more images');
                        }
                    }

                    const {images, ...docWithoutImages} = doc;
                    try {
                        doc.embedding = await fetchEmbedding(docWithoutImages, googleAccessToken);
                    } catch (e) {
                        throw new ServerError(500, 'Failed to get embedding');
                    }

                    const now = new Date().toISOString();
                    doc.createdAt = now;
                    doc.updatedAt = now;

                    const filteredDoc: any = {};
                    for (const key of allowedFields) {
                        if (doc[key] !== undefined) filteredDoc[key] = doc[key];
                    }

                    try {
                        await client.index({
                            index: INDEX_NAME,
                            body: filteredDoc
                        });
                        return {success: true};
                    } catch {
                        throw new ServerError(500, 'Failed to index document');
                    }
                }));
                body = {results};
                break;
            }
        }
    } catch (error: any) {
        ({statusCode, body} = handleError(error));
    }
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': event.headers.origin || '*',
            'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(body)
    };
}