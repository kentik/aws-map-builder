# Lambda generate map

Work-in-progress repo for AWS Lambda-based Kentik's AWS network topology builder. It's based on [AWS SAM CLI](https://aws.amazon.com/serverless/sam/) so it is supposed to work with commands:

## Prerequisites

- Install AWS CLI and AWS SAM CLI
  - In case of errors, do also `pip install typing-extensions`
- Configure AWS CLI credentials locally
- Have NodeJS and Yarn
- Run `yarn` in root directory


AWS SAM CLI commands should work already:

```sh
sam build
sam deploy
```

It is also possible to emulate the behavior with `yarn test` in case you have UI app GRPC API service running!

## TODO

- Authorization header within the lambda... ? How to make it "public" (no auth token required?)
  - If that is possible, we probably have to fetch Company_ID by the email
