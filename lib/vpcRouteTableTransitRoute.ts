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

export interface VpcRouteTableTransitRouteProps extends core.StackProps {
  targetVpc: ec2.IVpc;
  transitGatewayIdSecretArn: string;
  destinationCidr: string;
}

export interface IRouteTableHash {
    [routeTableId: string] : string;
} 

export class VpcRouteTableTransitRoute extends core.Construct {
  
  private routeTableHash: IRouteTableHash = {};

  constructor(scope: core.Construct, id: string, props: VpcRouteTableTransitRouteProps) {
    super(scope, id);
    
    const transitGatewayIDSecretValue = sm.Secret.fromSecretArn(scope, 'ImportedSecret', props.transitGatewayIdSecretArn).secretValue;

    const privateSubnetSelection = { subnetType: ec2.SubnetType.PRIVATE };
    //const isolatedSubnetSelection = { subnetType: ec2.SubnetType.ISOLATED };
    const publicSubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };
    const privateSubnets = props.targetVpc.selectSubnets(privateSubnetSelection);
    //const isolatedSubnets = props.targetVpc.selectSubnets(isolatedSubnetSelection);
    const publicSubnets = props.targetVpc.selectSubnets(publicSubnetSelection);
    
    this.populateRouteTableHash(privateSubnets);
    //this.populateRouteTableHash(isolatedSubnets);
    this.populateRouteTableHash(publicSubnets);
    
    var routeCounter = 0;
    for (let routeTableId in this.routeTableHash){
      const route = new ec2.CfnRoute(this, `${routeCounter}TransitGatewayRouteForRouteTable`, {
        routeTableId: routeTableId,
        destinationCidrBlock: props.destinationCidr,
        transitGatewayId: core.Token.asString(transitGatewayIDSecretValue)
      });
      routeCounter++;
    }
    
  }
  
  populateRouteTableHash (subnetCollection: ec2.SelectedSubnets) {
    
    
    for (let subnet of subnetCollection.subnets) {
        if (subnet.routeTable.routeTableId in this.routeTableHash == false)  {
            this.routeTableHash[subnet.routeTable.routeTableId] = subnet.subnetId;
        }
    } 
      
  }
  
  
}