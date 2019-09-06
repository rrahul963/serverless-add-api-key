const helper = require('./helper');

/**
 * The class that will be used as serverless plugin.
 */
class AddApiKey {
  constructor(serverless, options) {
    this.options = options;
    this.hooks = {
      'after:deploy:deploy': () => helper.addApiKey(serverless, options),
      'remove:remove': () => helper.removeApiKey(serverless, options)
    };
  }
}

module.exports = AddApiKey;
