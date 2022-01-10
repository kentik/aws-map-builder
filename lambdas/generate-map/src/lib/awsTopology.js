const Promise = require('bluebird');
const AWS = require('aws-sdk');
const awsMetadataServices = require('./awsMetadataServiceList');

function augmentTransitGatewayRouteTables(ec2, TransitGatewayRouteTables) {
  return Promise.map(TransitGatewayRouteTables, tgrt => {
    const { TransitGatewayRouteTableId } = tgrt;
    return ec2
      .searchTransitGatewayRoutes({
        TransitGatewayRouteTableId,
        Filters: [{ Name: 'state', Values: ['active', 'blackhole'] }]
      })
      .promise()
      .then(({ Routes }) => {
        tgrt.Routes = Routes;
      });
  }).then(() => ({ TransitGatewayRouteTables }));
}

function augmentDirectConnects(dc, dcgws) {
  return Promise.map(dcgws, gw => {
    return Promise.all([
      dc.describeDirectConnectGatewayAttachments({ directConnectGatewayId: gw.directConnectGatewayId }).promise(),
      dc.describeDirectConnectGatewayAssociations({ directConnectGatewayId: gw.directConnectGatewayId }).promise()
    ]).then(([{ directConnectGatewayAttachments }, { directConnectGatewayAssociations }]) => {
      gw.directConnectGatewayAttachments = directConnectGatewayAttachments;
      gw.directConnectGatewayAssociations = directConnectGatewayAssociations;
      return gw;
    });
  }).then(directConnectGateways => ({ directConnectGateways }));
}

function finishDescribe(service, fn, res) {
  return Promise.resolve().then(() => {
    const { NextToken, ...rest } = res;
    if (NextToken) {
      return service[fn]({ NextToken })
        .promise()
        .then(nextRes => {
          Object.keys(rest).forEach(key => {
            nextRes[key] = rest[key].concat(nextRes[key]);
          });
          return finishDescribe(service, fn, nextRes);
        });
    }
    return res;
  });
}

module.exports = {
  getInfrastructure: async () => {
    try {
      const ec2 = new AWS.EC2();
      const dc = new AWS.DirectConnect();
      const elb = new AWS.ELB();
      const nfw = new AWS.NetworkFirewall();
      const arr = await Promise.map(
        [
          ...awsMetadataServices.ec2.map(fn => ({ service: ec2, fn })),
          ...awsMetadataServices.dc.map(fn => ({ service: dc, fn })),
          ...awsMetadataServices.elb.map(fn => ({ service: elb, fn })),
          ...awsMetadataServices.nfw.map(fn => ({ service: nfw, fn }))
        ],
        ({ service, fn }) =>
          service[fn]()
            .promise()
            .then(res => {
              if (service === dc && fn === 'describeDirectConnectGateways' && res.directConnectGateways) {
                return augmentDirectConnects(dc, res.directConnectGateways);
              }
              if (service === ec2 && fn === 'describeTransitGatewayRouteTables' && res.TransitGatewayRouteTables) {
                return augmentTransitGatewayRouteTables(ec2, res.TransitGatewayRouteTables);
              }
              if (
                service === ec2 &&
                (fn === 'describeInstances' || fn === 'describeInstanceStatus' || fn === 'describeFlowLogs') &&
                res.NextToken
              ) {
                return finishDescribe(ec2, fn, res);
              }
              return res;
            })
      );
      return arr.reduce((acc, res) => Object.assign(acc, res), {});
    } catch (error) {
      throw new Error(`AWS topology retrieval failed: ${error.message}`);
    }
  }
};
