# serverless-add-api-key
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

A [serverless](http://www.serverless.com) plugin to create api key and usage pattern (if they don't already exist) and associate them to the Rest Api.
Serverless provides this functionality natively but it doesn't allow you to associate multiple services with same apiKey and usage plan.
This plugin associates your Serverless service with same api key if the key already exists. Also works with multiple keys.

## Install

`npm install --save-dev serverless-add-api-key`

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-add-api-key
```

## Configuration
```yaml
custom:
  apiKeys:
    - name: name1
    - name: name2
```
Code automatically creates a usage plan called `<api-key-name>-usage-plan`.

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

### Specifying encrypted key values

First Use a KMS key in the region from command line to encrypt the key
```
  aws kms encrypt --key-id f7c59c6b-83de-4e80-8011-0fbd6846c695 --plaintext BzQ86PiX9t9UaAQsNWuFHN9oOkiyOwd9yXBu8RF1 | base64 --decode
```

Then configure the `value` as { encrypted: "AQICAHinIKhx8yV+y97+qS5naGEBUQrTP8RPE4HDnVvd0AzJ/wGF2tC0dPMHO..." }

```yaml
custom:
  apiKeys:
    - name: KMSEncryptedKey
    - value:
      encrypted: A-KMS-Encrypted-Value
```
When an object with `encrypted` key detected in `value`, the encrypted value will be decrypted using a proper KMS key from the region from command line
