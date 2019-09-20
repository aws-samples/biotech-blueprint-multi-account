#!/usr/bin/env node
import 'source-map-support/register';
import core = require('@aws-cdk/core');
import kms = require('@aws-cdk/aws-kms');
import sm = require("@aws-cdk/aws-secretsmanager");
import ec2 = require('@aws-cdk/aws-ec2');
import { BBMasterIntegrationConstruct } from '../lib/bb-20-master-stack';
import { BBChildAccountCore, BbCoreProps } from '../lib/bb-20-stack';
import { TransitAccountCore, TransitCoreProps } from '../lib/transit-stack';
import { IdentityCore, IdentityCoreProps } from '../lib/identity-stack';
import { TransitRoute, TransitRouteProps } from '../lib/transitroutes-stack';
import { AdConnector, AdConnectorProps } from '../lib/ad-connector';
import { VpcRouteTableTransitRoute, VpcRouteTableTransitRouteProps } from '../lib/vpcRouteTableTransitRoute';
import { TransitVpn, TransitVpnProps } from '../lib/transitvpn-stack';


const app = new core.App();

const orgId = 'arn:aws:organizations::450255456661:organization/o-tbvgg7skas';
const corporateDnsApex = "bbtest.underwoodpaul.com"
const netBiosName = "corp"
const envMaster  = { account: '450255456661'};
const envIdentity  = { account: '450255456661', desiredVpcCidr: "10.1.0.0/16"};
const envTransit = { account: '511685597804', desiredVpcCidr: "10.0.0.0/16"};
const envResearch =   { account: '121660342839', desiredVpcCidr: "11.0.0.0/16"};
const vpnClientAssignedAddrCidr = "12.0.0.0/16";
const vpnClientAccessCidr = "0.0.0.0/0";

    
export class masterAccountStack extends core.Stack {
  public readonly IntegrationProps: BBMasterIntegrationConstruct;

  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);
    const integrationProps = new BBMasterIntegrationConstruct(this, 'BBMasterIntegrationConstruct', {orgId: orgId});
    this.IntegrationProps = integrationProps;
  }
}
var masterAccount = new masterAccountStack(app,'MasterAccountStack', {env: envMaster});





export class transitAccountStack extends core.Stack {

  public readonly Core: TransitAccountCore;
  readonly vpc: ec2.IVpc;
  
  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);
    
    const transitAcccountCore = new TransitAccountCore(this, 'TransitCore', {
        env: envTransit,
        orgId: orgId,
        masterAccountId: envMaster.account,
        desiredVpcCidr: envTransit.desiredVpcCidr
    });

    this.vpc = transitAcccountCore.Vpc;
    
    
  }
}
const transitAccount = new transitAccountStack(app,'TransitAccountStack', {env: envTransit});






export class childAccountStack extends core.Stack {
  public readonly transitGatewayAttachment: ec2.CfnTransitGatewayAttachment;
  public readonly Vpc: ec2.Vpc;
  public readonly VpcCidrRange: string;
  public readonly txGtwyAttachmentId: string;
  
  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);
    
    // const accountCore = new BBChildAccountCore(this, 'BBChildAccountCore', {
    //     orgId: orgId,
    //     integrationSecretsArn: "arn:aws:secretsmanager:us-east-1:511685597804:secret:tx"
    // });
    

    const accountCore = new BBChildAccountCore(this, 'BBChildAccountCore', {
        orgId: orgId,
        integrationSecretsArn: app.node.tryGetContext("transitGatewaySecretArn"),
        desiredVpcCidr: envResearch.desiredVpcCidr
    });
    
    this.Vpc = accountCore.Vpc;
    this.VpcCidrRange = accountCore.Vpc.vpcCidrBlock;
    
    
  }
}
const researchAccount = new childAccountStack(app,'ResearchAccountStack', {env: envResearch});




export class IdentityStack extends core.Stack {
  public readonly Vpc: ec2.IVpc;
  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);
    

    
    const identityCore = new IdentityCore(this, 'IdentityCore', {
         orgId: orgId,
         corporateDnsApex: corporateDnsApex,
         netBiosName: netBiosName,
         integrationSecretsArn: app.node.tryGetContext("transitGatewaySecretArn"),
         desiredVpcCidr: envIdentity.desiredVpcCidr
     });
     
     this.Vpc = identityCore.Vpc;
    
  }
}
const identityAccount = new IdentityStack(app,'IdentityAccountStack', {env: envMaster});



export class TransitRoutesStack extends core.Stack {
  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);
    
    const transitVPCRouteTableSecretsArn = app.node.tryGetContext("transitGatewayRouteTableSecretArn"); 
    
    const researchVpcTransitSecretsArn = app.node.tryGetContext("researchTgAttachmentSecretArn");
    const researchVpcCidrRangeSecretsArn = app.node.tryGetContext("researchVpcCidrSecretArn");
    
    const identityVpcTransitSecretsArn = app.node.tryGetContext("identityTgAttachmentSecretArn");
    const identityVpcCidrRangeSecretsArn = app.node.tryGetContext("identityVpcCidrSecretArn");
    
    const researchVpcRoute = new TransitRoute(this, 'TransitResearchRoute', {
      orgId: orgId, 
      transitVPCRouteTableSecretsArn: transitVPCRouteTableSecretsArn,
      targetVpcTransitSecretsArn: researchVpcTransitSecretsArn,
      targetVPCCidrRangeSecretsArn: researchVpcCidrRangeSecretsArn
    });
    
    const IdentityVpcRoute = new TransitRoute(this, 'TransitIdentityRoute', {
      orgId: orgId, 
      transitVPCRouteTableSecretsArn: transitVPCRouteTableSecretsArn,
      targetVpcTransitSecretsArn: identityVpcTransitSecretsArn,
      targetVPCCidrRangeSecretsArn: identityVpcCidrRangeSecretsArn
    });
  }
}
const transitRouteStack = new TransitRoutesStack(app,'TransitRoutesStack', {env: envTransit});




export interface VpcRouteTableTransitRouteStackProps extends core.StackProps {
  destinationCidr: string;
  targetVpc: ec2.IVpc;
}
export class VpcRouteTableTransitRouteStack extends core.Stack {
  
  constructor(scope: core.App, id: string, props: VpcRouteTableTransitRouteStackProps) {
    super(scope, id, props);
    
    const transitGatewayIdSecretArn = app.node.tryGetContext("transitGatewaySecretArn");
      
    const transitRoute = new VpcRouteTableTransitRoute(this, `${this.node.id}VpcTransitRouteStack`, {
        destinationCidr: props.destinationCidr,
        targetVpc: props.targetVpc,
        transitGatewayIdSecretArn: transitGatewayIdSecretArn
    })

  }
}

const IdentityToTransitVpcRoute = new VpcRouteTableTransitRouteStack(app,'IdentityToTransitVpcRoute', {
  env: envIdentity,   destinationCidr: envTransit.desiredVpcCidr,   targetVpc: identityAccount.Vpc });
const IdentityToResearchVpcRoute = new VpcRouteTableTransitRouteStack(app,'IdentityToResearchVpcRoute', {
  env: envIdentity,   destinationCidr: envResearch.desiredVpcCidr,   targetVpc: identityAccount.Vpc });
  
const TransitToIdentityVpcRoute = new VpcRouteTableTransitRouteStack(app,'TransitToIdentityVpcRoute', {
  env: envTransit,   destinationCidr: envIdentity.desiredVpcCidr,   targetVpc: transitAccount.vpc });
const TransitToResearchVpcRoute = new VpcRouteTableTransitRouteStack(app,'TransitToResearchVpcRoute', {
  env: envTransit,   destinationCidr: envResearch.desiredVpcCidr,   targetVpc: transitAccount.vpc });

const ResearchToIdentityVpcRoute = new VpcRouteTableTransitRouteStack(app,'ResearchToIdentityVpcRoute', {
  env: envResearch,   destinationCidr: envIdentity.desiredVpcCidr,   targetVpc: researchAccount.Vpc });
const ResearchToTransitVpcRoute = new VpcRouteTableTransitRouteStack(app,'ResearchToTransitVpcRoute', {
  env: envResearch,   destinationCidr: envTransit.desiredVpcCidr,   targetVpc: researchAccount.Vpc });



export interface AdConnectorStackProps extends core.StackProps {
  targetVpc: ec2.IVpc;
}
export class AdConnectorStack extends core.Stack {
  
  public readonly AdConnectorId: string;
  
  constructor(scope: core.App, id: string, props: AdConnectorStackProps) {
    super(scope, id, props);
    
    const identityAccountAdConnectorSecretArn = app.node.tryGetContext("identityAccountAdConnectorSecretArn"); 
    const identityAccountAdConnectorSecretKeyArn = app.node.tryGetContext("identityAccountAdConnectorSecretKeyArn");
    
    const adConnector = new AdConnector(this, 'AdConnector', {
      IdentityAccountAdConnectorSecretArn: identityAccountAdConnectorSecretArn,
      IdentityAccountAdConnectorSecretKeyArn: identityAccountAdConnectorSecretKeyArn,
      connectorVpc: props.targetVpc
    });
    
    
    this.AdConnectorId = adConnector.AdConnectorId;
  }
}
const TransitAdConnectorStack = new AdConnectorStack(app,'TransitAdConnectorStack', {env: envTransit, targetVpc: transitAccount.vpc});
const ResearchAdConnectorStack = new AdConnectorStack(app,'ResearchAdConnectorStack', {env: envResearch, targetVpc: researchAccount.Vpc});



export class TransitVpnStack extends core.Stack {
  
  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);
    
    const identityAccountAdConnectorSecretArn = app.node.tryGetContext("identityAccountAdConnectorSecretArn"); 
    const identityAccountAdConnectorSecretKeyArn = app.node.tryGetContext("identityAccountAdConnectorSecretKeyArn");
    
    const transitVpn = new TransitVpn(this, 'TransitVpn', {
        AdConnectorId: TransitAdConnectorStack.AdConnectorId,
        transitVpc: transitAccount.vpc,
        vpnClientAssignedAddrCidr: vpnClientAssignedAddrCidr,
        domainApex: corporateDnsApex,
        ResearchVpcCidr: envResearch.desiredVpcCidr,
        TransitVpcCidr: envTransit.desiredVpcCidr,
        IdentityVpcCidr: envIdentity.desiredVpcCidr,
        IdentityAccountAdConnectorSecretArn: identityAccountAdConnectorSecretArn,
        IdentityAccountAdConnectorSecretKeyArn: identityAccountAdConnectorSecretKeyArn
    });
  }
}
const TransitVpnEndpointStack = new TransitVpnStack(app,'TransitVpnStack', {env: envTransit});



