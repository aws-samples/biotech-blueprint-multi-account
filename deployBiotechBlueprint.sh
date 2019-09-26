
npm run build 

orgArn="$(aws organizations describe-organization --profile master --query "Organization.Arn" --output text)"
masterAcctId="$(aws sts get-caller-identity --profile master --query "Account" --output text)"
transitAcctId="$(aws sts get-caller-identity --profile transit --query "Account" --output text)"
researchAcctId="$(aws sts get-caller-identity --profile research --query "Account" --output text)"

jq '.context.orgArn = $orgArn' --arg orgArn $orgArn cdk.json > tmp.$$.json && mv tmp.$$.json cdk.json
jq '.context.envMasterAccountId = $accountID' --arg accountID $masterAcctId cdk.json > tmp.$$.json && mv tmp.$$.json cdk.json
jq '.context.envTransitAccountId = $accountID' --arg accountID $transitAcctId cdk.json > tmp.$$.json && mv tmp.$$.json cdk.json
jq '.context.envResearchAccountId = $accountID' --arg accountID $researchAcctId cdk.json > tmp.$$.json && mv tmp.$$.json cdk.json


cdk deploy TransitAccountStack --profile transit
transitGatewayID="$(aws secretsmanager get-secret-value --secret-id tx --profile transit | grep -Po 'tgw-.{17}')"
aws secretsmanager put-secret-value --secret-id tx --secret-string $transitGatewayID --profile transit
transitGatewayRouteTableID="$(aws secretsmanager get-secret-value --secret-id rt --profile transit | grep -Po 'tgw-.{21}')"
aws secretsmanager put-secret-value --secret-id rt --secret-string $transitGatewayRouteTableID --profile transit
transitGatewayIdSecretArn="$(aws secretsmanager get-secret-value --secret-id tx --profile transit | grep -Po 'arn:aws:secretsmanager.*tx')"
transitGatewayRouteTableSecretArn="$(aws secretsmanager get-secret-value --secret-id rt --profile transit | grep -Po 'arn:aws:secretsmanager.*rt')"


cdk deploy ResearchAccountStack --context transitGatewaySecretArn=$transitGatewayIdSecretArn --profile research
researchGatewayAttachment="$(aws secretsmanager get-secret-value --secret-id ga --profile research | grep -Po 'tgw-attach-.{17}')"
aws secretsmanager put-secret-value --secret-id ga --secret-string $researchGatewayAttachment --profile research
researchTgAttachmentSecretArn="$(aws secretsmanager get-secret-value --secret-id ga --profile research | grep -Po 'arn:aws:secretsmanager.*ga')"
researchVpcCidr="$(aws secretsmanager get-secret-value --secret-id vc --profile research | grep -Po '[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/..')"
aws secretsmanager put-secret-value --secret-id vc --secret-string $researchVpcCidr --profile research
researchVpcCidrSecretArn="$(aws secretsmanager get-secret-value --secret-id vc --profile research | grep -Po 'arn:aws:secretsmanager.*vc')"


cdk deploy IdentityAccountStack --context transitGatewaySecretArn=$transitGatewayIdSecretArn --profile master
identityAccountAdConnectorSecretArn="$(aws secretsmanager get-secret-value --secret-id IdentityAccountDomainControllerSecretsForAdConnectors --profile master | grep -Po 'arn:aws:secretsmanager.*IdentityAccountDomainControllerSecretsForAdConnectors')"
identityAccountAdConnectorSecretKeyArn="$(aws secretsmanager get-secret-value --secret-id IdentityAccountDomainControllerSecretsForAdConnectors --profile master | grep -Po 'arn:aws:kms:.*key\/.{36}')"
identityGatewayAttachment="$(aws secretsmanager get-secret-value --secret-id ga --profile master | grep -Po 'tgw-attach-.{17}')"
aws secretsmanager put-secret-value --secret-id ga --secret-string $identityGatewayAttachment --profile master
identityTgAttachmentSecretArn="$(aws secretsmanager get-secret-value --secret-id ga --profile master | grep -Po 'arn:aws:secretsmanager.*ga')"
identityVpcCidr="$(aws secretsmanager get-secret-value --secret-id vc --profile master | grep -Po '[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/..')"
aws secretsmanager put-secret-value --secret-id vc --secret-string $identityVpcCidr --profile master
identityVpcCidrSecretArn="$(aws secretsmanager get-secret-value --secret-id vc --profile master | grep -Po 'arn:aws:secretsmanager.*vc')"

cdk deploy TransitRoutesStack \
    --context transitGatewayRouteTableSecretArn=$transitGatewayRouteTableSecretArn \
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \
    --context researchTgAttachmentSecretArn=$researchTgAttachmentSecretArn \
    --context researchVpcCidrSecretArn=$researchVpcCidrSecretArn \
    --context identityTgAttachmentSecretArn=$identityTgAttachmentSecretArn \
    --context identityVpcCidrSecretArn=$identityVpcCidrSecretArn \
    --profile transit
    


cdk deploy IdentityToResearchVpcRoute IdentityToTransitVpcRoute \
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \
    --profile master 
cdk deploy TransitToIdentityVpcRoute TransitToResearchVpcRoute \
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \
    --profile transit 
cdk deploy ResearchToIdentityVpcRoute ResearchToTransitVpcRoute \
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \
    --profile research 

#We have to wait for active directory to become actually servicable. 
sleep 3m
    
cdk deploy TransitAdConnectorStack TransitVpnStack \
    --context identityAccountAdConnectorSecretArn=$identityAccountAdConnectorSecretArn \
    --context identityAccountAdConnectorSecretKeyArn=$identityAccountAdConnectorSecretKeyArn \
    --profile transit
 
cdk deploy ResearchAdConnectorStack \
    --context identityAccountAdConnectorSecretArn=$identityAccountAdConnectorSecretArn \
    --context identityAccountAdConnectorSecretKeyArn=$identityAccountAdConnectorSecretKeyArn \
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \
    --profile research
    
clientVpnEndpointId="$(aws ec2 describe-client-vpn-endpoints --profile transit --query "ClientVpnEndpoints[0].ClientVpnEndpointId" --output text)"
    
aws ec2 export-client-vpn-client-configuration --client-vpn-endpoint-id $clientVpnEndpointId --profile transit --output text > ~/environment/TransitVpn.ovpn