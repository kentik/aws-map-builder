const DummyHandler = require('./bin/handler');
const AwsCrawler = require('./lambdas/generate-map/src/lib/awsCrawler');
const GrpcClient = require('./lambdas/generate-map/src/lib/grpcClient');

/* Note:
 * This file serves the purpose of using the selected modules as the packages outside of this very repo.
 * It is not used within the AWS Cloudformation stack anywhere. */

module.exports = {
  DummyHandler,
  AwsCrawler,
  GrpcClient,
};
