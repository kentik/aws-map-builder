const { handler, grpcCloudMapsService } = require('../src/index')
const axios = require('axios');

describe('GenerateMap lambda handler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const invokedFunctionArn = 'arn:aws:lambda:us-mist-6:000001112234:function:GenerateMapFunction';
  const context = { invokedFunctionArn };

  test('render action', async () => {
    const event = { pathParameters: { action: 'render' } };
    const result = await handler(event, context);

    expect(result).toMatchObject({
      statusCode: 200,
      body: expect.any(String),
    });

    expect(JSON.parse(result.body)).toMatchObject({
      source: expect.any(Object),
      data: expect.any(Object),
    });
  });

  [{ event: {}, label: 'default' }, { event: {}, label: 'send action' }]
    .forEach(({ event, label}) =>
      test(label, async () => {
        const target_url = 'https://foo.bar/baz?secret=magic';
        const grpcSpy = jest.spyOn(grpcCloudMapsService, 'provideAwsMetadataStorageLocationPromise')
          .mockImplementation(async (params, { metadata }) => {
            expect(params).toMatchObject({
              version: 'aws-1.0',
              source_aws_account_id: '000001112234',
              source_aws_region: 'us-mist-6'
            });
            expect(metadata).toMatchObject({
              'X-CH-Auth-Email': 'remi@kentik.com',
              'X-CH-Auth-API-Token': 'cafebabe'
            })
            return { target_url };
          });
        const axiosSpy = jest.spyOn(axios, 'put')
          .mockImplementation(async (url, buffer) => {
            expect(url).toEqual(target_url);
          });

        const result = await handler(event, context);

        expect(grpcSpy).toHaveBeenCalledTimes(1);
        expect(axiosSpy).toHaveBeenCalledTimes(1);

        expect(result).toMatchObject({
          statusCode: 200,
          body: null,
        });
      }));


  test('invalid action', async () => {
    const event = { pathParameters: { action: 'wronk' } };
    const result = await handler(event, context);

    expect(result).toMatchObject({
      statusCode: 400,
      body: expect.any(String),
    });

    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Invalid action wronk. Allowed: render, send',
    });
  });

  test('inaccessible grpc endpoint', async () => {
    jest.spyOn(grpcCloudMapsService, 'provideAwsMetadataStorageLocationPromise')
      .mockRejectedValue(new Error('grpc did not work'));

    const consoleSpy = jest.spyOn(console, 'error')
      .mockImplementation((message, code, details) => {
        expect(code).toEqual('grpc did not work');
      });

    const result = await handler({}, context);

    expect(consoleSpy).toHaveBeenCalledTimes(1);

    expect(result).toMatchObject({
      statusCode: 500,
      body: expect.any(String),
    });

    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Error generating the map',
    });
  });

  test('problematic target url', async () => {
    jest.spyOn(grpcCloudMapsService, 'provideAwsMetadataStorageLocationPromise')
      .mockImplementation(async () => ({ target_url: 'https://foo.bar/baz?secret=magic' }));

    jest.spyOn(axios, 'put')
      .mockRejectedValue(new Error('server unknown'));

    const consoleSpy = jest.spyOn(console, 'error')
      .mockImplementation((message, code, details) => {
        expect(code).toEqual('server unknown');
      });

    const result = await handler({}, context);

    expect(consoleSpy).toHaveBeenCalledTimes(1);

    expect(result).toMatchObject({
      statusCode: 500,
      body: expect.any(String),
    });

    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Error generating the map',
    });
  });
});
