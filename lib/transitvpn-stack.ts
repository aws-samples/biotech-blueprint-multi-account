import core = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import sm = require("@aws-cdk/aws-secretsmanager");
import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import kms = require("@aws-cdk/aws-kms");
import ram = require("@aws-cdk/aws-ram");
import iam = require("@aws-cdk/aws-iam");
import fs = require('fs');
import { TransitRoute, TransitRouteProps } from '../lib/transitroutes-stack';
import log = require('@aws-cdk/aws-logs');
import certmgr = require('@aws-cdk/aws-certificatemanager');

//import tg = require("@aws-cdk/aws-ec2.CfnTransitGatewayAttachment);


export interface TransitVpnProps extends core.StackProps {
  AdConnectorId: string;
  transitVpc: ec2.IVpc;
  vpnClientAssignedAddrCidr: string;
  domainApex: string;
  ResearchVpcCidr: string;
  TransitVpcCidr: string;
  IdentityVpcCidr: string;
  IdentityAccountAdConnectorSecretArn: string;
  IdentityAccountAdConnectorSecretKeyArn: string;
}

export class TransitVpn extends core.Construct {
  
  public readonly ClientVpnEndpoint: ec2.CfnClientVpnEndpoint;
  public readonly vpnAdGroupSid: core.SecretValue;
  public readonly PrivateSubnets: Array<string>;
  
  constructor(scope: core.Construct, id: string, props: TransitVpnProps) {
    super(scope, id);
    
    const adConnectorSecrets = sm.Secret.fromSecretArn(this, 'adConnectorSecrets', props.IdentityAccountAdConnectorSecretArn);
    
    const vpnAdGroupSid = adConnectorSecrets.secretValueFromJson('VpnUsersAdGroupSID');
    this.vpnAdGroupSid = vpnAdGroupSid;
    const domainControllerDns0 = adConnectorSecrets.secretValueFromJson('DomainControllerDnsAddress0');
    const domainControllerDns1 = adConnectorSecrets.secretValueFromJson('DomainControllerDnsAddress1');
    
    
    let connectorAuthRequestParam: ec2.CfnClientVpnEndpoint.DirectoryServiceAuthenticationRequestProperty = {
         directoryId: props.AdConnectorId
    };
    
    let authOptions: Array<ec2.CfnClientVpnEndpoint.ClientAuthenticationRequestProperty> = [{
        type: "directory-service-authentication",
        activeDirectory: connectorAuthRequestParam
    }];

    
    const vpnAccessLogGroup = new log.LogGroup(this, 'ClientVpnAccessLogGroup', {
       retention: log.RetentionDays.SIX_MONTHS
    });
    const vpnAccessLogStream = new log.LogStream(this, 'ClientVpnAccessLogStream', {
      logGroup: vpnAccessLogGroup,
    });
    
    let connectionLogOptions: ec2.CfnClientVpnEndpoint.ConnectionLogOptionsProperty = {
         cloudwatchLogGroup: vpnAccessLogGroup.logGroupName,
         cloudwatchLogStream: vpnAccessLogStream.logStreamName,
         enabled: true
    };
    

    
    const vpnCertCustomResourceRole = new iam.Role(this, 'VpnCertificateLambdaCustomResourceRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    vpnCertCustomResourceRole.addToPolicy(new iam.PolicyStatement({
      resources: ["*"],
      actions: ['acm:ImportCertificate', 'acm:DeleteCertificate'] 
    }));
    vpnCertCustomResourceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    
    const vpnCertificate = new cfn.CustomResource(this, 'vpnCertificate', {
        provider: cfn.CustomResourceProvider.lambda(new lambda.SingletonFunction(this, 'Singleton', {
            role: vpnCertCustomResourceRole, 
            uuid: "CreateVpnCertificateLambda",
            code: new lambda.InlineCode(fs.readFileSync('scripts/vpn-endpoint-security-resource-handler.py', { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: core.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_2_7,
            memorySize: 1024
        }))
    });
    
    const VpnEndpoint = new ec2.CfnClientVpnEndpoint(this, 'clientVpnEndpoint', {
        
        authenticationOptions: authOptions,
        clientCidrBlock: props.vpnClientAssignedAddrCidr, 
        connectionLogOptions: connectionLogOptions,
        serverCertificateArn: vpnCertificate.ref, 
        description: "Transit Client VPN Endpoint",
        splitTunnel: true, 
        //dnsServers: XXX,
    });
    
    const privateSubnetSelection = { subnetType: ec2.SubnetType.PRIVATE };
    const privateSubnets = props.transitVpc.selectSubnets(privateSubnetSelection).subnetIds;
    
    this.PrivateSubnets = privateSubnets;
    this.ClientVpnEndpoint = VpnEndpoint;
    
    const endpointAssociation0 = new ec2.CfnClientVpnTargetNetworkAssociation(this, 'clientVpnEndpointAssociation0', {
        clientVpnEndpointId: VpnEndpoint.ref,
        subnetId: core.Fn.select(0,privateSubnets)
    });
    
    const endpointAssociation1 = new ec2.CfnClientVpnTargetNetworkAssociation(this, 'clientVpnEndpointAssociation1', {
        clientVpnEndpointId: VpnEndpoint.ref,
        subnetId: core.Fn.select(1,privateSubnets)
    });
    
    const vpnUsersSecurityGroup = new ec2.SecurityGroup(this, 'VpnUsersSG', {
        vpc: props.transitVpc,
        description: 'TransitVPNUsersSG',
        allowAllOutbound: true   
    });
    
    new ec2.CfnClientVpnAuthorizationRule(this, 'ResearchAuthorization', {
        clientVpnEndpointId: VpnEndpoint.ref,
        targetNetworkCidr: props.ResearchVpcCidr,
        accessGroupId: core.Token.asString(vpnAdGroupSid),
        description: "Allows Transit VPN users access to Research VPC"
    });
    
    new ec2.CfnClientVpnAuthorizationRule(this, 'TransitAuthorization', {
        clientVpnEndpointId: VpnEndpoint.ref,
        targetNetworkCidr: props.TransitVpcCidr,
        accessGroupId: core.Token.asString(vpnAdGroupSid),
        description: "Allows Transit VPN users access to Transit VPC"
    });
    
    new ec2.CfnClientVpnAuthorizationRule(this, 'IdentityAuthorization', {
        clientVpnEndpointId: VpnEndpoint.ref,
        targetNetworkCidr: props.IdentityVpcCidr,
        accessGroupId: core.Token.asString(vpnAdGroupSid),
        description: "Allows Transit VPN users access to Identity VPC"
    });
    
    
    const researchRoute0 = new ec2.CfnClientVpnRoute(this, 'researchRoute', {
        clientVpnEndpointId: VpnEndpoint.ref,
        destinationCidrBlock: props.ResearchVpcCidr,
        targetVpcSubnetId: core.Fn.select(0,privateSubnets)
    });
    
    const identityRoute0 = new ec2.CfnClientVpnRoute(this, 'identityRoute', {
        clientVpnEndpointId: VpnEndpoint.ref,
        destinationCidrBlock: props.IdentityVpcCidr,
        targetVpcSubnetId: core.Fn.select(0,privateSubnets)
    });
    
    researchRoute0.addDependsOn(endpointAssociation0);
    identityRoute0.addDependsOn(endpointAssociation0);
    
    const researchRoute1 = new ec2.CfnClientVpnRoute(this, 'researchRoute1', {
        clientVpnEndpointId: VpnEndpoint.ref,
        destinationCidrBlock: props.ResearchVpcCidr,
        targetVpcSubnetId: core.Fn.select(1,privateSubnets)
    });
    
    const identityRoute1 = new ec2.CfnClientVpnRoute(this, 'identityRoute1', {
        clientVpnEndpointId: VpnEndpoint.ref,
        destinationCidrBlock: props.IdentityVpcCidr,
        targetVpcSubnetId: core.Fn.select(1,privateSubnets)
    });
    
    researchRoute1.addDependsOn(endpointAssociation1);
    identityRoute1.addDependsOn(endpointAssociation1);
    
  }
}


  

export class BBTransitVpnEnrollment extends core.Construct {

  constructor(scope: core.Construct, id: string, props: TransitVpnEnrollmentAccountProps) {

    super(scope, id);

    new ec2.CfnClientVpnAuthorizationRule(this, `Authorizations`, {
        clientVpnEndpointId: props.TransitVpn.ClientVpnEndpoint.ref,
        targetNetworkCidr: props.AccountToEnrollVpcCidr,
        accessGroupId: core.Token.asString(props.TransitVpn.vpnAdGroupSid),
        description: `Allows Transit VPN users access to ${props.AccountDescription} VPC`
    });
    
    new ec2.CfnClientVpnRoute(this, `VpnRoutes0`, {
        clientVpnEndpointId: props.TransitVpn.ClientVpnEndpoint.ref,
        destinationCidrBlock: props.AccountToEnrollVpcCidr,
        targetVpcSubnetId: core.Fn.select(0,props.TransitVpn.PrivateSubnets)
    });
    
    new ec2.CfnClientVpnRoute(this, `VpnRoutes1`, {
        clientVpnEndpointId: props.TransitVpn.ClientVpnEndpoint.ref,
        destinationCidrBlock: props.AccountToEnrollVpcCidr,
        targetVpcSubnetId: core.Fn.select(1,props.TransitVpn.PrivateSubnets)
    });
    
    new TransitRoute(this,`TransitGatewayRoute`, {
        orgId: props.OrgId,
        targetVpcTransitSecretsArn: props.targetVpcTransitSecretsArn,
        transitVPCRouteTableSecretsArn: props.transitVPCRouteTableSecretsArn,
        targetVPCCidrRangeSecretsArn: props.targetVPCCidrRangeSecretsArn,
    });

  }
  
}
export interface TransitVpnEnrollmentAccountProps extends core.StackProps {
    TransitVpn: TransitVpn;
    AccountToEnrollVpcCidr: string;
    AccountDescription: string;
    OrgId: string;
    targetVpcTransitSecretsArn: string;
    transitVPCRouteTableSecretsArn: string;
    targetVPCCidrRangeSecretsArn: string;
}


