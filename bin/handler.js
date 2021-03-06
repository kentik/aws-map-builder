#!/usr/bin/env node

/*
This script is useful for testing the AWS crawling procedure
with generate-map Lambda function executed locally on host

Example on execution:
  GRPC_INSECURE=1 \
  CLOUDMAPS_SERVICE_HOST=localhost:8151 \
  AUTHORIZATION_EMAIL=some@email.foo \
  AUTHORIZATION_API_TOKEN=cafebabe \
  AWS_REGION_OVERRIDE=optional_region override \
  AWS_PROFILE=optional_profile_name \
  ./bin/handler.js outputfilename
*/
const fs = require('fs');

process.env.AWS_REGION_OVERRIDE = process.env.AWS_REGION_OVERRIDE || 'us-east-1';

// dummy env here
process.env.CLOUDMAPS_SERVICE_HOST = process.env.CLOUDMAPS_SERVICE_HOST || 'dummy.kentik.com:443';
process.env.AUTHORIZATION_EMAIL = process.env.AUTHORIZATION_EMAIL || 'dummy@email.com';
process.env.AUTHORIZATION_API_TOKEN = process.env.AUTHORIZATION_API_TOKEN || 'dummy';

const { handler } = require('../lambdas/generate-map/src/index');

const [,, output] = process.argv;

const arn = 'arn:aws:node:local:AKIA56789012:nothing';

(async () => {
  if (!output) {
    console.error('Missing param: output filename');
    return;
  }
  console.info(`Using region: ${process.env.AWS_REGION_OVERRIDE}`);

  const result = await handler({ pathParameters: { action: 'render' } }, { invokedFunctionArn: arn });
  const infra = JSON.parse(result.body).data;
  console.dir(infra, { depth: null, colors: true });
  infra.NetworkInterfaces.sort(({ MacAddress }, { MacAddress: otherMacAddress }) => {
    if (MacAddress > otherMacAddress) return 1;
    if (MacAddress < otherMacAddress) return -1;
    return 0;
  });

  fs.writeFileSync(`./${output}.json`, JSON.stringify(infra, null, 2));
})();
