const axios = require('axios');
const topology = require('./lib/awsTopology');
const GrpcClient = require('./lib/grpcClient');
const ApiGateway = require('./lib/apiGateway')

const {
  CLOUDMAPS_SERVICE_HOST,
  AUTHORIZATION_EMAIL,
  AUTHORIZATION_API_TOKEN,
} = process.env;

const actions = {
  render: (source, data) => ApiGateway.Success({ source, data }),
  send: async (source, data) => {
    const grpcCloudMapsService = new GrpcClient(
      `${__dirname}/proto/cloud_maps.proto`,  // proto file path
      'kentik.cloud_maps.v202201alpha1',      // package path
      'CloudMapsService',                     // service name
      CLOUDMAPS_SERVICE_HOST,                 // service host
    );
    console.info('GRPC client established');
    const metadata = {
      'X-CH-Auth-Email': AUTHORIZATION_EMAIL,
      'X-CH-Auth-API-Token': AUTHORIZATION_API_TOKEN,
    };

    const { target_url } = await grpcCloudMapsService.provideAwsMetadataStoragePromise(source, { metadata });
    console.info('Target URL determined');

    await axios.put(target_url, data);
    console.info(`Topology file stored at target URL ${target_url}`);

    return ApiGateway.Success();
  }
};

const handler = async (event, context) => {
  try {
    // ARN format cheat-sheet: arn:aws:<service>:<region>:<account_id>:<resource>
    const [,,, region, accountId] = context?.invokedFunctionArn?.split(':');
    if (!region || !accountId) throw new Error(`Invalid function ARN, cannot determine region and account ID`);

    const { action = 'send' } = event.pathParameters ?? {};
    if (!actions[action]) {
      const message = `Invalid action ${action}. Allowed: ${Object.keys(actions).join(', ')}`;
      console.warn(`Bad request: ${message}`);
      return ApiGateway.BadRequest(message);
    }

    const source = {
      version: 'aws-1.0',
      source_aws_account_id: accountId,
      source_aws_region: region,
    };

    const infrastructure = await topology.getInfrastructure();
    console.info('Infrastructure topology retrieved');

    return actions[action](source, infrastructure);
  } catch (error) {
    const message = 'Error generating the map';
    console.error(message, error.message || error.code, error);
    return ApiGateway.Error(message);
  }
};


module.exports = {
  handler,
};

