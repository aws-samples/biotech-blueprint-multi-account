import core = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import sm = require('@aws-cdk/aws-secretsmanager');
import kms = require('@aws-cdk/aws-kms');
//import tg = require('@aws-cdk/aws-ec2.CfnTransitGatewayAttachment);


export interface BbCoreProps extends core.StackProps {
  orgId: string;
  integrationSecretsArn: string;
  desiredVpcCidr?: string; 
  desiredVpcName?: string;
  existingVpcId?: string;
}

export class BBChildAccountCore extends core.Construct {
    
  public readonly transitGatewayAttachment: ec2.CfnTransitGatewayAttachment;
  public readonly Vpc: ec2.IVpc;
  public readonly VpcCidrRange: string;
  public readonly tranistSecretsArn: string;
    
  constructor(scope: core.Construct, id: string, props: BbCoreProps) {
    super(scope, id);
    
    const orgName = core.Arn.parse(props.orgId).resourceName!;
    
    if(props.desiredVpcCidr && props.desiredVpcName){
        this.Vpc = new ec2.Vpc(this, props.desiredVpcName, {
              cidr: props.desiredVpcCidr,
              subnetConfiguration: [
               {
                 cidrMask: 20,
                 name: 'dmz',
                 subnetType: ec2.SubnetType.PUBLIC,
               },
               {
                 cidrMask: 20,
                 name: 'application',
                 subnetType: ec2.SubnetType.PRIVATE,
               },
               {
                 cidrMask: 20,
                 name: 'database',
                 subnetType: ec2.SubnetType.ISOLATED,
               }, 
            ]
        });
        
        this.VpcCidrRange = this.Vpc.vpcCidrBlock;
    } else{
        if(props.existingVpcId){
            this.Vpc = ec2.Vpc.fromLookup(this, 'importedVpcName', {
               vpcId: props.existingVpcId
            });
            
            this.VpcCidrRange = this.Vpc.vpcCidrBlock;
        }
    }
    
    
    
    const dmzSubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };
    const appSubnetSelection = { subnetType: ec2.SubnetType.PRIVATE };
    const dbSubnetSelection = { subnetType: ec2.SubnetType.ISOLATED };
   
    if(this.Vpc instanceof ec2.Vpc){
        this.Vpc.addS3Endpoint('s3Endpoint', [dmzSubnetSelection,appSubnetSelection,dbSubnetSelection  ] );    
    }
    
    const appSubnets = this.Vpc.selectSubnets({ 
        subnetType: ec2.SubnetType.PRIVATE,
        onePerAz: true
    });
 
    // Due to a bug in cloudformation validation for parameter length, we have to hack around this a little. When the bug is fixed, we will use the fromJsonline below instead of secretValue
    //const transitGatewayIDSecretValue = sm.Secret.fromSecretArn(scope, 'ImportedSecret', props.integrationSecretsArn).secretValueFromJson('TransitGatewayID');
    
    const transitGatewayIDSecretValue = sm.Secret.fromSecretArn(scope, 'ImportedSecret', props.integrationSecretsArn).secretValue;
    
    
    
    const transitGatewayAttachment = new ec2.CfnTransitGatewayAttachment(this, 'tgAttachment', { 
        subnetIds: appSubnets.subnetIds,
        transitGatewayId: core.Token.asString(transitGatewayIDSecretValue), 
        vpcId: this.Vpc.vpcId
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
        description: "Biotech Blueprint Transit Secrets Key", 
        enableKeyRotation: false, 
        enabled: true,
        policy: kmsPolicyDoc
    });
    

    
    
    const transitSecret = new sm.Secret(this , "transitGatewayAttachmentSecret", { 
        secretName: "ga",
        generateSecretString : {
            secretStringTemplate: JSON.stringify( { 
                    GatewayAttachment: transitGatewayAttachment.ref,
                }),
            generateStringKey: "password"
        }, 
        description: "Transit Gateway Attachment ID", 
        encryptionKey: transitSecretsKey
    });
    
    
    const vpcCidrSecret = new sm.Secret(this , "transitGatewayVpcCidrSecret", { 
        secretName: "vc",
        generateSecretString : {
            secretStringTemplate: JSON.stringify( { 
                    VpcCidr: this.Vpc.vpcCidrBlock
                }),
            generateStringKey: "password"
        }, 
        description: "VPC CIDR To Associate with Transit Stack", 
        encryptionKey: transitSecretsKey
    });
    
    this.tranistSecretsArn = transitSecret.secretArn;
    
    const ouWideResourcePolicy = {
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
    
    new sm.CfnResourcePolicy(this, "transitGtwyAttachmentSharePolicy", {secretId: transitSecret.secretArn, resourcePolicy: ouWideResourcePolicy});
    new sm.CfnResourcePolicy(this, "transitGtwyVpcCidrSharePolicy", {secretId: vpcCidrSecret.secretArn, resourcePolicy: ouWideResourcePolicy});
    
    
  }
}

