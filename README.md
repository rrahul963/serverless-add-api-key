# serverless-add-api-key

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

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

### Specifying key(s) and let AWS auto set the value

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
    - SomeOtherKeyThatAssignsRandomValue
```

### Specifying usage plan (To put both keys in the same usage plan)

```yaml
custom:
  apiKeys:
    - name: SomeKey
      usagePlan:
        name: "name-of-first-usage-plan"
    - name: SomeOtherKey
      usagePlan:
        name: "name-of-first-usage-plan"
    - name: ThirdKey
      usagePlan:
        name: "name-of-second-plan"
        description: "Description of second plan"
        quota:
          limit: 2000
          period: DAY
        throttle:
          burstLimit: 100
          rateLimit: 20
    - name: AKeyWithNoUsagePlan
provider:
  usagePlan:
    name: "default-usage-plan"
    description: "Used for serverless as the default for the process or for custom apiKeys above if no usagePlan is provided"
    quota:
      limit: 5000
      period: DAY
    throttle:
      burstLimit: 100
      rateLimit: 50
```

If the usage plan needs to be created, first it will look for a usagePlan property that is an object with a name property. If it does not find that it will use the usagePlan attribtues defined in the `provider` section, if defined.

NOTE: If not specified in the configuration, an individual usagePlan will be created for each key listed. For example, `AKeyWithNoUsagePlan` will have an individual usage plan named `AKeyWithNoUsagePlan-usage-plan` with no restrictions.

### Stage-specific configuration

To specifiy different API keys for each stage, nest the configuration in a property with the name of the relevant stage.

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

Code automatically creates usage plan called `<api-key-name>-usage-plan`.
