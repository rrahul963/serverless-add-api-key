# serverless-add-api-key
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

A [serverless](http://www.serverless.com) plugin to create api key and usage pattern (if they don't already exist) and associates then to the Rest Api.
Serverless provides this functionality natively but it doesn't allow you to associate multiple services with same apiKey and usage plan.
This plugin associates your Serverless service with same api key if the key already exists.

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
  apikey: <api key name>
```
Code automatically creates a usage plan called `<api-key-name>-usage-plan`.

