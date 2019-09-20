import boto3
import json
from botocore.exceptions import ClientError
import logging as log
import cfnresponse
client = boto3.client('ds')
smClient = boto3.client('secretsmanager')


def main(event, context):

    log.getLogger().setLevel(log.INFO)

    # This needs to change if there are to be multiple resources in the same stack
    physical_id = 'AdConnector'
    responseData = {}
    
    

    try:
        log.info('Input event: %s', event)

        if event['RequestType'] == 'Delete':
            responseData['Complete'] = "True"
            adConnectorID = event['PhysicalResourceId']
            client.delete_directory(DirectoryId=adConnectorID)
            cfnresponse.send(event, context, cfnresponse.SUCCESS, responseData, adConnectorID)

        # Check if this is a Create and we're failing Creates
        if event['RequestType'] == 'Create':

            IdentityAccountAdConnectorSecretArn = event['ResourceProperties']['IdentityAccountAdConnectorSecretArn']
            
            try:
                get_secret_value_response = smClient.get_secret_value(
                    SecretId=IdentityAccountAdConnectorSecretArn
                )
            except ClientError as e:
                raise e
            else:
                
                
                if 'SecretString' in get_secret_value_response:
                    secret = get_secret_value_response['SecretString']
                    log.info('PAULS')
                    log.info(secret)
                    secretDict = json.loads(secret)
                    
                    name = secretDict['DomainApex']
                    short_name = secretDict['DomainControllerShortName']
                    password = secretDict['password']
                    customerDnsIps0 = secretDict['DomainControllerDnsAddress0']
                    customerDnsIps1 = secretDict['DomainControllerDnsAddress1']
                    customerUserName = secretDict['AdConnectorServiceAccountUsername']
                    
                    description = event['ResourceProperties']['Description']
                    size = event['ResourceProperties']['Size']
                    vpcId = event['ResourceProperties']['VpcId']
                    subnetIds = event['ResourceProperties']['SubnetIds']
                       
                    response = client.connect_directory(
                        Name=name,
                        ShortName=short_name,
                        Password=password,
                        Description=description,
                        Size=size,
                        ConnectSettings={
                            'VpcId': vpcId,
                            'SubnetIds': subnetIds ,
                            'CustomerDnsIps': [customerDnsIps0, customerDnsIps1],
                            'CustomerUserName': customerUserName
                        }
                    )
                    responseData['reponse'] = response
                    connectorId = responseData['reponse']['DirectoryId']
                    log.info(responseData['reponse']['DirectoryId'])
                    
                    cfnresponse.send(event, context, cfnresponse.SUCCESS, responseData, connectorId)

    except Exception as e:
        log.exception(e)
        # cfnresponse's error message is always "see CloudWatch"
        cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)