////
const AppSync = require('aws-sdk/clients/appsync');
const axios = require('axios');

////
let apiKey = null;
const PublishMessageMutation = `mutation PublishMessage(
    $id: ID!,
    $body: String!
  ) {
    publishMessage(message: {id: $id, body: $body}) {
      id
      body
    }
  }`;

/**
 * 
 */
const loadApiKey = async() => {
  let params = {
    apiId: process.env.APPSYNC_APIID,
    maxResults: 1,
  };
  
  let result = await new AppSync().listApiKeys(params).promise();
  if (result && result.apiKeys && result.apiKeys.length > 0) {
    apiKey = result.apiKeys[0].id;
  } else {
    console.error(`Could not load API Key for API (${process.env.APPSYNC_APIID})`);
    throw new Error('Could not load API Key');
  }
};

/**
 * 
 */
const executeMutation = async(id, body) => {
  const mutation = {
    query: PublishMessageMutation,
    operationName: 'PublishMessage',
    variables: {
      id: id,
      body: body,
    },
  };

  try {
    let response = await axios({
      method: 'POST',
      url: process.env.APPSYNC_ENDPOINT,
      data: JSON.stringify(mutation),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error(`[ERROR] ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    throw error;
  }
};

/**
 * 
 */
exports.handler = async(event) => {
  if (!apiKey) { await loadApiKey(); }

  for (let record of event.Records) {
    switch (record.eventName) {
      case 'INSERT':
        // grab data we need from stream...
        let id = record.dynamodb.Keys.id.S;
        let body = record.dynamodb.NewImage.body.S;
        // ... and then execute the publish mutation
        await executeMutation(id, body);
        break;
      default:
        break;
    }
  }

  return { message: `Finished processing ${event.Records.length} records` }
}
