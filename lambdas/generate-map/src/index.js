const axios = require('axios');
const { gzip } = require('zlib');
const { promisify } = require('util');
const AwsCrawler = require('./lib/awsCrawler');
const GrpcClient = require('./lib/grpcClient');
const ApiGateway = require('./lib/apiGateway');
const defaultAwsNetworkMapping = require('./lib/defaultAwsNetworkMapping.json');

const compress = promisify(gzip);

const {
  CLOUDMAPS_SERVICE_HOST,
  AUTHORIZATION_EMAIL,
  AUTHORIZATION_API_TOKEN,
  GRPC_INSECURE,
  AWS_REGION_OVERRIDE,
} = process.env;

const grpcCloudMapsService = new GrpcClient(
  `${__dirname}/proto/cloud_maps.proto`, // proto file path
  'kentik.cloud_maps.v202201alpha1', // package path
  'CloudMapsService', // service name
  CLOUDMAPS_SERVICE_HOST, // service host
  { insecure: !!GRPC_INSECURE },
);

const actions = {
  render: (source, data) => ApiGateway.Success({ source, data }),
  send: async (source, data) => {
    console.info('GRPC client established');
    const metadata = {
      'X-CH-Auth-Email': AUTHORIZATION_EMAIL,
      'X-CH-Auth-API-Token': AUTHORIZATION_API_TOKEN,
    };

    const { target_url: targetUrl } = await grpcCloudMapsService
      .provideAwsMetadataStorageLocationPromise(source, { metadata });
    console.info('Target URL determined');

    const serialized = JSON.stringify(data);
    const compressed = await compress(serialized);
    const ratio = Math.round((100 * compressed.length) / serialized.length);
    console.info(`Topology data compression: ${serialized.length} -> ${compressed.length} bytes (ratio ${ratio}%)`);

    await axios.put(targetUrl, compressed);
    console.info(`Topology file stored at target URL: ${targetUrl.substring(0, targetUrl.indexOf('?'))}`);

    return ApiGateway.Success();
  },
};

const handler = async (event, context) => {
  try {
    // ARN format cheat-sheet: arn:aws:<service>:<region>:<account_id>:<resource>
    if (!context?.invokedFunctionArn) throw new Error('Missing function ARN, cannot determine region and account ID');
    const [,,, region, accountId] = context.invokedFunctionArn.split(':');
    if (!region || !accountId) throw new Error('Invalid function ARN, cannot determine region and account ID');

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

    const options = AWS_REGION_OVERRIDE ? { region: AWS_REGION_OVERRIDE } : {};
    const networkCrawler = new AwsCrawler(defaultAwsNetworkMapping, options);
    const infrastructure = await networkCrawler.execute();
    console.info('Infrastructure topology retrieved');

    const result = await actions[action](source, infrastructure);
    return result;
  } catch (error) {
    const message = 'Error generating the map';
    console.error(message, error.code || error.message, error);
    return ApiGateway.Error(message);
  }
};

module.exports = {
  handler,
  grpcCloudMapsService,
};
