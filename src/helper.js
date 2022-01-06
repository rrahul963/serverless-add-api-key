const AWS = require('aws-sdk');
const chalk = require('chalk');

let TRUE = true;

/**
 * Get api key by name.
 * @param {string} key Api Key name.
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 * @returns {Object} Api key info.
 */
const getApiKey = async (key, apigateway, cli) => {
  let position = null;
  let keys = [];
  try {
    while (TRUE) {
      let resp = null;
      if (!position) {
        resp = await apigateway.getApiKeys().promise();
      } else {
        resp = await apigateway.getApiKeys({ position }).promise();
      }
      keys = keys.concat(resp.items);
      if (resp.position) {
        position = resp.position;
      } else {
        break;
      }
    }
    return keys.find(k => k.name === key);
  } catch (error) {
    if (error.code === 'NotFoundException') {
      return undefined;
    }
    cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to check if key already exists. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Get usage plan info by name.
 * @param {string} planName Usage plan name.
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 * @returns {Object} Usage plan info.
 */
const getUsagePlan = async (planName, apigateway, cli) => {
  let position = null;
  let plans = [];
  try {
    while (TRUE) {
      let resp = null;
      if (!position) {
        resp = await apigateway.getUsagePlans().promise();
      } else {
        resp = await apigateway.getUsagePlans({ position }).promise();
      }
      plans = plans.concat(resp.items);
      if (resp.position) {
        position = resp.position;
      } else {
        break;
      }
    }
    return plans.find(p => p.name === planName);
  } catch (error) {
    if (error.code === 'NotFoundException') {
      return undefined;
    }
    cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to check if usage plan already exists. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Get the list of API keys associated with usage plan.
 * @param {string} usagePlanId usage plan Id
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 * @returns {Array} List of Api keys associated with the usage plan.
 */
const getUsagePlanKeys = async (usagePlanId, apigateway, cli) => {
  let position = null;
  let planKeys = [];
  try {
    while (TRUE) {
      let resp = null;
      if (!position) {
        resp = await apigateway.getUsagePlanKeys({ usagePlanId }).promise();
      } else {
        resp = await apigateway.getUsagePlanKeys({ usagePlanId, position }).promise();
      }
      planKeys = planKeys.concat(resp.items);
      if (resp.position) {
        position = resp.position;
      } else {
        break;
      }
    }
    return planKeys;
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to check if usage plan already exists. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Create new api key.
 * @param {string} key Api key name.
 * @param {string} keyValue Api key value.
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 * @returns {string} Api key id.
 */
const createKey = async (key, keyValue, apigateway, cli) => {
  cli.consoleLog(`AddApiKey: ${chalk.yellow(`Creating new api key ${key}`)}`);
  try {
    const params = { name: key, enabled: true };
    if (keyValue) params.value = keyValue;

    const resp = await apigateway.createApiKey(params).promise();
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Created new api key ${key}:${resp.id}`)}`);
    return { id: resp.id, value: resp.value };
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to create new api key. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Create new usage plan.
 * @param {string} name Usage plan name
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 * @param {Object} usagePlanTemplate The parameters for the usagePlan to create.
 * @returns {string} Usage plan id.
 */
const createUsagePlan = async (name, apigateway, cli, usagePlanTemplate) => {
  cli.consoleLog(`AddApiKey: ${chalk.yellow(`Creating new usage plan ${name}`)}`);
  try {
    let plan = { name };
    if (usagePlanTemplate) {
      plan = Object.assign({}, usagePlanTemplate, { name });
    }
    const resp = await apigateway.createUsagePlan(plan).promise();
    return resp.id;
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to create new usage plan ${name}. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Associate api key with usage plan.
 * @param {string} apiKeyId Api key id.
 * @param {string} usagePlanId Usage plan id.
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 */
const createUsagePlanKey = async (apiKeyId, usagePlanId, apigateway, cli) => {
  cli.consoleLog(`AddApiKey: ${chalk.yellow(`Associating api key ${apiKeyId} with usage plan ${usagePlanId}`)}`);
  try {
    const params = {
      keyId: apiKeyId,
      keyType: 'API_KEY',
      usagePlanId
    };
    await apigateway.createUsagePlanKey(params).promise();
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to create usage plan key. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Add Api gateway to usage plan.
 * @param {string} serviceName Serverless service name
 * @param {Object} usagePlan Usage plan info
 * @param {string} stage api gateway stage
 * @param {Object} cfn AWS cloudformation object
 * @param {Object} ag AWS apigateway object
 * @param {Object} cli Serverless CLI object
 */
const associateRestApiWithUsagePlan = async (stackName, usagePlan, stage, cfn, ag, cli) => {
  try {
    const stack = await cfn.describeStacks({ StackName: `${stackName}` }).promise();
    const { Outputs } = stack.Stacks[0];
    let apiName = null;
    Outputs.forEach(o => {
      if (o.OutputKey === 'ServiceEndpoint') {
        const [httpApiName] = o.OutputValue.split('.');
        [, apiName] = httpApiName.split('//');
      }
    });
    if (usagePlan.apiStages.some(s => s.apiId === apiName && s.stage === stage)) {
      cli.consoleLog(`AddApiKey: ${chalk.yellow(`Rest Api ${apiName} already associated with the usage plan`)}`);
      return;
    }
    const params = {
      usagePlanId: usagePlan.id,
      patchOperations: [
        {
          op: 'add',
          path: `/apiStages`,
          value: `${apiName}:${stage}`
        }
      ]
    };
    await ag.updateUsagePlan(params).promise();
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Completed associating rest Api ${apiName} with the usage plan`)}`);
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to associate api key with usage plan. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 *
 * @param {string} encryptedApiKeyValue Encrypted value for the API key
 * @param {string} kmsKeyRegion AWS region where KMS key is in.
 * @param {Object} kms AWS KMS object
 * @param {Object} cli Serverless CLI object
 */
const decryptApiKeyValue = async (encryptedApiKeyValue, kmsKeyRegion, kms, cli) => {
  try {
    const decryptedApiKeyValue = await kms
      .decrypt({ CiphertextBlob: new Buffer(encryptedApiKeyValue, 'base64') }) //eslint-disable-line no-undef
      .promise()
      .then(data => data.Plaintext.toString('ascii'));

    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Successfully decrypted value of "${encryptedApiKeyValue.substring(0, 10)}..." using KMS key in ${kmsKeyRegion}`)}`);
    return decryptedApiKeyValue;
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.red(`Value "${encryptedApiKeyValue.substring(0, 10)}..." can not be decrypted properly with keys in KMS in region ${kmsKeyRegion}`)}.`);
    throw error;
  }
};

/**
 *
 * @param {string} id usage plan id
 * @param {Object} ag Api Gateway object
 */
const deleteUsagePlan = async function deleteUsagePlan(id, ag, cli) {
  try {
    await ag.deleteUsagePlan({ usagePlanId:id }).promise();
  } catch (error) {
    cli.consoleLog(`RemoveApiKey: ${chalk.red(`Failed to delete usage plan ${id}}`)}.`);
    throw error;
  }
};

/**
 *
 * @param {string} id Api key id
 * @param {Object} ag Api Gateway object
 */
const deleteApiKey = async function deleteApiKey(id, ag, cli) {
  try {
    await ag.deleteApiKey({ apiKey: id }).promise();
  } catch (error) {
    cli.consoleLog(`RemoveApiKey: ${chalk.red(`Failed to delete api key ${id}}`)}.`);
    throw error;
  }
};

const resolveDefaultUsagePlan = provider => {
  if (!provider) return {};
  if (provider.apiGateway && provider.apiGateway.usagePlan) return provider.apiGateway.usagePlan;
  return provider.usagePlan || {};
}

/**
 * Main function that adds api key.
 * @param {Object} serverless Serverless object
 */
const addApiKey = async (serverless, options) => {
  const provider = serverless.getProvider('aws');
  const awsCredentials = provider.getCredentials();
  const region = provider.getRegion();
  const stage = provider.getStage();
  const conceal = options.conceal;
  const apiKeysForStages = serverless.service.custom.apiKeys || [];
  const apiKeys = Array.isArray(apiKeysForStages) ? apiKeysForStages : apiKeysForStages[stage];
  const serviceName = serverless.service.getServiceName();
  const stackName = serverless.service.provider.stackName || `${serviceName}-${stage}`;
  const results = [];
  const ag = new AWS.APIGateway({
    credentials: awsCredentials.credentials,
    region,
    httpOptions: provider.sdk.config.httpOptions
  });

  const cfn = new AWS.CloudFormation({
    credentials: awsCredentials.credentials,
    region,
    httpOptions: provider.sdk.config.httpOptions
  });

  if (!apiKeys || !apiKeys.length) {
    serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`No ApiKey names specified for stage ${stage} so skipping creation`)}`);
  }

  let planName;
  const defaultUsagePlan = resolveDefaultUsagePlan(serverless.service.provider);

  for (let apiKey of apiKeys) {
    let apiKeyValue = null;
    const apiKeyName = apiKey.name;
    // if we have a defined usagePlan object, us it's .name. If it's a string, use that. Otherwise a default.
    if (apiKey.usagePlan && apiKey.usagePlan.name) {
      planName = apiKey.usagePlan.name;
    } else if (defaultUsagePlan.name) {
      planName = defaultUsagePlan.name;
    } else {
      planName = `${apiKeyName}-usage-plan`
    }
    // when creating a plan, use the one defined if set, otherwise the default or blank
    const usagePlanTemplate = (apiKey.usagePlan && (apiKey.usagePlan.quota || apiKey.usagePlan.throttle)) ? apiKey.usagePlan : defaultUsagePlan;

    if (apiKey.value) {
      apiKeyValue = apiKey.value;
      // if KMS encrypted value configured, encrypt it using KMS
      if (typeof apiKeyValue === 'object' && apiKeyValue.encrypted) {
        // use region specified for KMS keys, otherwise take the region from command line
        const kmsKeyRegion = apiKeyValue.kmsKeyRegion || region;
        const kms = new AWS.KMS({ apiVersion: '2014-11-01', region: kmsKeyRegion });
        apiKeyValue = await module.exports.decryptApiKeyValue(apiKeyValue.encrypted, kmsKeyRegion, kms,serverless.cli);
      }
    }

    try {
      const apiKey = await module.exports.getApiKey(apiKeyName, ag, serverless.cli);
      let usagePlan = await module.exports.getUsagePlan(planName, ag, serverless.cli);

      let apiKeyId = null;
      let usagePlanId = null;

      // if api key doesn't exist, create one.
      if (!apiKey) {
        const { id, value } = await module.exports.createKey(
          apiKeyName, apiKeyValue, ag, serverless.cli
        );
        apiKeyId = id;
        if (!conceal) {
          results.push({
            key: apiKeyName,
            value
          });
        }
      } else {
        serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Api key ${apiKeyName} already exists, skipping creation.`)}`);
        apiKeyId = apiKey.id;
      }

      // if usage plan doesn't exist create one and associate the created api key with it.
      // if usage plan already exists then associate the key with it, if it's not already associated.
      if (!usagePlan) {
        usagePlanId = await module.exports.createUsagePlan(
          planName, ag, serverless.cli, usagePlanTemplate
        );
        await module.exports.createUsagePlanKey(apiKeyId, usagePlanId, ag, serverless.cli);
        usagePlan = { id: usagePlanId, apiStages: [] };
      } else {
        serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Usage plan ${planName} already exists, skipping creation.`)}`);
        usagePlanId = usagePlan.id;
        const existingKeys = await module.exports.getUsagePlanKeys(usagePlanId, ag, serverless.cli);
        if (!existingKeys.some(key => key.id === apiKeyId)) {
          await module.exports.createUsagePlanKey(apiKeyId, usagePlanId, ag, serverless.cli);
        } else {
          serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Usage plan ${planName} already has api key associated with it, skipping association.`)}`);
        }
      }
      await module.exports.associateRestApiWithUsagePlan(stackName, usagePlan, stage, cfn, ag, serverless.cli);
    } catch (error) {
      serverless.cli.consoleLog(`AddApiKey: ${chalk.red(`Failed to add api key the service. Error ${error.message || error}`)}`);
    }
  }
  results.forEach(result => serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`${result.key} - ${result.value}`)}`));
};

/**
 * Main function to remove api keys
 * @param {Object} serverless Serverless object
 * @param {Object} options Serverless options
 */
const removeApiKey = async (serverless) => {
  const provider = serverless.getProvider('aws');
  const awsCredentials = provider.getCredentials();
  const region = provider.getRegion();
  const stage = provider.getStage();
  const apiKeysForStages = serverless.service.custom.apiKeys || [];
  const apiKeys = Array.isArray(apiKeysForStages) ? apiKeysForStages : apiKeysForStages[stage];
  const ag = new AWS.APIGateway({
    credentials: awsCredentials.credentials,
    region,
    httpOptions: provider.sdk.config.httpOptions
  });

  let planName;
  const defaultUsagePlan = resolveDefaultUsagePlan(serverless.service.provider);

  for (let apiKey of apiKeys) {
    const apiKeyName = apiKey.name;
    const canBeDeleted = apiKey.deleteAtRemoval
    if (apiKey.usagePlan && apiKey.usagePlan.name) {
      planName = apiKey.usagePlan.name;
    } else if (defaultUsagePlan.name) {
      planName = defaultUsagePlan.name;
    } else {
      planName = `${apiKeyName}-usage-plan`
    }

    if (canBeDeleted == 'false' || canBeDeleted == false) {
      serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Api Key ${apiKeyName} is protected from deletion`)}`);
      return;
    }

    const plan = await module.exports.getUsagePlan(planName, ag, serverless.cli);
    if (!plan) {
      serverless.cli.consoleLog(`RemoveApiKey: ${chalk.red(`${planName} not found. Checking and deleting Api key.`)}`);
    } else {
      if (plan.apiStages.length > 0) {
        serverless.cli.consoleLog(`RemoveApiKey: ${chalk.red(`${planName} has apiStages associated with it. Skipping deletion.`)}`);
        continue;
      }
      serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Deleting Usage plan ${planName} - ${plan.id}`)}`);
      await module.exports.deleteUsagePlan(plan.id, ag, serverless.cli);
      serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Usage Plan ${planName} deleted successfully`)}`);
    }
    const key = await module.exports.getApiKey(apiKeyName, ag);
    if (!key) {
      serverless.cli.consoleLog(`RemoveApiKey: ${chalk.red(`${apiKeyName} not found.`)}`);
      continue;
    }
    serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Deleting Api Key ${apiKeyName} - ${key.id}`)}`);
    await module.exports.deleteApiKey(key.id, ag, serverless.cli);
    serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Api Key ${apiKeyName} deleted successfully`)}`);
  }
};

module.exports = {
  addApiKey,
  associateRestApiWithUsagePlan,
  createKey,
  createUsagePlan,
  createUsagePlanKey,
  decryptApiKeyValue,
  deleteApiKey,
  deleteUsagePlan,
  getApiKey,
  getUsagePlan,
  getUsagePlanKeys,
  removeApiKey
};
