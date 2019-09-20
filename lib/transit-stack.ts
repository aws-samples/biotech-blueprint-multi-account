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

//import tg = require("@aws-cdk/aws-ec2.CfnTransitGatewayAttachment);


export interface TransitCoreProps extends core.StackProps {
  orgId: string;
  masterAccountId: string;
  desiredVpcCidr: string;
}

export class TransitAccountCore extends core.Construct {
  
  public readonly key: kms.Key;
  public readonly transitSecretsArn: string;
  public readonly transitGateway: ec2.CfnTransitGateway; 
  public readonly transitGatewayRouteTableSecretsArn: string;
  public readonly Vpc: ec2.Vpc;
  
  constructor(scope: core.Construct, id: string, props: TransitCoreProps) {
    super(scope, id);
    
    const orgName = core.Arn.parse(props.orgId).resourceName!;

    var transitVPC = new ec2.Vpc(this, "TransitVPC", {
          cidr: props.desiredVpcCidr,
          subnetConfiguration: [
           {
             cidrMask: 20,
             name: "dmz",
             subnetType: ec2.SubnetType.PUBLIC,
           },
           {
             cidrMask: 20,
             name: "application",
             subnetType: ec2.SubnetType.PRIVATE,
           },
           {
             cidrMask: 20,
             name: "database",
             subnetType: ec2.SubnetType.ISOLATED,
           }, 
        ]
    });
    
    this.Vpc = transitVPC;
    
    const dmzSubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };
    const appSubnetSelection = { subnetType: ec2.SubnetType.PRIVATE };
    const dbSubnetSelection = { subnetType: ec2.SubnetType.ISOLATED };
   
    transitVPC.addS3Endpoint("s3Endpoint", [dmzSubnetSelection,appSubnetSelection,dbSubnetSelection  ] );
    
    const allSubnets = transitVPC.selectSubnets()
 
 
    const transitGateway = new ec2.CfnTransitGateway(this, "transitGateway", {
        autoAcceptSharedAttachments: "enable", 
        dnsSupport: "enable",
        vpnEcmpSupport: "enable",
        defaultRouteTableAssociation: "disable",
        defaultRouteTablePropagation: "disable"
    });
 
    this.transitGateway = transitGateway;
    
    // const secret = sm.Secret.fromSecretAttributes(this, "transitGatewaySecret", { 
    //     secretArn: props.transitSecretsArn, 
    //     encryptionKey: props.transitSecretsEncryptionKey
    // });
    // const transitGatewayIdValue = secret.secretValue.toString();
    //const transitGatewaySe = secret.secretValueFromJson("TransitGatewayID").toString();
    
    var transitGatewayAttachment = new ec2.CfnTransitGatewayAttachment(this, "tgAttachment", { 
        subnetIds: allSubnets.subnetIds,
        transitGatewayId: transitGateway.ref, 
        vpcId: transitVPC.vpcId
    });
    
    
    const sharedServicesRouteTable = new ec2.CfnTransitGatewayRouteTable(scope, 'SharedServicesRouteTable', {
        transitGatewayId: transitGateway.ref
    });
    
    
    const transitVpcRouteTableAssociation = new ec2.CfnTransitGatewayRouteTableAssociation(scope, 'TransitVPCRouteTableAssociation', {
        transitGatewayAttachmentId: transitGatewayAttachment.ref,
        transitGatewayRouteTableId: sharedServicesRouteTable.ref
    });
    
    const transitVpcRouteTablePropigation = new ec2.CfnTransitGatewayRouteTablePropagation(scope, 'TransitVPCRouteTablePropagation', {
        transitGatewayAttachmentId: transitGatewayAttachment.ref,
        transitGatewayRouteTableId: sharedServicesRouteTable.ref
    });
    
    const transitVpcRoute = new ec2.CfnTransitGatewayRoute(scope, 'TransitVPCRoute', {
        destinationCidrBlock: transitVPC.vpcCidrBlock,
        transitGatewayAttachmentId: transitGatewayAttachment.ref,
        transitGatewayRouteTableId: sharedServicesRouteTable.ref
    });
    
    
    
    const secretsManagerPolicy = new iam.PolicyStatement({
        actions: ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:CreateGrant", "kms:DescribeKey"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        principals: [new iam.ServicePrincipal("secretsmanager.amazonaws.com")]
    });    
    const allowRootManagment = new iam.PolicyStatement({
        actions: ["kms:*"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        principals: [new iam.AccountRootPrincipal()]
    });
    
    const allowOuAccessTotransitSecretsKey = new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        principals: [new iam.OrganizationPrincipal(orgName)]
    });  
    
    const kmsPolicyDoc = new iam.PolicyDocument({statements: [secretsManagerPolicy,allowRootManagment,allowOuAccessTotransitSecretsKey]})
  
    const transitSecretsKey = new kms.Key(this, "transitSecretsKey", {
        description: "Biotech Blueprint transit Secrets Key", 
        enableKeyRotation: false, 
        enabled: true,
        policy: kmsPolicyDoc
    });
    
    this.key = transitSecretsKey;
    
    
    
    var transitSecret = new sm.Secret(this , "transitSecretKey", { 
        secretName: "tx",
        generateSecretString : {
            secretStringTemplate: JSON.stringify({ TransitGatewayID: transitGateway.ref }),
            generateStringKey: "password"
        }, 
        description: "Transit Gateway ID for Biotech Blueprint Infrastructure", 
        encryptionKey: transitSecretsKey
    });
    
    var transitRouteTableSecret = new sm.Secret(this , "transitRouteTableSecretKey", { 
        secretName: "rt",
        generateSecretString : {
            secretStringTemplate: JSON.stringify({ TransitRouteTableId: sharedServicesRouteTable.ref }),
            generateStringKey: "password"
        }, 
        description: "Shared Services Transit Gateway Route Table ID for Biotech Blueprint Infrastructure", 
        encryptionKey: transitSecretsKey
    });

    this.transitSecretsArn = transitSecret.secretArn;
    this.transitGatewayRouteTableSecretsArn = transitRouteTableSecret.secretArn;

    var ouWideResourcePolicy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "secretsmanager:*",
                "Principal": "*",
                "Resource": "*",
                "Condition": {
                    "StringEquals": {
                        "aws:PrincipalOrgID": orgName
                    }
                }
                
            }
        ]
    }
    
    new sm.CfnResourcePolicy(this, "transitSecretsSharePolicy", {secretId: transitSecret.secretArn, resourcePolicy: ouWideResourcePolicy})
    new sm.CfnResourcePolicy(this, "transitSecretsRouteTableSharePolicy", {secretId: transitRouteTableSecret.secretArn, resourcePolicy: ouWideResourcePolicy})
    
    
    //arn:aws:ec2:us-east-2:111122223333:transit-gateway/tgw-0262a0e521EXAMPLE
    var transitGatewayArn = `arn:aws:ec2:${core.Stack.of(this).region}:${core.Stack.of(this).account}:transit-gateway/${transitGateway.ref}`;
        
    new ram.CfnResourceShare(this,"transitGatewayRamShare", {
        allowExternalPrincipals: true,
        name: "TransitGatewayShare",
        principals: [props.orgId],
        resourceArns: [transitGatewayArn]
    });
    


  }
}

