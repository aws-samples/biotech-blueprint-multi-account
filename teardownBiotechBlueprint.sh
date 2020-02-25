
cdk destroy TransitVpnStack --force --profile transit
cdk destroy ResearchAdConnectorStack --force --profile research
cdk destroy TransitAdConnectorStack TransitVpnStack --force --profile transit


cdk destroy ResearchToIdentityVpcRoute ResearchToTransitVpcRoute --force --profile research 
cdk destroy TransitToIdentityVpcRoute TransitToResearchVpcRoute --force --profile transit 
cdk destroy IdentityToResearchVpcRoute IdentityToTransitVpcRoute --force --profile master 
cdk destroy TransitRoutesStack --force --profile transit
cdk destroy IdentityAccountStack --force --profile master
cdk destroy ResearchAccountStack --force --profile research
cdk destroy TransitAccountStack --force --profile transit
