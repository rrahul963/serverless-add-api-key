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
 * Main function that adds api key.
 * @param {Object} serverless Serverless object
 */
const addApiKey = async function addApiKey(serverless) {

  const awsCredentials = serverless.getProvider('aws').getCredentials();
  const region = serverless.getProvider('aws').getRegion();
  const apiKeyNames = serverless.service.custom.apiKeys || [];
  const planName = `${apiKeyName}-usage-plan`;
  const serviceName = serverless.service.getServiceName();

  for (var apiKeyName of apiKeyNames) {
      let apiKeyValue = null;
      if(apiKeyName.value){
        apiKeyValue = apiKeyName.value;
        apiKeyName = apiKeyName.name;
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
        await associateRestApiWithUsagePlan(serviceName, usagePlan, serverless.service.provider.stage, awsCredentials.credentials, region, serverless.cli);
      } catch (error) {
        serverless.cli.consoleLog(`AddApiKey: ${chalk.yellow(`Failed to add api key the service. Error ${error.message || error}`)}`);
      }
   }
};

/**
 * Delete api key.
 * @param {string} key Api key name.
 * @param {string} apiKeyId Api Key id.
 * @param {string} keyValue Api key value.
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object
 * @returns {string} Api key id.
 */
const deleteApiKey  = async function deleteApiKey(key, apiKeyId, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Removing api key ${key}`)}`);
  try {
    const params = { apiKey: apiKeyId };
    const resp = await apigateway.deleteApiKey(params).promise();
    cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Successfully removed api key ${key}`)}`);
    return resp.id;
  } catch (error) {
    cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Failed to remove api key. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Deletes usage plan.
 * @param {string} name Usage plan name.
 * @param {string} usagePlanId Usage plan id.
 * @param {Object} creds AWS credentials.
 * @param {string} region AWS region.
 * @param {Object} cli Serverless CLI object.
 * @returns {string} Usage plan id.
 */
const deleteUsagePlan = async function deleteUsagePlan(name, usagePlanId, creds, region, cli) {
  const apigateway = new AWS.APIGateway({
    credentials: creds,
    region
  });
  cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Deleting usage plan ${name}`)}`);
  try {
    const resp = await apigateway.deleteUsagePlan({ usagePlanId }).promise();
    return resp.id;
  } catch (error) {
    cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Failed to delete usage plan. Error ${error.message || error}`)}`);
    throw error;
  }
};

/**
 * Main function that removes api key.
 * @param {Object} serverless Serverless object
 */
const removeApiKey = async function removeApiKey(serverless) {

  const awsCredentials = serverless.getProvider('aws').getCredentials();
  const region = serverless.getProvider('aws').getRegion();
  const apiKeyNames = serverless.service.custom.apiKeys || [];

  for (var apiKeyName of apiKeyNames) {
      if(apiKeyName.value){
        apiKeyValue = apiKeyName.value;
        apiKeyName = apiKeyName.name;
      }

      try {
        const planName = `${apiKeyName}-usage-plan`;
        const apiKey = await getApiKey(apiKeyName, awsCredentials.credentials, region, serverless.cli);
        let usagePlan = await getUsagePlan(planName, awsCredentials.credentials, region, serverless.cli);

        if (apiKey) {
          await deleteApiKey(apiKeyName, apiKey.id, awsCredentials.credentials, region, serverless.cli);
        } else {
          serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Api key ${apiKeyName} already removed, skipping deletion.`)}`);
        }

        if (usagePlan) {
          await deleteUsagePlan(planName, usagePlan.id, awsCredentials.credentials, region, serverless.cli);
        } else {
          serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Usage plan: ${planName} already removed, skipping deletion.`)}`);
        }
        
      } catch (error) {
        serverless.cli.consoleLog(`RemoveApiKey: ${chalk.yellow(`Failed to remove api key the service. Error ${error.message || error}`)}`);
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
      'after:deploy:deploy': function () {
        addApiKey(serverless);
      },
      'after:remove:remove': function () {
        removeApiKey(serverless);
      }
    };
  }
}

module.exports = AddApiKey;
