# AWS Map Builder: Getting started

## Prerequisites

- Have [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and [AWS SAM CLI](https://aws.amazon.com/serverless/sam/) installed
  - In case of errors, do also `pip install typing-extensions`
- Configure AWS CLI credentials locally (e.g. with `aws configure`)
- Have NodeJS and Yarn
  - It's recommended to use NodeJS v14.18.1 as this is latest NodeJS runtime supported within AWS Lambda functions. It can be easily installed using e.g. [`nodenv`](https://github.com/nodenv/nodenv) and [nodenv node-build plugin](https://github.com/nodenv/node-build#readme) with just `nodenv install`
  - Yarn is needed due to workspaces and `yarn.lock` presence. You can just do `npm i -g yarn` once NodeJS is installed.
- Run `yarn` in root directory to install dependencies

## Deployment

1. **Clone the repo**
1. **Build the package**

   ```sh
   sam build
   ```

1. **Deploy**

   The `sam deploy` comes with handy CLI parameters that help with the deployment. The options are:

- **guided mode** - (recommeded) the script will prompt for a few of parameter values and create managed S3 bucket if necessary:

  ```sh
  sam deploy --guided
  ```

- **non-interactive with already existing S3 bucket**

  ```sh
  sam deploy \
    --s3-bucket my-custom-bucket-for-this-stack \
    --parameter-overrides \
      CloudMapsServiceHost="grpc.api.kentik.com" \
      AuthorizationEmail="user@example.com" \
      AuthorizationApiToken="cafebabe"
  ```

- **non-interactive with managed S3 bucket**

  ```sh
  sam deploy \
    --resolve-s3 \
    --parameter-overrides \
      CloudMapsServiceHost="grpc.api.kentik.com" \
      AuthorizationEmail="user@example.com" \
      AuthorizationApiToken="cafebabe"
  ```

### Stack parameters

As seen in above commands and also within [template.yaml](template.yaml) which defines AWS Cloudformation stack and its resources, there are some parameters that let configure the solution. Parameter values can be specified in prompts when using guided mode deploy, or using `--parameter-overrides` argument.

The parameters' reference:

- `CloudMapsServiceHost` *(required)* - Kentik-provided host address that Lambda should communicate. This should be either `grpc.api.kentik.com` or `grpc.api.kentik.eu`
- `AuthorizationEmail` *(required)* - email address of Kentik portal user account
- `AuthorizationApiToken` *(required)* - API token of corresponding Kentik portal user account. Refer to [Kentik Knowledge Base](https://kb.kentik.com/v4/Cb21.htm#Cb21-API_Token) for information on how to retrieve this value.
- `PollingPeriod` *(optional, default: `rate(1 hour)`)* - schedule expression to specify when/how frequently to run the network topology collection. It is recommended to use default value.
- `ExposeWithApi` *(optional, default: `0` / `false`)* - toggle expose the network topology collection with API gateway endpoint. Use with caution! It is recommended to use default value, as the purpose of this parameter is just for testing or troubleshooting purposes. API Gateway endpoint in this configuration is unprotected.

After the deployment, if parameter values are to be changed, it is sufficient to just run `sam deploy` with new values. It is not necessary to run `sam build` prior to that.

## Development and testing

```sh
yarn test
```
