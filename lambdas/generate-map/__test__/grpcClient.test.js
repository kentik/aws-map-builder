const { createMockServer } = require('grpc-mock');
const GrpcClient = require('../src/lib/grpcClient');

describe('GrpcClient', () => {
  const protoPath = `${__dirname}/../src/proto/cloud_maps.proto`;
  const packageName = 'kentik.cloud_maps.v202201alpha1';
  const serviceName = 'CloudMapsService';
  let mockServer;
  let client;

  beforeAll(async () => {
    mockServer = createMockServer({
      protoPath,
      packageName,
      serviceName,
      rules: [{
        method: 'ProvideAwsMetadataStorageLocation',
        input: {
          version: 'aws-1.0',
          sourceAwsAccountId: 'foobar',
          sourceAwsRegion: 'abcdef',
        },
        output: {
          targetUrl: 'http://devnull.kentik.com/cafebabe',
        },
      }, {
        method: 'GetAwsCrawlerConfiguration',
        input: {
          version: 'aws-1.0',
          sourceAwsAccountId: 'foobar',
          sourceAwsRegion: 'abcdef',
        },
        output: {
          services: JSON.stringify({ configuration: 'here' }),
        },
      }],
    });
    await mockServer.listen('127.0.0.1:50051');

    client = new GrpcClient(protoPath, packageName, serviceName, '127.0.0.1:50051', { insecure: true });
  });

  test('succeed initiating the client for cloudMaps', async () => {
    expect(client.listMethods()).toEqual(['provideAwsMetadataStorageLocation', 'getAwsCrawlerConfiguration']);
    expect(client.provideAwsMetadataStorageLocationAsync).toBeInstanceOf(Function);
    expect(client.provideAwsMetadataStorageLocationStream).toBeInstanceOf(Function);
    expect(client.provideAwsMetadataStorageLocationPromise).toBeInstanceOf(Function);
    expect(client.getAwsCrawlerConfigurationAsync).toBeInstanceOf(Function);
    expect(client.getAwsCrawlerConfigurationStream).toBeInstanceOf(Function);
    expect(client.getAwsCrawlerConfigurationPromise).toBeInstanceOf(Function);
  });

  test('succeed calling the promise method', async () => {
    const result = await client.provideAwsMetadataStorageLocationPromise({
      version: 'aws-1.0',
      source_aws_account_id: 'foobar',
      source_aws_region: 'abcdef',
    }, { metadata: { metaFoo: 'bar' } });
    expect(result).toEqual({ target_url: 'http://devnull.kentik.com/cafebabe' });
  });

  test('succeed calling the async method', (done) => {
    client.provideAwsMetadataStorageLocationAsync({
      version: 'aws-1.0',
      source_aws_account_id: 'foobar',
      source_aws_region: 'abcdef',
    }, (error, result) => {
      expect(result).toEqual({ target_url: 'http://devnull.kentik.com/cafebabe' });
      done();
    });
  });
});
