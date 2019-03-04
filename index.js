const AWS = require('aws-sdk')
const chalk = require('chalk')

/**
 * Get api key by name.
 * @param {string} key Api Key name.
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 * @returns {Object} Api key info.
 */
const getApiKey = async function getApiKey(key, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  let position = null;
  let keys = []
  try {
    while (true) {
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
  } catch(error) {
    if (error.code === 'NotFoundException') {
      return apiKey;
    }
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to check if key already exists. Error ${error.message || error}`)}`)
    throw error;
  }
}

/**
 * Get usage plan info by name.
 * @param {string} planName Usage plan name.
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 * @returns {Object} Usage plan info.
 */
const getUsagePlan = async function getUsagePlan(planName, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  let position = null;
  let plans = [];
  try {
    while (true) {
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
  } catch(error) {
    if (error.code === 'NotFoundException') {
      return usagePlan;
    }
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to check if usage plan already exists. Error ${error.message || error}`)}`)
    throw error;
  }
};

/**
 * Get the list of API keys associated with usage plan.
 * @param {string} usagePlanId usage plan Id
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 * @returns {Array} List of Api keys associated with the usage plan.
 */
const getUsagePlanKeys = async function getUsagePlanKeys(usagePlanId, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  let position = null;
  let planKeys = []
  try {
    while (true) {
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
  } catch(error) {
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to check if usage plan already exists. Error ${error.message || error}`)}`)
    throw error;
  }
};

/**
 * Create new api key.
 * @param {string} key Api key name.
 * @param {string} keyValue Api key value.
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 * @returns {string} Api key id.
 */
const createKey  = async function createKey(key, keyValue, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  cli.consoleLog(`AddApiKey: ${chalk.yellow(`Creating new api key ${key}`)}`);
  try {
    const params = { name: key, enabled: true };
    if(keyValue) params.value = keyValue;

    const resp = await apigateway.createApiKey(params).promise();
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Created new api key ${key}:${resp.id}`)}`);
    return resp.id;
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to create new api key. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Create new usage plan.
 * @param {string} name Usage plan name
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 * @returns {string} Usage plan id.
 */
const createUsagePlan = async function createUsagePlan(name, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  cli.consoleLog(`AddApiKey: ${chalk.yellow(`Creating new usage plan ${name}`)}`);
  try {
    const resp = await apigateway.createUsagePlan({ name }).promise();
    return resp.id;
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to create new usage plan. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Associate api key with usage plan.
 * @param {string} apiKeyId Api key id.
 * @param {string} usagePlanId Usage plan id.
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 */
const createUsagePlanKey = async function createUsagePlanKey(apiKeyId, usagePlanId, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  cli.consoleLog(`AddApiKey: ${chalk.yellow(`Associating api key ${apiKeyId} with usage plan ${usagePlanId}`)}`);
  try {
    const params = {
      keyId: apiKeyId,
      keyType: 'API_KEY',
      usagePlanId
    };
    await apigateway.createUsagePlanKey(params).promise();
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to associate api key with usage plan. Error ${error.message || error}`)}`);
    throw error;
  }
}

/**
 * Add Api gateway to usage plan.
 * @param {string} serviceName Serverless service name
 * @param {Object} usagePlan Usage plan info
 * @param {string} stage api gateway stage
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 */
const associateRestApiWithUsagePlan = async function associateRestApiWithUsagePlan(serviceName, usagePlan, stage, creds, region, cli) {
  const cfn = new AWS.CloudFormation({
    credentials: creds,
    region
  });
  const stack = await cfn.describeStacks({ StackName: `${serviceName}-${stage}` }).promise();
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
  }

  const ag = new AWS.APIGateway({
    credentials: creds,
    region
  });
  await ag.updateUsagePlan(params).promise();
  cli.consoleLog(`AddApiKey: ${chalk.yellow(`Completed associating rest Api ${apiName} with the usage plan`)}`);
}

/**
 * 
 * @param {string} encryptedApiKeyValue Encrypted value for the API key
 * @param {string} kmsKeyRegion AWS region where KMS key is in.
 * @param {Object} cli Serverless CLI object
 */
const decryptApiKeyValue = async function decryptApiKeyValue(encryptedApiKeyValue, kmsKeyRegion, cli) {
  const kms = new AWS.KMS({ apiVersion: '2014-11-01', region: kmsKeyRegion });
  try {
    const decryptedApiKeyValue = await kms
      .decrypt({ CiphertextBlob: new Buffer(encryptedApiKeyValue, 'base64') })
      .promise()
      .then(data => data.Plaintext.toString('ascii'));

      cli.consoleLog(`AddApiKey: ${chalk.yellow(`Successfully decrypted value of "${encryptedApiKeyValue.substring(0, 10)}..." using KMS key in ${kmsKeyRegion}`)}`);
      return decryptedApiKeyValue;
  } catch (error) {
    cli.consoleLog(`AddApiKey: ${chalk.yellow(`Value "${encryptedApiKeyValue.substring(0, 10)}..." can not be decrypted properly with keys in KMS in region ${kmsKeyRegion}`)}. The value for the key will be generated.`);
    throw error;       
  }
}

/**
 * Main function that adds api key.
 * @param {Object} serverless Serverless object
 */
const addApiKey = async function addApiKey(serverless) {
  const provider = serverless.getProvider('aws');
  const awsCredentials = provider.getCredentials();
  const region = provider.getRegion();
  const stage = provider.getStage();
  const apiKeys = serverless.service.custom.apiKeys || [];
  const serviceName = serverless.service.getServiceName();

  for (let apiKey of apiKeys) {
      let apiKeyValue = null;
      const apiKeyName = apiKey.name;
      if(apiKey.value){
        apiKeyValue = apiKey.value;
        // if KMS encrypted value configured, encrypt it using KMS
        if(typeof apiKeyValue === 'object' && apiKeyValue.encrypted) {
          // use region specified for KMS keys, otherwise take the region from command line
          const kmsKeyRegion = apiKeyValue.kmsKeyRegion || region;
          apiKeyValue = await decryptApiKeyValue(apiKeyValue.encrypted, kmsKeyRegion, serverless.cli);
        }
      }

      try {

        const planName = `${apiKeyName}-usage-plan`;
        const apiKey = await getApiKey(apiKeyName, awsCredentials.credentials, region, serverless.cli);
        let usagePlan = await getUsagePlan(planName, awsCredentials.credentials, region, serverless.cli);

        let apiKeyId = null;
        let usagePlanId = null;

        // if api key doesn't exist, create one.
        if (!apiKey) {
          apiKeyId = await createKey(apiKeyName, apiKeyValue, awsCredentials.credentials, region, serverless.cli);
        } else {
          serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Api key ${apiKeyName} already exists, skipping creation.`)}`);
          apiKeyId = apiKey.id;
        }

        // if usage plan doesn't exist create one and associate the created api key with it.
        // if usage plan already exists then associate the key with it, if its not already associated.
        if (!usagePlan) {
          usagePlanId = await createUsagePlan(planName, awsCredentials.credentials, region, serverless.cli);
          await createUsagePlanKey(apiKeyId, usagePlanId, awsCredentials.credentials, region, serverless.cli);
          usagePlan = { id: usagePlanId, apiStages: [] };
        } else {
          serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Usage plan ${planName} already exists, skipping creation.`)}`);
          usagePlanId = usagePlan.id;
          const existingKeys = await getUsagePlanKeys(usagePlanId, awsCredentials.credentials, region, serverless.cli);
          if (!existingKeys.some(key => key.id === apiKeyId)) {
            await createUsagePlanKey(apiKeyId, usagePlanId, awsCredentials.credentials, region, serverless.cli);
          } else {
            serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Usage plan ${planName} already has api key associated with it, skipping association.`)}`);
          }
        }
        await associateRestApiWithUsagePlan(serviceName, usagePlan, stage, awsCredentials.credentials, region, serverless.cli);
      } catch (error) {
        serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to add api key the service. Error ${error.message || error}`)}`);
      }
   }
};

/**
 * The class that will be used as serverless plugin.
 */
class AddApiKey {
  constructor(serverless, options) {
    this.options = options;
    this.hooks = {
      'after:deploy:deploy': async function () {
        await addApiKey(serverless);
      }
    };
  }
}

module.exports = AddApiKey;
