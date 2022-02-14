const AwsMock = require('aws-sdk-mock');
const AwsCrawler = require('../src/lib/awsCrawler');

describe('awsCrawler', () => {
  const anyCallback = expect.any(Function);

  afterEach(() => AwsMock.restore());

  test('should invoke specified methods', async () => {
    const describeZonesMock = jest.fn().mockResolvedValue({
      AvailabilityZones: [
        {
          State: 'ongoing',
          ZoneName: 'eu-central-1a',
        },
      ],
    });
    AwsMock.mock('EC2', 'describeAvailabilityZones', describeZonesMock);

    const listBucketsMock = jest.fn().mockResolvedValue({
      Buckets: [
        { Name: 'some-bucket' },
        { Name: 'some-other-bucket' },
      ],
      Owner: { ID: 'cafebabe' },
    });
    AwsMock.mock('S3', 'listBuckets', listBucketsMock);

    const crawler = new AwsCrawler({
      S3: {
        methods: ['listBuckets'],
      },
      EC2: {
        methods: ['describeAvailabilityZones'],
      },
    });
    const result = await crawler.execute();

    expect(listBucketsMock).toHaveBeenCalled();
    expect(describeZonesMock).toHaveBeenCalled();

    expect(result).toMatchObject({
      Buckets: [{ Name: 'some-bucket' }, { Name: 'some-other-bucket' }],
      Owner: { ID: 'cafebabe' },
      AvailabilityZones: [{ State: 'ongoing', ZoneName: 'eu-central-1a' }],
    });
  });

  test('should throw on invalid API name', () => {
    try {
      new AwsCrawler({
        Wrong: {
          methods: ['missing'],
        },
      });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error.message).toBe('Invalid AWS service: Wrong');
    }
  });
  test('should throw on invalid API method', () => {
    try {
      new AwsCrawler({
        S3: {
          methods: ['wrongMethod'],
        },
      });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error.message).toBe('Invalid AWS SDK method: S3.wrongMethod');
    }
  });

  test('should throw meaningful error on API method error', async () => {
    const listBucketsMock = jest.fn().mockRejectedValue(new Error('Something went wrong here!'));
    AwsMock.mock('S3', 'listBuckets', listBucketsMock);

    try {
      const crawler = new AwsCrawler({
        S3: {
          methods: ['listBuckets'],
        },
      });
      await crawler.execute();
      throw new Error('should not reach here');
    } catch (error) {
      expect(error.message).toBe('AWS crawl failed: Error executing AWS.S3.listBuckets: Something went wrong here!');
    }
  });

  test('should support pagination by default', async () => {
    const fixtureReservation1 = {
      Groups: [{ GroupId: 'group-cafebabe' }],
      Instances: [{ InstanceId: 'instance-cafebabe' }],
      ReservationId: 'r-cafebabe',
    };
    const fixtureReservation2 = {
      Groups: [{ GroupId: 'group-foobar' }],
      Instances: [{ InstanceId: 'instance-foobar' }],
      ReservationId: 'r-foobar',
    };
    const fixtureReservation3 = {
      Groups: [{ GroupId: 'group-baz' }],
      Instances: [{ InstanceId: 'instance-baz' }],
      ReservationId: 'r-baz',
    };
    const describeInstancesMock = jest.fn()
      .mockResolvedValueOnce({
        Reservations: [fixtureReservation1],
        NextToken: 'token-cafebabe',
      })
      .mockResolvedValueOnce({
        Reservations: [fixtureReservation2],
        NextToken: 'token-foobar',
      })
      .mockResolvedValueOnce({
        Reservations: [fixtureReservation3],
        NextToken: null,
      });
    AwsMock.mock('EC2', 'describeInstances', describeInstancesMock);

    const crawler = new AwsCrawler({
      EC2: {
        methods: ['describeInstances'],
      },
    });
    const result = await crawler.execute();

    expect(describeInstancesMock).toHaveBeenCalledTimes(3);
    expect(describeInstancesMock).toHaveBeenNthCalledWith(1, {}, anyCallback);
    expect(describeInstancesMock).toHaveBeenNthCalledWith(2, { NextToken: 'token-cafebabe' }, anyCallback);
    expect(describeInstancesMock).toHaveBeenNthCalledWith(3, { NextToken: 'token-foobar' }, anyCallback);
    expect(result).toMatchObject({
      Reservations: [fixtureReservation1, fixtureReservation2, fixtureReservation3],
    });
  });

  test('should nicely crawl with augmentations', async () => {
    const listBucketsMock = jest.fn().mockResolvedValue({
      Buckets: [
        { Name: 'some-bucket' },
      ],
      Owner: { ID: 'cafebabe' },
    });
    AwsMock.mock('S3', 'listBuckets', listBucketsMock);

    const listObjectsMock = jest.fn()
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'foobar/myfile1.zip' },
          { Key: 'foobar/myfile2.zip' },
          { Key: 'foobar/myfile3.zip' },
        ],
        Name: 'some-bucket',
        Prefix: 'foobar',
        MaxKeys: 1000,
        CommonPrefixes: [],
      });
    AwsMock.mock('S3', 'listObjects', listObjectsMock);

    const getBucketVersioningMock = jest.fn()
      .mockResolvedValueOnce({ Status: 'Enabled' });
    AwsMock.mock('S3', 'getBucketVersioning', getBucketVersioningMock);

    const getObjectAclMock = jest.fn()
      .mockResolvedValue({
        Owner: { ID: 'foobar' },
        Grants: [{ Grantee: { ID: 'foobar' }, Permission: 'FULL_CONTROL' }],
      });
    AwsMock.mock('S3', 'getObjectAcl', getObjectAclMock);

    const crawler = new AwsCrawler({
      S3: {
        methods: [{
          methodName: 'listBuckets',
          augmentWith: [{
            methodName: 'listObjects',
            property: 'Buckets',
            paramsMapping: { Name: 'Bucket' },
            staticParams: { Prefix: 'foobar' },
            targetMapping: { Contents: 'Objects' },
            augmentWith: [{
              methodName: 'getObjectAcl',
              property: 'Contents',
              paramsMapping: {
                Key: 'Key',
                parent: {
                  Name: 'Bucket',
                },
              },
              targetMapping: { Grants: 'Grants' },
            }],
          }, {
            methodName: 'getBucketVersioning',
            property: 'Buckets',
            paramsMapping: { Name: 'Bucket' },
            targetMapping: { Status: 'VersioningStatus' },
          },
          ],
        }],
      },
    });
    const result = await crawler.execute();

    expect(listBucketsMock).toHaveBeenCalledWith({}, anyCallback);
    expect(listObjectsMock).toHaveBeenCalledWith({ Prefix: 'foobar', Bucket: 'some-bucket' }, anyCallback);
    expect(getObjectAclMock).toHaveBeenCalledWith({ Key: 'foobar/myfile1.zip', Bucket: 'some-bucket' }, anyCallback);
    expect(getBucketVersioningMock).toHaveBeenCalledWith({ Bucket: 'some-bucket' }, anyCallback);

    expect(result).toMatchObject({
      Buckets: [
        {
          Name: 'some-bucket',
          Objects: [
            {
              Key: 'foobar/myfile1.zip',
              Grants: [{ Grantee: { ID: 'foobar' }, Permission: 'FULL_CONTROL' }],
            },
            {
              Key: 'foobar/myfile2.zip',
              Grants: [{ Grantee: { ID: 'foobar' }, Permission: 'FULL_CONTROL' }],
            },
            {
              Key: 'foobar/myfile3.zip',
              Grants: [{ Grantee: { ID: 'foobar' }, Permission: 'FULL_CONTROL' }],
            },
          ],
          VersioningStatus: 'Enabled',
        },
      ],
      Owner: { ID: 'cafebabe' },
    });
  });

  describe('pseudo-integration tests', () => {
    test('validate default mapping for proper services and methods', async () => {
      const crawler = new AwsCrawler(require('../src/lib/defaultAwsNetworkMapping.json'));
      expect(crawler).toBeInstanceOf(AwsCrawler);
    });

    // Enable for integration-testing locally by removing ".skip" part
    // Note there are no AWS-SDK mocks. It requires AWS SDK/CLI properly setup on the host machine.
    test.skip('execute crawler with default mapping', async () => {
      const crawler = new AwsCrawler(require('../src/lib/defaultAwsNetworkMapping.json'));
      const result = await crawler.execute();
      expect(result).toBeTruthy();
      console.dir(result, { depth: null, colors: true });
    });
  });
});
