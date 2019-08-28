require('should');
const sinon = require('sinon');
const AWS = require('aws-sdk');

const plugin = require('../../src/helper');

const provider = {
  getCredentials: () => {
    return {
      credentials: ''
    }
  },
  getRegion: () => {
    return 'us-west-2'
  },
  getStage: () => {
    return 'dev'
  }
}
const serverless = {
  getProvider: () => {
    return provider
  },
  service: {
    custom: {
      apiKeys: []
    },
    provider: {},
    getServiceName: () => {
      return 'service-name'
    }
  },
  cli: {
    consoleLog: (str) => {
      console.log(str);
    }
  }
};

describe('test addApiKey function', () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    sandbox.stub(plugin, 'decryptApiKeyValue').returns(Promise.resolve());
    sandbox.stub(plugin, 'getApiKey').returns(Promise.resolve());
    sandbox.stub(plugin, 'getUsagePlan').returns(Promise.resolve());
    sandbox.stub(plugin, 'getUsagePlanKeys').returns(Promise.resolve());
    sandbox.stub(plugin, 'createKey').returns(Promise.resolve({
      id: 'test-key-id',
      value: 'nicbcnfjcbivnschsnjc'
    }));
    sandbox.stub(plugin, 'createUsagePlan').returns(Promise.resolve('test-usage-plan-id'));
    sandbox.stub(plugin, 'createUsagePlanKey').returns(Promise.resolve());
    sandbox.stub(plugin, 'associateRestApiWithUsagePlan').returns(Promise.resolve());
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('should skip creation as no keys provided', done => {
    plugin.addApiKey(serverless, {})
    .then(() => {
      sandbox.assert.notCalled(plugin.decryptApiKeyValue);
      done();
    })
    .catch(err => {
      console.log(err);
      done(err);
    })
  });

  it('apiKey already exists and is associated with the plan', done => {
    plugin.getApiKey.restore();
    sandbox.stub(plugin, 'getApiKey').returns(Promise.resolve({
      id: 'test-key-id'
    }));
    plugin.getUsagePlan.restore();
    sandbox.stub(plugin, 'getUsagePlan').returns(Promise.resolve({
      id: 'test-usage-plan-id'
    }));
    plugin.getUsagePlanKeys.restore();
    sandbox.stub(plugin, 'getUsagePlanKeys').returns(Promise.resolve([
      {
        id: 'test-key-id'
      }
    ]));
    serverless.service.custom.apiKeys = [
      {
        name: 'test-api-key'
      }
    ];
    plugin.addApiKey(serverless, {})
    .then(() => {
      sandbox.assert.notCalled(plugin.decryptApiKeyValue);
      sandbox.assert.calledOnce(plugin.getApiKey);
      sandbox.assert.calledOnce(plugin.getUsagePlan);
      sandbox.assert.notCalled(plugin.createKey);
      sandbox.assert.notCalled(plugin.createUsagePlan);
      sandbox.assert.notCalled(plugin.createUsagePlanKey);
      sandbox.assert.calledOnce(plugin.associateRestApiWithUsagePlan);
      done();
    })
    .catch(err => {
      console.log(err);
      done(err);
    })
  });

  it('apiKey and plan does not exist', done => {
    plugin.getUsagePlanKeys.restore();
    sandbox.stub(plugin, 'getUsagePlanKeys').returns(Promise.resolve([
      {
        id: 'test-key-id'
      }
    ]));
    serverless.service.custom.apiKeys = [
      {
        name: 'test-api-key'
      }
    ];
    plugin.addApiKey(serverless, {})
    .then(() => {
      sandbox.assert.notCalled(plugin.decryptApiKeyValue);
      sandbox.assert.calledOnce(plugin.getApiKey);
      sandbox.assert.calledOnce(plugin.getUsagePlan);
      sandbox.assert.calledOnce(plugin.createKey);
      sandbox.assert.calledOnce(plugin.createUsagePlan);
      sandbox.assert.calledOnce(plugin.createUsagePlanKey);
      sandbox.assert.calledOnce(plugin.associateRestApiWithUsagePlan);
      done();
    })
    .catch(err => {
      console.log(err);
      done(err);
    })
  });
});

describe('test getApiKey function', () => {
  describe('no api key found - NotFoundException', () => {
    let agMock;
    before(() => {
      const error = new Error('forced error');
      error.code = 'NotFoundException';
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(error)
      };
      agMock = {
        getApiKeys: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getApiKey('test-plugins-us-west-2-key', agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, undefined);
        done();
      })
      .catch(err => {
        console.log(JSON.stringify(err));
        done(err);
      })
    });
  });

  describe('no matching api key found', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves({
          items: [
            {
              name: 'test-non-match-key'
            }
          ]
        })
      };
      agMock = {
        getApiKeys: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getApiKey('test-plugins-us-west-2-key', agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, undefined);
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });

  describe('matching api key found', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves({
          items: [
            {
              name: 'test-non-match-key'
            },
            {
              name: 'test-plugins-us-west-2-key'
            }
          ]
        })
      };
      agMock = {
        getApiKeys: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getApiKey('test-plugins-us-west-2-key', agMock, serverless.cli)
      .then(resp => {
        resp.name.should.eql('test-plugins-us-west-2-key');
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });

  describe('failure', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        getApiKeys: () => { return agMockPromise }
      };
    });
    it ('should throw error', done => {
      plugin.getApiKey('test-plugins-us-west-2-key', agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not be here');
      })
      .catch(err => {
        err.message.should.eql('failed');
        done();
      })
    });
  });

});

describe('test getUsagePlan function', () => {
  describe('no plan found - NotFoundException', () => {
    let agMock;
    before(() => {
      const error = new Error('forced error');
      error.code = 'NotFoundException';
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(error)
      };
      agMock = {
        getUsagePlans: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getUsagePlan('test-plugins-us-west-2-plan', agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, undefined);
        done();
      })
      .catch(err => {
        console.log(JSON.stringify(err));
        done(err);
      })
    });
  });

  describe('no matching plan found', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves({
          items: [
            {
              name: 'test-non-match-plan'
            }
          ]
        })
      };
      agMock = {
        getUsagePlans: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getUsagePlan('test-plugins-us-west-2-plan', agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, undefined);
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });

  describe('matching plan found', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves({
          items: [
            {
              name: 'test-non-match-plan'
            },
            {
              name: 'test-plugins-us-west-2-plan'
            }
          ]
        })
      };
      agMock = {
        getUsagePlans: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getUsagePlan('test-plugins-us-west-2-plan', agMock, serverless.cli)
      .then(resp => {
        resp.name.should.eql('test-plugins-us-west-2-plan');
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });

  describe('failure', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        getUsagePlans: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getUsagePlan('test-plugins-us-west-2-plan', agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not be here');
      })
      .catch(err => {
        err.message.should.eql('failed');
        done();
      })
    });
  });

});

describe('test getUsagePlanKeys function', () => {
  describe('no plan keys found', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves({
          items: []
        })
      };
      agMock = {
        getUsagePlanKeys: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getUsagePlanKeys('test-plugins-us-west-2-plan', agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, []);
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });

  describe('failure', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        getUsagePlanKeys: () => { return agMockPromise }
      };
    });
    it ('should return null', done => {
      plugin.getUsagePlanKeys('test-plugins-us-west-2-plan', agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not have come here');
      })
      .catch(err => {
        err.message.should.eql('failed');
        done();
      })
    });
  });
});

describe('test createKey function', () => {
  describe('failure', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        createApiKey: () => { return agMockPromise }
      };
    });
    it ('should throw error', done => {
      plugin.createKey('test-plugins-us-west-2-key', null, agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not come here');
      })
      .catch(err => {
        err.message.should.eql('failed');
        done();
      })
    });
  });

  describe('success', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves({
          id: 'test-key-id',
          value: 'some-random-value'
        })
      };
      agMock = {
        createApiKey: () => { return agMockPromise }
      };
    });
    it ('should return id and value', done => {
      plugin.createKey('test-plugins-us-west-2-key', null, agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        resp.should.have.keys('id', 'value');
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });
});

describe('test createUsagePlan function', () => {
  describe('failure', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        createUsagePlan: () => { return agMockPromise }
      };
    });
    it ('should throw error', done => {
      plugin.createUsagePlan('test-plugins-us-west-2-plan', agMock, serverless.cli, undefined)
      .then(resp => {
        console.log(resp);
        done('should not come here');
      })
      .catch(err => {
        err.message.should.eql('failed');
        done();
      })
    });
  });

  describe('success', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves({
          id: 'test-plan-id'
        })
      };
      agMock = {
        createUsagePlan: () => { return agMockPromise }
      };
    });
    it ('should return id and value', done => {
      plugin.createUsagePlan('test-plugins-us-west-2-plan', agMock, serverless.cli, undefined)
      .then(resp => {
        console.log(resp);
        resp.should.eql('test-plan-id');
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });
});

describe('test createUsagePlanKey function', () => {
  describe('failure', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        createUsagePlanKey: () => { return agMockPromise }
      };
    });
    it ('should throw error', done => {
      plugin.createUsagePlanKey('test-key-id', 'test-plan-id', agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not come here');
      })
      .catch(err => {
        err.message.should.eql('failed');
        done();
      })
    });
  });

  describe('success', () => {
    let agMock;
    before(() => {
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves()
      };
      agMock = {
        createUsagePlanKey: () => { return agMockPromise }
      };
    });
    it ('should return nothing', done => {
      plugin.createUsagePlanKey('test-key-id', 'test-plan-id', agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, undefined);
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });
});

describe('test associateRestApiWithUsagePlan function', () => {
  describe('describeStacks failure', () => {
    let agMock;
    let cfnMock;
    before(() => {
      cfnMock = new AWS.CloudFormation();
      const cfnMockPromise = {
        promise: sinon.fake.rejects(new Error('cfn failed'))
      };
      cfnMock = {
        describeStacks: () => { return cfnMockPromise }
      };
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        createUsagePlanKey: () => { return agMockPromise }
      };
    });
    it ('should throw error', done => {
      plugin.associateRestApiWithUsagePlan('test-stack', 'test-plan-id', 'dev', cfnMock, agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not come here');
      })
      .catch(err => {
        err.message.should.eql('cfn failed');
        done();
      })
    });
  });

  describe('usage plan already associated', () => {
    let agMock;
    let cfnMock;
    const usagePlan = {
      id: 'test-usage-plan-id',
      apiStages: [
        {
          apiId: 'andf03fbxe',
          stage: 'dev'
        },
        {
          apiId: 'andf03fbxe22',
          stage: 'dev'
        }
      ]
    }
    before(() => {
      cfnMock = new AWS.CloudFormation();
      const cfnMockPromise = {
        promise: sinon.fake.resolves({
          Stacks: [
            {
              Outputs: [
                {
                  OutputKey: 'ServiceEndpoint',
                  OutputValue: 'https://andf03fbxe.execute-api.us-west-2.amazonaws.com/dev'
                }
              ]
            }
          ]
        })
      };
      cfnMock = {
        describeStacks: () => { return cfnMockPromise }
      };
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      agMock = {
        createUsagePlanKey: () => { return agMockPromise }
      };
    });
    it ('should return', done => {
      plugin.associateRestApiWithUsagePlan('test-stack', usagePlan, 'dev', cfnMock, agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, undefined);
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });

  describe('usage plan not associated, apigateway action fails', () => {
    let agMock;
    let cfnMock;
    const usagePlan = {
      id: 'test-usage-plan-id',
      apiStages: [
        {
          apiId: 'andf03fbxe22',
          stage: 'dev'
        }
      ]
    }
    before(() => {
      cfnMock = new AWS.CloudFormation();
      const cfnMockPromise = {
        promise: sinon.fake.resolves({
          Stacks: [
            {
              Outputs: [
                {
                  OutputKey: 'ServiceEndpoint',
                  OutputValue: 'https://andf03fbxe.execute-api.us-west-2.amazonaws.com/dev'
                }
              ]
            }
          ]
        })
      };
      cfnMock = {
        describeStacks: () => { return cfnMockPromise }
      };
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.rejects(new Error('ag failed'))
      };
      agMock = {
        updateUsagePlan: () => { return agMockPromise }
      };
    });
    it ('should return', done => {
      plugin.associateRestApiWithUsagePlan('test-stack', usagePlan, 'dev', cfnMock, agMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not come here');
      })
      .catch(err => {
        err.message.should.eql('ag failed');
        done();
      })
    });
  });

  describe('usage plan already associated', () => {
    let agMock;
    let cfnMock;
    const usagePlan = {
      id: 'test-usage-plan-id',
      apiStages: [
        {
          apiId: 'andf03fbxe22',
          stage: 'dev'
        }
      ]
    }
    before(() => {
      cfnMock = new AWS.CloudFormation();
      const cfnMockPromise = {
        promise: sinon.fake.resolves({
          Stacks: [
            {
              Outputs: [
                {
                  OutputKey: 'ServiceEndpoint',
                  OutputValue: 'https://andf03fbxe.execute-api.us-west-2.amazonaws.com/dev'
                }
              ]
            }
          ]
        })
      };
      cfnMock = {
        describeStacks: () => { return cfnMockPromise }
      };
      agMock = new AWS.APIGateway();
      const agMockPromise = {
        promise: sinon.fake.resolves()
      };
      agMock = {
        updateUsagePlan: () => { return agMockPromise }
      };
    });
    it ('should return', done => {
      plugin.associateRestApiWithUsagePlan('test-stack', usagePlan, 'dev', cfnMock, agMock, serverless.cli)
      .then(resp => {
        sinon.assert.match(resp, undefined);
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });
});

describe('test decryptApiKeyValue function', () => {
  describe('failure', () => {
    let kmsMock;
    before(() => {
      kmsMock = new AWS.KMS();
      const kmsMockPromise = {
        promise: sinon.fake.rejects(new Error('failed'))
      };
      kmsMock = {
        decrypt: () => { return kmsMockPromise }
      }
    });
    it ('should throw error', done => {
      plugin.decryptApiKeyValue('test-value', 'us-west-2', kmsMock, serverless.cli)
      .then(resp => {
        console.log(resp);
        done('should not be here');
      })
      .catch(err => {
        err.message.should.eql('failed');
        done();
      })
    });
  });

  describe('success', () => {
    let kmsMock;
    before(() => {
      kmsMock = new AWS.KMS();
      const kmsMockPromise = {
        promise: sinon.fake.resolves({
          Plaintext: 'decrypted-value'
        })
      };
      kmsMock = {
        decrypt: () => { return kmsMockPromise }
      }
    });
    it ('should throw error', done => {
      plugin.decryptApiKeyValue('test-value', 'us-west-2', kmsMock, serverless.cli)
      .then(resp => {
        resp.should.eql('decrypted-value');
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      })
    });
  });
});
