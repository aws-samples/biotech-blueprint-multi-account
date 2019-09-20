import subprocess
import os
import sys
import boto3
import logging
import json
import cfnresponse
from botocore.vendored import requests
import traceback
ec2=boto3.client('ec2')
ssm=boto3.client('ssm')
acm = boto3.client('acm')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

responseData = {}

def deleteCert(event, context):
  
  try: 
    responseData['Complete'] = 'True'
    certificateID = event['PhysicalResourceId']
    acm.delete_certificate(CertificateArn=certificateID)
    cfnresponse.send(event, context, cfnresponse.SUCCESS, responseData, certificateID)

  except Exception as e:
      logger.error(e)
      errorMessage = e.args[0]
      response_data = {'ErrorMessage': errorMessage}
      cfnresponse.send(event, context, cfnresponse.FAILED, responseData)
  

def createCert(event, context):
  
  try: 

      installEasyRSACommands = ['curl -L https://github.com/OpenVPN/easy-rsa/releases/download/v3.0.6/EasyRSA-unix-v3.0.6.tgz -O',
                            'mkdir /tmp/easyrsa',
                            'mkdir /tmp/vpndetails',
                            'tar -xvzf /tmp/EasyRSA-unix-v3.0.6.tgz -C /tmp/easyrsa',
                            'ls /tmp/easyrsa']
      runCommandSet(installEasyRSACommands)
      
      
      easyRsaCommands = [ '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa init-pki',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa init-pki',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-ca nopass',
                          '/tmp/easyrsa/EasyRSA-v3.0.6/easyrsa build-server-full server nopass',
                          'cp /tmp/pki/ca.crt /tmp/vpndetails/',
                          'cp /tmp/pki/issued/server.crt /tmp/vpndetails/server.crt',
                          'cp /tmp/pki/private/server.key /tmp/vpndetails/server.key',
                          ]
      runCommandSet(easyRsaCommands, '/tmp/easy-rsa/EasyRSA-v3.0.6')
      
      serverCertResponse = acm.import_certificate(
          Certificate=get_bytes_from_file('/tmp/vpndetails/server.crt'),
          PrivateKey=get_bytes_from_file('/tmp/vpndetails/server.key'),
          CertificateChain=get_bytes_from_file('/tmp/vpndetails/ca.crt')
      )

      cfnresponse.send(event, context, cfnresponse.SUCCESS, responseData, serverCertResponse['CertificateArn'])
      
  except Exception as e:
      logger.error(e)
      response_data = {'ErrorMessage': e}
      cfnresponse.send(event, context, cfnresponse.FAILED, responseData)
  					
def runCommandSet(commands, workDir='/tmp/'):
              
  my_env = os.environ.copy()
  my_env["PATH"] = "/tmp/bin:" + my_env["PATH"]
  my_env["PYTHONPATH"] = "/tmp/:" + my_env["PYTHONPATH"]                
  my_env["EASYRSA_BATCH"] = "1"      

  stdOutResponse = []                
  for command in commands:
      commandHandle = subprocess.Popen([command],env=my_env,cwd='/tmp/', shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
      stdout, stderr = commandHandle.communicate()
      logger.info(command)
      logger.info(stdout)
      logger.info(stderr)
      stdOutResponse.append(stdout)
          
  return stdOutResponse

def get_bytes_from_file(filename):  
  return open(filename, "rb").read()      

def main(event, context):
  
  logger.info(event)
  
  #installDepCommands = ['pip3 install pip awscli --upgrade --no-cache-dir --ignore-installed --target=/tmp/']
  #runCommandSet(installDepCommands)
  
  if event['RequestType'] == 'Delete':
    deleteCert(event, context)
  elif event['RequestType'] == 'Create':
    createCert(event, context)
  