import core = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import ds = require("@aws-cdk/aws-directoryservice");
import sm = require("@aws-cdk/aws-secretsmanager");
import ssm = require('@aws-cdk/aws-ssm');
import kms = require("@aws-cdk/aws-kms");
import ram = require("@aws-cdk/aws-ram");
import iam = require("@aws-cdk/aws-iam");
import fs = require('fs');

//import tg = require("@aws-cdk/aws-ec2.CfnIdentityGatewayAttachment);


export interface IdentityCoreProps extends core.StackProps {
  orgId: string;
  corporateDnsApex: string;
  netBiosName: string;
  integrationSecretsArn: string;
  desiredVpcCidr: string;
  vpnTransitAccessCIDR: string;
}

export class IdentityCore extends core.Construct {
    
  public readonly key: kms.Key;
  public readonly identitySecretsArn: string;
  public readonly Vpc: ec2.Vpc;
  
  constructor(scope: core.Construct, id: string, props: IdentityCoreProps) {
    super(scope, id);
    
    const orgName = core.Arn.parse(props.orgId).resourceName!;
    
    const identityVPC = new ec2.Vpc(this, 'IdentityVPC', {
          cidr: props.desiredVpcCidr,
          subnetConfiguration: [ 
           {
             cidrMask: 20,
             name: 'Public',
             subnetType: ec2.SubnetType.PUBLIC,
           }, 
           {
             cidrMask: 20,
             name: 'Private',
             subnetType: ec2.SubnetType.PRIVATE,
           }
        ]
    });
    
    this.Vpc = identityVPC;
    
    const privateSubnetSelection = { subnetType: ec2.SubnetType.PRIVATE };
    const publicSubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };
    const privateSubnets = identityVPC.selectSubnets(privateSubnetSelection).subnetIds;
    
    
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
     
    const kmsPolicyDoc = new iam.PolicyDocument({statements: [secretsManagerPolicy,allowRootManagment, allowOuAccessTotransitSecretsKey]})
  
    const identitySecretsKey = new kms.Key(this, "IdentitySecretsKey", {
        description: "Biotech Blueprint Identity Secrets Key", 
        enableKeyRotation: false, 
        enabled: true,
        policy: kmsPolicyDoc
    });
    
    this.key = identitySecretsKey;
    
    var identitySecret = new sm.Secret(this , "identitySecretKey", { 
        secretName: "ADAdminCreds",
        generateSecretString : {
            secretStringTemplate: JSON.stringify({ "username": "Admin" }),
            generateStringKey: "password"
        }, 
        description: "Root Admin AD Credentials", 
        encryptionKey: identitySecretsKey
    });
    
    this.identitySecretsArn = identitySecret.secretArn;
    
    
    const activeDirectory = new ds.CfnMicrosoftAD(this, 'IdentityAD', {
        edition : "Standard",
        enableSso : true,
        name : props.corporateDnsApex,
        password : core.Token.asString(identitySecret.secretValueFromJson('password')),
        shortName : props.netBiosName,
        vpcSettings : {
          subnetIds : privateSubnets,
          vpcId : identityVPC.vpcId
        },
        createAlias: true
    });
    
    
    
    
    
    const transitGatewayIDSecretValue = sm.Secret.fromSecretArn(scope, 'ImportedSecret', props.integrationSecretsArn).secretValue;
    
    const transitGatewayAttachment = new ec2.CfnTransitGatewayAttachment(this, 'tgAttachment', { 
        subnetIds: privateSubnets,
        transitGatewayId: core.Token.asString(transitGatewayIDSecretValue), 
        vpcId: identityVPC.vpcId,
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
        encryptionKey: identitySecretsKey
    });
    
    
    const vpcCidrSecret = new sm.Secret(this , "transitGatewayVpcCidrSecret", { 
        secretName: "vc",
        generateSecretString : {
            secretStringTemplate: JSON.stringify( { 
                    VpcCidr: identityVPC.vpcCidrBlock
                }),
            generateStringKey: "password"
        }, 
        description: "VPC CIDR To Associate with Identity Stack", 
        encryptionKey: identitySecretsKey
    });
    
    
    const domainControllerSecrets = new sm.Secret(this , "DomainControllerSercretsForAdConnector", { 
        secretName: "IdentityAccountDomainControllerSecretsForAdConnectors",
        generateSecretString : {
            secretStringTemplate: core.Stack.of(this).toJsonString({ 
                    DomainControllerDnsAddress0: core.Fn.select(0,activeDirectory.attrDnsIpAddresses),
                    DomainControllerDnsAddress1: core.Fn.select(1,activeDirectory.attrDnsIpAddresses),
                    DomainControlerAlias: activeDirectory.attrAlias,                
                    DomainControllerShortName: activeDirectory.shortName,
                    DomainApex: activeDirectory.name,
                    AdConnectorServiceAccountUsername: "svc_adconnector",
                    AdConnectorSecretsKeyArn: identitySecretsKey.keyArn,
                    VpnUsersAdGroupSID: "undefined"
                }),
            generateStringKey: "password"
        }, 
        description: "Secrets for AD Connectors to join domain in identity account.", 
        encryptionKey: identitySecretsKey
    });
    
    
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
    new sm.CfnResourcePolicy(this, "DomainControllerSharePolicy", {secretId: domainControllerSecrets.secretArn, resourcePolicy: ouWideResourcePolicy});
    
    
    const latestWindowsAmi = ssm.StringParameter.fromStringParameterAttributes(this, 'WindowsAmiParam', {
        parameterName: '/aws/service/ami-windows-latest/Windows_Server-2016-English-Full-Base',
    });
    
    
    const DomainControllerAdminConsoleRole = new iam.Role(this, 'DomainControllerAdminConsoleRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });
    DomainControllerAdminConsoleRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    DomainControllerAdminConsoleRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMDirectoryServiceAccess'));
    
    DomainControllerAdminConsoleRole.addToPolicy(new iam.PolicyStatement({
      resources: [identitySecret.secretArn],
      actions: ['secretsmanager:GetSecretValue',"secretsmanager:PutSecretValue"] 
    }));
    
    DomainControllerAdminConsoleRole.addToPolicy(new iam.PolicyStatement({
      resources: [identitySecretsKey.keyArn],
      actions: ['kms:Decrypt', 'kms:GenerateDataKey'] 
    }));
    
    
    // TODO: Change subnets to private so this host is only accessible via VPN
    const domainControllerConsoleInstance = new ec2.Instance(this, 'DCAdminConsole', {
        machineImage: new ec2.WindowsImage(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE),
        instanceType: new ec2.InstanceType('t3.small'),
        vpc: identityVPC,
        vpcSubnets: privateSubnetSelection,
        role: DomainControllerAdminConsoleRole,
        instanceName: "Domain Controller Console"
    });
    
    const rdpSecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: identityVPC,
      description: 'Domain Controller Console Security Group',
      allowAllOutbound: true   // Can be set to false
    });
    rdpSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.vpnTransitAccessCIDR), ec2.Port.tcp(3389), 'RDP Access');
    domainControllerConsoleInstance.addSecurityGroup(rdpSecurityGroup);
    
    const prepDomainControllerForAdConnectorsDoc = new ssm.CfnDocument(this, 'prepDomainSsmDoc', {
        content: JSON.parse(fs.readFileSync('scripts/ssmdoc.PrepDomainController.json', { encoding: 'utf-8' })),
        documentType: "Command"
    });

    const joinDomainAssociation = new ssm.CfnAssociation(this, 'joinDomainAssociation',{
        name: prepDomainControllerForAdConnectorsDoc.ref,
        targets: [
            { key: "InstanceIds", values: [domainControllerConsoleInstance.instanceId] }
        ]
    });
    
    joinDomainAssociation.addPropertyOverride('Parameters',{
        directoryId: [activeDirectory.ref],
        directoryName: [props.corporateDnsApex],
        dnsIpAddress0: [core.Fn.select(0,activeDirectory.attrDnsIpAddresses)],
        dnsIpAddress1: [core.Fn.select(1,activeDirectory.attrDnsIpAddresses)]
    });
    
    
    
    

  }
}