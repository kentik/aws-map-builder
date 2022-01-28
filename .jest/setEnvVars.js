
process.env.CLOUDMAPS_SERVICE_HOST     = 'grpc.somewhere.there';
process.env.AUTHORIZATION_EMAIL        = 'remi@kentik.com';
process.env.AUTHORIZATION_API_TOKEN    = 'cafebabe';
process.env.AWS_REGION                 = 'eu-central-1';

global.console.info = () => null;
global.console.warn = () => null;
global.console.error = () => null;
