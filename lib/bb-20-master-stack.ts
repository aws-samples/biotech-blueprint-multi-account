import core = require('@aws-cdk/core');
import kms = require('@aws-cdk/aws-kms');
import sm = require('@aws-cdk/aws-secretsmanager');
import iam = require('@aws-cdk/aws-iam');

//import tg = require('@aws-cdk/aws-ec2.CfnTransitGatewayAttachment);


export interface BbCoreProps extends core.StackProps {
  orgId: string;
}

export class BBMasterIntegrationConstruct extends core.Construct {

  public readonly orgID: string;
  constructor(scope: core.Construct, id: string, props: BbCoreProps) {
    super(scope, id);
    
    this.orgID = props.orgId;
    
  }

}


