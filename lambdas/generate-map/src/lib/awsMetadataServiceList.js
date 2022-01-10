/**
 * EC2:
 * aws ec2 describe-availability-zones
 * aws ec2 describe-customer-gateways
 * aws ec2 describe-flow-logs
 * aws ec2 describe-internet-gateways
 * aws ec2 describe-instances
 * aws ec2 describe-instance-status
 * aws ec2 describe-nat-gateways
 * aws ec2 describe network-acls
 * aws ec2 describe-network-interfaces
 * aws ec2 describe-prefix-lists
 * aws ec2 describe-route-tables
 * aws ec2 describe-security-groups
 * aws ec2 describe-subnets
 * aws ec2 describe-transit-gateways
 * aws ec2 describe-transit-gateway-attachments
 * aws ec2 describe-transit-gateway-route-tables
 * aws ec2 describe-vpcs
 * aws ec2 describe-vpc-endpoints
 * aws ec2 describe-vpc-peering-connections
 * aws ec2 describe-vpn-connections
 * aws ec2 describe-vpn-gateways
 * aws ec2 describe-client-vpn-endpoints (out of scope)
 * aws ec2 search-transit-gateway-routes (per tgw route table from describe-transit-gateway-route-tables)
 *
 * DirectConnect:
 * aws directconnect describe-virtual-gateways
 * aws directconnect describe-connections
 * aws directconnect describe-virtual-interfaces
 * aws directconnect describe-direct-connect-gateways
 * aws directconnect describe-direct-connect-gateway-attachments (per gateway from describe-dc-gateways)
 *
 * ELB:
 * aws elb describe-load-balancers
 *
 * NetworkFirewalls:
 * aws network-firewall list-firewalls
 * aws network-firewall describe-firewall (per firewall from list-firewalls)
 */
module.exports = {
  ec2: [
    'describeAvailabilityZones',
    'describeCustomerGateways',
    'describeFlowLogs',
    'describeInternetGateways',
    'describeInstances',
    // 'describeInstanceStatus', // we get "state" from describeInstances, only need this for Status
    'describeNatGateways',
    'describeNetworkAcls',
    'describeNetworkInterfaces',
    'describePrefixLists',
    'describeRouteTables',
    'describeSecurityGroups',
    'describeSubnets',
    'describeTransitGateways',
    'describeTransitGatewayAttachments',
    // 'describeTransitGatewayVpcAttachments', // this is actually included in ec2.describeTransitGatewayAttachments
    'describeTransitGatewayRouteTables',
    'describeTransitGatewayConnects',
    'describeTransitGatewayConnectPeers',
    'describeVpcs',
    'describeVpcEndpoints',
    'describeVpcPeeringConnections',
    'describeVpnConnections',
    'describeVpnGateways'
    // , 'searchTransitGatewayRoutes' // we're doing this per tgw-rtb
  ],
  dc: [
    'describeDirectConnectGateways',
    // 'describeDirectConnectGatewayAttachments', // we're doing this per gateway
    'describeVirtualInterfaces',
    'describeLags',
    'describeConnections'
    // 'describeVirtualGateways' // are these the same as ec2.VpnGateways...?
  ],
  elb: ['describeLoadBalancers'],
  nfw: ['listFirewalls'] // , 'describeFirewall']
};

