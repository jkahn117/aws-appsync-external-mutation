////
const AppSync = require('aws-sdk/clients/appsync');
const { API, graphqlOperation } = require('aws-amplify');
const util = require('util');

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
  if (result) {
    apiKey = result.apiKeys[0].id;

    const config = {
      'aws_appsync_graphqlEndpoint': process.env.APPSYNC_ENDPOINT,
      'aws_appsync_region': process.env.AWS_REGION,
      'aws_appsync_authenticationType': 'API_KEY',
      'aws_appsync_apiKey': apiKey,
    };
    API.configure(config);
  } else {
    console.error(`Could not load API Key for API (${process.env.APPSYNC_APIID})`);
    throw new Error('Could not load API Key');
  }
};

/**
 * 
 */
const executeMutation = async(id, body) => {
  const message = {
    id: id,
    body: body,
  };

  try {
    let result = await API.graphql(graphqlOperation(PublishMessageMutation, message));
    console.log("Mutation result: " + JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify(error));
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
