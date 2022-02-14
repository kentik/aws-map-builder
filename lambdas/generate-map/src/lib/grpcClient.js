// Please note - based on https://github.com/zetogk/node-grpc-client/ (MIT license)
// Differences:
// - use grpc-js instead of binary grpc
// - use latest proto-loader
// - promise-based renamed from ***Sync to ***Promise
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const generateMetadata = (metadata) => {
  if (!metadata) return {};
  const metadataGrpc = new grpc.Metadata();
  for (const [key, val] of Object.entries(metadata)) {
    metadataGrpc.add(key, val);
  }
  return metadataGrpc;
};

class GRPCClient {
  constructor(protoPath, packageName, service, host, options = {}) {
    this.packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: (options.keepCase === undefined) ? true : options.keepCase,
      longs: (options.longs === undefined) ? String : options.longs,
      enums: (options.enums === undefined) ? String : options.enums,
      defaults: (options.default === undefined) ? true : options.default,
      oneofs: (options.default === undefined) ? true : options.default,
    });

    const proto = ((name) => {
      const packagePath = name.split('.');
      let definition = grpc.loadPackageDefinition(this.packageDefinition);
      for (let $i = 0; $i <= packagePath.length - 1; $i++) {
        definition = definition[packagePath[$i]];
      }
      return definition;
    })(packageName);

    const listMethods = this.packageDefinition[`${packageName}.${service}`];

    const credentials = options.insecure
      ? grpc.credentials.createInsecure()
      : grpc.credentials.createSsl();

    this.client = new proto[service](host, credentials);
    this.listNameMethods = [];

    /* eslint-disable guard-for-in */
    for (const key in listMethods) {
      const methodName = listMethods[key].originalName;
      this.listNameMethods.push(methodName);

      this[`${methodName}Async`] = (data, fnAnswer, { metadata = null } = {}) => {
        this.client[methodName](data, generateMetadata(metadata), fnAnswer);
      };

      this[`${methodName}Stream`] = (data, { metadata = null } = {}) =>
        this.client[methodName](data, generateMetadata(metadata));

      this[`${methodName}Promise`] = (data, { metadata = null } = {}) => {
        const { client } = this;
        return new Promise((resolve, reject) => {
          client[methodName](
            data,
            generateMetadata(metadata),
            (error, result) => (error ? reject(error) : resolve(result)),
          );
        });
      };
    }
  }

  runService(fnName, data, fnAnswer, { metadata = null } = {}) {
    this.client[fnName](data, generateMetadata(metadata), fnAnswer);
  }

  listMethods() {
    return this.listNameMethods;
  }
}

module.exports = GRPCClient;
