# AWS Map Builder

![Build and Test](https://github.com/kentik/aws-map-builder/actions/workflows/tests.yml/badge.svg)

**Build and ingest the data about your AWS network infrastructure topology into Kentik Portal using this very AWS Serverless-based package.**

Once this package is installed into your AWS account (in other words: deployed using AWS Cloudformation), it's setup to run periodically (by default once every 1 hour) to read information about your AWS network infrastructure and send it to Kentik portal so that you can later on visualize and monitor your network easily there.

- [Getting started: how to install and configure it in your AWS environment](docs/USAGE.md)
- [Technical details: how it works in high-level with some detail](docs/DESIGN.md)
