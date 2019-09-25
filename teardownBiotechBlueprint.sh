cdk destroy ResearchAdConnectorStack --profile research
cdk destroy TransitAdConnectorStack TransitVpnStack --profile transit


cdk destroy ResearchToIdentityVpcRoute ResearchToTransitVpcRoute --profile research 
cdk destroy TransitToIdentityVpcRoute TransitToResearchVpcRoute --profile transit 
cdk destroy IdentityToResearchVpcRoute IdentityToTransitVpcRoute --profile master 
cdk destroy TransitRoutesStack --profile transit
cdk destroy IdentityAccountStack --profile master
cdk destroy ResearchAccountStack --profile research
cdk destroy TransitAccountStack --profile transit
