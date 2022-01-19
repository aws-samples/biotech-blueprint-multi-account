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


export interface AdConnectorProps extends core.StackProps {
  IdentityAccountAdConnectorSecretArn: string;
  IdentityAccountAdConnectorSecretKeyArn: string;
  connectorVpc: ec2.IVpc;
}

export class AdConnector extends core.Construct {
  
  public readonly AdConnectorId: string;

  constructor(scope: core.Construct, id: string, props: AdConnectorProps) {
    super(scope, id);

    const role = new iam.Role(this, 'AdConnectorLambdaCustomResourceRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });

    role.addToPolicy(new iam.PolicyStatement({
      resources: [`${props.IdentityAccountAdConnectorSecretArn}-??????`],
      actions: ['secretsmanager:GetSecretValue'] 
    }));
    role.addToPolicy(new iam.PolicyStatement({
      resources: [props.IdentityAccountAdConnectorSecretKeyArn],
      actions: ['kms:Decrypt'] 
    }));
    role.addToPolicy(new iam.PolicyStatement({
      resources: ["*"],
      actions: ['ds:ConnectDirectory', 'ds:DeleteDirectory'] 
    }));
    role.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['ec2:DescribeSubnets','ec2:DescribeVpcs','ec2:CreateSecurityGroup',
                'ec2:CreateNetworkInterface','ec2:DescribeNetworkInterfaces','ec2:AuthorizeSecurityGroupIngress',
                'ec2:AuthorizeSecurityGroupEgress','ec2:CreateTags'] 
    }));
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    

    const privateSubnetSelection = { subnetType: ec2.SubnetType.PRIVATE };
    const privateSubnets = props.connectorVpc.selectSubnets(privateSubnetSelection).subnetIds;
    
    const resource = new cfn.CustomResource(this, 'adConnector', {
        provider: cfn.CustomResourceProvider.lambda(new lambda.SingletonFunction(this, 'Singleton', {
            role: role, 
            uuid: "adConnectorLambda",
            code: new lambda.InlineCode(fs.readFileSync('scripts/ad-connector-resource-handler.py', { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: core.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_7,
        })),
        properties: {
            IdentityAccountAdConnectorSecretArn: props.IdentityAccountAdConnectorSecretArn,
            Description: "AD Connector to Identity", 
            Size: "Small", 
            VpcId: props.connectorVpc.vpcId,
            SubnetIds: privateSubnets
        }
    });

    this.AdConnectorId = resource.ref;
    
    
  }
}