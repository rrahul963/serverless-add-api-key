# serverless-add-api-key

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com) [![Build Status](https://travis-ci.org/rrahul963/serverless-add-api-key.svg?branch=master)](https://travis-ci.org/rrahul963/serverless-add-api-key.svg?branch=master) [![npm version](https://badge.fury.io/js/serverless-add-api-key.svg)](https://badge.fury.io/js/serverless-add-api-key)

A [serverless](http://www.serverless.com) plugin to create api key and usage pattern (if they don't already exist) and associate them to the Rest Api.
Serverless provides this functionality natively but it doesn't allow you to associate multiple services with same apiKey and usage plan.
This plugin associates your Serverless service with same api key if the key already exists. Also works with multiple keys.

The plugin supports serverless stages, so you can create key(s) with different name in different stage.

_**P.S.** The plugin by default displays the created key and value on the console. If you wish to avoid that then specify `--conceal` option with `sls deploy` command_

## Install

`npm install --save-dev serverless-add-api-key`

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-add-api-key
```

## Configuration

### Specifying key(s) and let AWS auto set the value - this is the minimum required configuration to use this plugin

```yaml
custom:
  apiKeys:
    - name: name1
    - name: name2
```

### Specifying key values

```yaml
custom:
  apiKeys:
    - name: SomeKey
      value: your-api-key-that-is-at-least-20-characters-long
    - name: KeyFromSlsVariables
      value: ${opt:MyKey}
```

### Specifying encrypted key values

In the case that you do not want to expose your raw API key string in your repository, you could check in the encrypted API key strings using KMS key in a region. To do this, first Use a KMS key in the region from command line to encrypt the key:

```sh
  aws kms encrypt --key-id f7c59c6b-83de-4e80-8011-0fbd6846c695 --plaintext BzQ86PiX9t9UaAQsNWuFHN9oOkiyOwd9yXBu8RF1 | base64 --decode
```

Then configure the `value` as { encrypted: "AQICAHinIKhx8yV+y97+qS5naGEBUQrTP8RPE4HDnVvd0AzJ/wGF2tC0dPMHO..." }

```yaml
custom:
  apiKeys:
    - name: KMSEncryptedKey
      value:
        encrypted: A-KMS-Encrypted-Value
        kmsKeyRegion: us-west-1
```

When an object with `encrypted` and `kmsKeyRegion` key detected in `value`, the encrypted value will be decrypted using a proper KMS key from the region specified in `kmsKeyRegion`. In the case of missing `kmsKeyRegion`, the region from command line will be used.

### Specifying usage plan

```yaml
custom:
  apiKeys:
    - name: KeyWithFullUsagePlanDetail
      usagePlan:
        name: "name-of-first-usage-plan" (required if usagePlan is specified. rest of the fields are optional)
        description: "Description of first plan"
        quota:
          limit: 1000
          period: DAY
        throttle:
          burstLimit: 100
          rateLimit: 20
    - name: KeyWithOnlyUsagePlanName
      usagePlan:
        name: "name-of-first-usage-plan"
    - name: AKeyWithNoUsagePlan
    - name: KeyWithNoUsagePlanButValue
      value: SomeKeyValue

provider: // this is optional - plugin will use this if usage plan options are not provided in custom section as above
  usagePlan:
    name: "default-usage-plan-name"
    description: "Used for serverless as the default for the process or for custom apiKeys above if no usagePlan is provided"
    quota:
      limit: 5000
      period: DAY
    throttle:
      burstLimit: 100
      rateLimit: 50
```

If the usage plan needs to be created, first it will look for a usagePlan property that is an object with a name property. If it does not find that it will use the usagePlan attributes defined in the `provider` section, if defined.

**NOTE**:
- If not specified in the configuration, an individual usagePlan will be created for each key listed.
For example, `AKeyWithNoUsagePlan` will have an individual usage plan named `AKeyWithNoUsagePlan-usage-plan` with no restrictions.
- When UsagePlan configuration is provided under `provider` section, serverless automatically creates a usage plan named `<service-name>-plan`, but this plugin is not using that usage plan.

### Stage-specific configuration

To specify different API keys for each stage, nest the configuration in a property with the name of the relevant stage.
Note - When specifying the keys for each stage, you can use any of the above configuration like providing value/encrypted value and usage plan.

```yaml
custom:
  apiKeys:
    dev:
      - name: name1
      - name: name2
    prod:
      - name: name1
    other-stage-name:
      - name: name5
```

### Remove Api Key(s) and Usage plan(s)
Run severless remove command to remove the created api key and usage plan.
If the Usage plan is associated with more than one api then the plan and key will be deleted only when the last service is removed.

If you dont want to delete a key as part of `sls remove` command then you can set `deleteAtRemoval` as `false` (default is `true` if not set)

```yaml
custom:
  apiKeys:
    - name: name1
      deleteAtRemoval: false
    - name: name2
```

based on above configuration, key `name1` will not be deleted when running `sls remove` but key `name2` will be removed.


For more info on how to get started with Serverless Framework click [here](https://serverless.com/framework/docs/getting-started/).


### Revisions:

* 3.3.0 - Added UsagePlan settings
* 3.3.1 - Added unit tests, examples and travis-ci
* 4.0.0
  - Added Remove hook
  - Added option to read the usage plan name from the provider section.
* 4.0.1 - Updated unit tests and added pre-commit and pre-push hooks using husky
* 4.0.2 - Fixed usagePlan config selection criterion 
* 4.1.0 - Added an option to not delete apiKey with sls remove
* 4.1.1 - Fixed the issue with deleteAtRemoval not working consistently
* 4.2.0 - Added support for httpOptions when creating AWS service objects
