import core = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import sm = require("@aws-cdk/aws-secretsmanager");

import kms = require("@aws-cdk/aws-kms");
import ram = require("@aws-cdk/aws-ram");
import iam = require("@aws-cdk/aws-iam");

//import tg = require("@aws-cdk/aws-ec2.CfnTransitGatewayAttachment);


export interface TransitRouteProps extends core.StackProps {
  orgId: string;
  targetVpcTransitSecretsArn: string;
  transitVPCRouteTableSecretsArn: string;
  targetVPCCidrRangeSecretsArn: string;
}

export class TransitRoute extends core.Construct {
  
  constructor(scope: core.Construct, id: string, props: TransitRouteProps) {
    super(scope, id);
    
    
    
    const transitGatewayRoutTableSecretValue = sm.Secret.fromSecretArn(scope, `${this.node.id}transitGatewayRouteTableSecretValue`, props.transitVPCRouteTableSecretsArn).secretValue;
    const targetVpcGatewayAttachmentSecretValue = sm.Secret.fromSecretArn(scope, `${this.node.id}targetVpcGatewayAttachmentSecretValue`, props.targetVpcTransitSecretsArn).secretValue;
    const targetCidrRangeSecretValue = sm.Secret.fromSecretArn(scope, `${this.node.id}targetVpcCiderRangeSecretValue`, props.targetVPCCidrRangeSecretsArn).secretValue;
    
    
    const transitVpcRouteTableAssociation = new ec2.CfnTransitGatewayRouteTableAssociation(scope, `${this.node.id}TransitVPCRouteTableAssociation`, {
      transitGatewayAttachmentId: core.Token.asString(targetVpcGatewayAttachmentSecretValue),
      transitGatewayRouteTableId: core.Token.asString(transitGatewayRoutTableSecretValue)
    });
    
    
    const transitVpcRouteTablePropigation = new ec2.CfnTransitGatewayRouteTablePropagation(scope, `${this.node.id}TransitVPCRouteTablePropagation`, {
      transitGatewayAttachmentId: core.Token.asString(targetVpcGatewayAttachmentSecretValue),
      transitGatewayRouteTableId: core.Token.asString(transitGatewayRoutTableSecretValue),
    });
    
    const transitVpcRoute = new ec2.CfnTransitGatewayRoute(scope, `${this.node.id}TransitVPCRoute`, {
      destinationCidrBlock: core.Token.asString(targetCidrRangeSecretValue),
      transitGatewayAttachmentId: core.Token.asString(targetVpcGatewayAttachmentSecretValue),
      transitGatewayRouteTableId: core.Token.asString( transitGatewayRoutTableSecretValue)
    });
        
  
    
  }
}