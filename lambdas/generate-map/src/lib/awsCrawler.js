const AWS = require('aws-sdk');

/* basic object helpers */

const pickTransformed = (value, mapping) =>
  Object.entries(mapping).reduce((acc, [from, to]) =>
    Object.assign(acc, { [to]: value[from] }), {});

const merge = (values) =>
  values.reduce((acc, res) =>
    Object.assign(acc, res), {});

/**
 * Fetches all items from the given AWS SDK method taking care about the pagination
 *
 * @param {object} client - AWS SDK client instance
 * @param {string} methodName - AWS SDK client method name to be invoked
 * @param {object} params - params object to be merged into params next to tokenization
 * @param {object} options - fetching options including pagination config that given AWS SDK client uses
 * @returns combined pages of result set from all AWS SDK method calls
 */
const fetchAll = async ({ serviceName, client, methodName, params, options = {} }) => {
  const result = {};
  const { pagination = {} } = options;
  const {
    request: requestTokenName = 'NextToken',
    response: responseTokenName = 'NextToken'
  } = pagination;

  let currentToken = null;

  try {
    do {
      const callParams = { ...params };
      if (currentToken !== null) {
        callParams[requestTokenName] = currentToken;
      }
      const response = await client[methodName](callParams).promise();
      const { [responseTokenName]: nextToken, ...rest } = response;

      for (const key of Object.keys(rest)) {
        if (Array.isArray(rest[key])) {
          result[key] = (result[key] || []).concat(rest[key]); // handles also the case when page[key] is not an array
        } else {
          result[key] = rest[key];
        }
      }
      currentToken = nextToken;
    } while (currentToken);
  } catch (error) {
    // ensure the message gives information about what method caused an issue
    error.message = `Error executing AWS.${serviceName}.${methodName}: ${error.message}`;
    throw error;
  }
  return result;
};

/**
 * Orchestrates fetching and augmenting the data according to the parameters
 *
 * @param {object} data - collection object including array of objects that are to be augmented
 * @param {array} augments - augmentation definitions
 * @param {object} client - AWS SDK client instance
 * @param {object} options - fetching options including pagination config that given AWS SDK client uses
 * @returns single type data collection fetched or fetched and augmented
 */
const fetchAndAugment = async ({ serviceName, client, methodName, augmentWith, options, passedParams, parent, staticParams }) => {
  const result = await fetchAll({ serviceName, client, methodName, options, params: { ...staticParams, ...passedParams } });
  if (!augmentWith) return result;

  for (const { methodName, property, paramsMapping = {}, staticParams = {}, targetMapping, augmentWith: augmentChildrenWith } of augmentWith) {
    const { [property]: itemsToAugment } = result;
    const { parent: parentMapping, ...currentItemMapping } = paramsMapping;
    for (const item of itemsToAugment) {
      const params = {
        ...(currentItemMapping && pickTransformed(item, currentItemMapping)),
        ...(parent && parentMapping && pickTransformed(parent, parentMapping)),
      };
      const augmentation = await fetchAndAugment({
        serviceName,
        client,
        options,
        methodName,
        staticParams,
        augmentWith: augmentChildrenWith,
        passedParams: params,
        parent: item,
      });
      Object.assign(item, pickTransformed(augmentation, targetMapping));
    }
  }
  return result;

};

/**
 * Crawls through the AWS SDK provided data according to the mapping definition
 *
 * @param {object} mapping - collection of AWS SDK APIs and their methods optionally including the augmentations
 * @returns complete merged result set received from AWS through its SDK
 */

class AwsCrawler {
  constructor(mapping, options = {}) {
    this.mapping = mapping;
    this.clients = {};

    for (const [service, { methods }] of Object.entries(mapping)) {
      if (typeof AWS[service] === 'undefined') throw new Error(`Invalid AWS service: ${service}`);
      this.clients[service] = new AWS[service](options);

      for (const method of methods) {
        if (typeof method === 'string') {
          this.assertAwsMethod(service, method);
          continue;
        }
        const { methodName, augmentWith } = method;
        this.assertAwsMethod(service, methodName);
        if (augmentWith) {
          for (const augment of augmentWith) {
            this.assertAwsMethod(service, augment.methodName);
          }
        }
      }
    }
  }

  assertAwsMethod(service, methodName) {
    if (typeof this.clients[service][methodName] !== 'function') {
      throw new Error(`Invalid AWS SDK method: ${service}.${methodName}`);
    }
  }

  async execute() {
    try {
      const items = Object.entries(this.mapping).flatMap(([service, { methods, options }]) => {
        const client = this.clients[service];
        return methods.map((method) => {
          if (typeof method === 'string') return { serviceName: service, client, methodName: method, options };
          const { methodName, augmentWith } = method;
          return { serviceName: service, client, methodName, augmentWith, options };
        });
      });
      const result = await Promise.all(items.map(fetchAndAugment));
      return merge(result);
    } catch (error) {
      throw new Error(`AWS crawl failed: ${error.message}`);
    }
  }
}

module.exports = AwsCrawler;
