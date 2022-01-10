const axios = require('axios');
const topology = require('./lib/awsTopology');
const GrpcClient = require('./lib/grpcClient');

const {
  CLOUDMAPS_SERVICE_HOST,
  AUTHORIZATION_EMAIL,
  AUTHORIZATION_API_TOKEN,
  AUTHORIZATION_ACCESS_TOKEN,
} = process.env;

const handler = async (event, context) => {
  try {
    // ARN format cheat-sheet: arn:aws:<service>:<region>:<account_id>:<resource>
    console.log('ARN', context.invokedFunctionArn);
    const [,,, region, accountId] = context?.invokedFunctionArn?.split(':');
    if (!region || !accountId) throw new Error(`Invalid function ARN, cannot determine region and account ID`);

    console.info('Starting');
    const infrastructure = await topology.getInfrastructure();
    console.info('Infrastructure topology retrieved');

    const grpcCloudMapsService = new GrpcClient(
      `${__dirname}/proto/cloud_maps.proto`, // proto file path
      'kentik.cloud_maps.v202201alpha1', // package path
      'CloudMapsService', // service name
      CLOUDMAPS_SERVICE_HOST, // service host (URL)
    );
    console.info('GRPC client established');

    const { target_url } = await grpcCloudMapsService.provideAwsMetadataStoragePromise(
      {
        version: 'aws-1.0',
        source_aws_account_id: accountId,
        source_aws_region: region,
      }, {
        metadata: {
          'X-CH-Auth-Email': AUTHORIZATION_EMAIL,
          'X-CH-Auth-API-Token': AUTHORIZATION_API_TOKEN,
          'Authorization': `Bearer ${AUTHORIZATION_ACCESS_TOKEN}`,
        }
      }
      );
    console.info('Target URL determined');

    await axios.put(target_url, infrastructure);
    console.info('Topology file stored at target URL');
  } catch (error) {
    console.error('Error generating the map:', error);
  }
};


module.exports = {
  handler,
};

