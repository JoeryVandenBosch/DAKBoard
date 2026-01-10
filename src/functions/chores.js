const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONTAINER_NAME = 'dashboard-data';
const BLOB_NAME = 'chores-data.json';

async function getBlobClient() {
    const connectionString = process.env.AzureWebJobsStorage;
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Create container if it doesn't exist
    await containerClient.createIfNotExists();
    
    return containerClient.getBlockBlobClient(BLOB_NAME);
}

// Helper function to convert stream to string
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data.toString());
        });
        readableStream.on('end', () => {
            resolve(chunks.join(''));
        });
        readableStream.on('error', reject);
    });
}

app.http('chores', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'function',
    route: 'chores',
    handler: async (request, context) => {
        // Handle preflight OPTIONS request
        if (request.method === 'OPTIONS') {
            return {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        }

        try {
            const blobClient = await getBlobClient();

            if (request.method === 'GET') {
                // Load chores data
                try {
                    const downloadResponse = await blobClient.download(0);
                    const data = await streamToString(downloadResponse.readableStreamBody);
                    return {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: data
                    };
                } catch (error) {
                    if (error.statusCode === 404) {
                        return {
                            status: 404,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({ message: 'No data found' })
                        };
                    }
                    throw error;
                }
            } 
            else if (request.method === 'POST') {
                // Save chores data
                const data = await request.json();
                
                if (!data || !data.familyMembers || !data.chores) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({ error: 'Invalid data: familyMembers and chores required' })
                    };
                }

                const jsonData = JSON.stringify(data, null, 2);
                await blobClient.upload(jsonData, jsonData.length, { overwrite: true });
                
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ success: true, message: 'Data saved successfully' })
                };
            }

            return {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Method not allowed' })
            };

        } catch (error) {
            context.log('Chores API error:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Internal server error', details: error.message })
            };
        }
    }
});