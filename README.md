# Biotech Blueprint 2.0 Deployment Instructions

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/a97a2tUIs8ZnsloZV9h1xQ.png)

## Setup the Control Tower Landing Zone

Log into your new ‘master’ account with the IAM user credentials you created for yourself.  

Navigate to the AWS Control Tower console and click on the “Set up landing zone” button.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/WiVn5Gy9HDsYpwyXKDsf9Q.png)

Provide emails for Log Archive Account and the Audit Account. These need to be email addresses distinct from each other and the email address you used for the main account. Something like [log-archive@yourcompany.com](mailto:log-archive@yourcompany.com) and [audit@yourcompany.com](mailto:audit@yourcompany.com).   

Acknowledge the permissions notice before you click the “Setup landing zone” button.   

Get some coffee and set a timer for 60 minutes. It will take up an hour for AWS Control Tower to provision the ‘core’ control tower accounts and setup the other AWS services managed by Control Tower. You can safely close the browser and come back when your timer goes off.    

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/DEB-dGQZGPboadTolJ_r5Q.png)

## Set AWS SSO password.

At some point during the AWS Control Tower setup, an email will be sent to the master account’s root email address.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/T_AqEagBjiDHJvzrXCxJsQ.png)

Click the “Accept Invitation” button and create a password. This username/password will only be used one-time during the setup to create the necessary credentials across the Master, Transit, and Research accounts. We will be changing the AWS SSO directory to Active Directory at the end of this guide, so this username/password will not be used after that.  

## Create the Transit Account

Once Control Tower has finished setting up the landing zone, its time to provision the Transit Account. The transit account will eventually house the Client VPN Endpoint and Transit Gateway portion of the solution. All future inter-account or inter-vpc networking can and should be configured through the Transit Gateway created by this account. Ideally, only your network administrator will have access to log into the Transit Account’s AWS Console.   

Navigate to Control Tower in the AWS Console and click on the “Account Factory“ link on the left side, then the ”Quick account provisioning“ button.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/DYcV47OBODvUwOPG2aCIIw.png)

Use the following fields in the ‘Account details’ form and click create account.  

| Parameter Name| Recommended Value | Notes
| --- | --- | --- |
Account Email | admin-transit@yourcompany.com |Replace with your company name
Display Name| Tranist_Account | Replace with your company name
SSO User First Name | Transit | 
SSO User Last Name | Admin |
Managed Org Unit | Custom | Drop down field. You will only see this option


![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/bXQl1LiC_Dzou5BCNfTM2w.png)

You will see an info box with a link to Service Catalog where you can monitor the progress of the account factory. Click on the “AWS Service Catalog link”.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/QxYxte3KNUUV8-mCCOfVlQ.png)

Click on the ‘Provisioned products list’ tab and you will see the transit account under creation. Set another timer for about 25 minutes.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/6qNuDFM_P1JHLv8om8JfRg.png)

It will look like this once the account provisioning is complete:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/IKI6BS9bAaBQtyH7CMVqzg.png)

You have to wait for this to complete before you proceed. Control Tower will give you an error message if you continue the guide without waiting for this step to finish.  

## Create the Research Account

The Research account is the future home of your bio/chem informatics tools and pipelines. All of the rest of the accounts we have created so far are designed to provide technical separation of duties according to best practices. For example, the master account handles identity, the transit account handles networking, the audit account handles cloudtrail events for all accounts, and the logging account handles cloudwatch logs for all accounts.   

You will need to follow the same steps you went through for the Transit account above to create the Research account. Just use the following parameters instead. Go to Control Tower, Account Factory, and click the ‘Quick account provisioning’ button.  

| Parameter Name| Recommended Value | Notes
| --- | --- | --- |
Account Email | admin-research@yourcompany.com |Replace with your company name
Display Name| Research_Account| Replace with your company name
SSO User First Name | Research | 
SSO User Last Name | Admin |
Managed Org Unit | Custom | Drop down field. You will only see this option

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/tgFFemcZ8G9jFO2fcQxEkQ.png)

Alexa! Set a timer for 25 minutes.  

## Enable sharing within your AWS Organization

Inside your master account, open the AWS Resource Access Manager (RAM) in the AWS console. AWS RAM is a service that makes sharing resources (like the Transit Gateway that gets created later on) between accounts easier and more secure.   

Go to the ‘Settings’ portion of RAM and check the “Enable sharing within your AWS Organization” and click “Save Settings”  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/tgFFemcZ8G9jFO2fcQxEkQ.png)

## Elevate permissions in the Transit and Research accounts.

By default, accounts provisioned by Control Tower (excluding the Audit and Logging accounts) don’t automatically grant cross-account administrator privileges to any user or principal. We need to grant administrator permissions to the user you setup in the “Set AWS SSO password” section above for the Transit and Research accounts so that we can start deploying resources into them.  

### Grant permissions

Go to the AWS SSO service page in the AWS console and go to the “AWS Accounts” tab:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/P_rHXkhdMKNvfIQNoewrmg.png)

Select the check boxes next to the Research and Transit accounts and click “Assign Users” button.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/xiVVYo1cI9VY8X-J2M9caA.png)

Select the “AWS Control Tower Admin” account and click “Next: Permission sets”  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/MGpoVq5Nnm8sTuxqazRyIQ.png)

Choose “AWS Administrator Access” and then click the “Finish” button. Should only take a few seconds. “Click the Proceed to AWS Accounts button“  

### Extend token expiration

The default token expiration for IAM roles assumed by AWS SSO is 1 hour. It may take you longer than an hour to complete the following steps if you take a break along the way.   

To extend that expiration, click on the “Permission Sets” tab and click on the “AWSAdministratorAccess” permission set directly. (Don’t click the radio button)  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/RrG3ew9mSYgnaUme7b6C9Q.png)

Click the “Edit”button and set the session duration to something greater than an hour.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/R1NXBTolbnZOg1sP74ITlQ.png)

It will then ask you which accounts you want to reprovision the policy in. Select the Transit, Master, and Research accounts and click “Reprovision”  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/GgUlhoEi--YKiAhYDzOgUA.png)

Should only take a few seconds.  

## Prepare the Deployment Environment with AWS Cloud9

AWS Cloud9 is a web based integrated development environment. You could run all of the same commands below on your local machine, but Cloud 9 comes with many dependencies pre-installed and tends to be a much faster to get started.   

Navigate to the AWS Cloud9 console, and click the “Create environment” button.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/Jjern2OYcq8RiWnFtgRIbA.png)

Follow the creation wizard, but you only need to specify the following parameters. Leave the rest as their defaults.   

Environment Name (Call it something like Biotech Blueprint Deployment Console)  
Instance Type: t2.small  

It will take a few minutes, but you will eventually be presented with the following development environment:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/KwVV8L5vkBHOcdhVfrOIrQ.png)

Notice the terminal window at the bottom of the IDE. Run the following commands. You may get warnings, but they can be ignored. We are installing the AWS Cloud Development Kit (CDK) and pulling down the Biotech Blueprint source code.   

```shell	
git clone https://github.com/aws-samples/biotech-blueprint-multi-account
cd biotech-blueprint-multi-account  
./prepCloud9env.sh
```

The final output of the prepCloud9Env script is the path to the AWS credentials file. Click on the file name, and chose “Open” to open up the AWS Credentials File.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/BzYP12hI_gGBEzUtuaP8EQ.png)

## Prepare Your AWS Credentials File

Go ahead and delete the contents of the credentials file.   

You may get a warning when Cloud9 detects you have changed this file. One of the features of Cloud9 is automatically refreshing this file with temporary keys for the IAM user assigned to Cloud9\. Because we are deploying things across multiple accounts, we want to disable this automatic refresh. When the warning prompt appears, click the “permanantly disable refresh button”  

We are going to be deploying lots of stuff in the Master, Transit, and Research account. We need to prepare this credentials file that will give the Cloud9 environment permissions.  

### Log into your SSO portal

<span style="color:#333333" textcolor="#333333">From the master account, visit the AWS SSO page in the console again. When the AWS SSO Dashboard comes up, visit the “User portal URL” listed at the bottom of the dashboard and log in with the username/password that you used in the “Set AWS SSO password.” section above.</span>  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/cOk52pCm-dW73CVVpltGbQ.png)

You should see something like the following once you have logged in.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/iNJHX3C8CutuSt99NDjQgA.png)

Expand the "Research" account, and click on the"Command line or programmatic access" button on the "AWSAdministratorAccess" row.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/XDwwIgaeKhe7IodhNXZ4rg.png)

Hover over the "Option 2" and copy that text.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/iqPZ5Xcxdyr1AfehgWE_-w.png)

That text will look something like this:  

`[111111111111_AWSOrganizationsFullAccess]`  
`aws_access_key_id = ASIA....P5MC4E`  
`aws_secret_access_key = lZfRUkA.....1daLxqcSOx0E`  
`aws_session_token = AgoJb3JpZ............0grr1`  

Paste that text into the open credentials file in the Cloud9 environment located at `~/.aws/credentials`  

Replace the `[111111111111_AWSOrganizationsFullAccess]` with `[research]`  

Do the same for the transit and master account such that your aws credentials file ends up looking like this:   

```
[research]  
aws_access_key_id = ASIAR7.....GUMM6  
aws_secret_access_key = kN4LVgE......oKidZ+3BxMmyyjwXl8PjD9  
aws_session_token = Ago............Jc  
region=us-east-1  

[master]  
aws_access_key_id = ASIAXZ...6GRA6U  
aws_secret_access_key = pj4EMH......MsXmjdiWRg  
aws_session_token = AgoJ............bD  
region=us-east-1  

[transit]  
aws_access_key_id = ASIA3Q...X4LIPYBL  
aws_secret_access_key = D+xfSxawa......gnXCiEYAh  
aws_session_token = AgoJb3Jpujc............NU7ZQETpGyO2u  
region=us-east-1</pre>
```

Make sure you add region=us-east-1, or whatever your desired home region is to each profile.   

Save the credentials file when you are done.  

## Set your deployment preferences:

Open the file cdk.json at `~/biotechblueprint/cdk.json`  

This file is where various context values are set for the CDK CLI deployment. The only value that you NEED to set is `corporateDnsApex`. That value needs to map to your company’s apex domain. If your company name is ExampleCorp and you own the domain examplecorp.com, use that.  

The only other value you might want to change is `corporateNetBiosShortName`. This is used with Active Directory as the domain’s short name. If you don’t know what this is or don’t care, just leave the default value of `corp`.  

Leave the rest of the values alone. The deployment script will automatically populate them.   

```javascript
{  
  "app": "npx ts-node bin/bb-20.ts",  
  "requireApproval": "never",  
  "context": {  

    "corporateDnsApex" : "examplecorp.com",  
    "corporateNetBiosShortName": "corp",  

    "transitGatewayRouteTableSecretArn": "XXXXXXXXXXXX",  
    "researchTgAttachmentSecretArn": "XXXXXXXXXXXX",  
    "transitGatewaySecretArn": "XXXXXXXXXXXX",  
    "researchVpcCidrSecretArn": "XXXXXXXXXXXX",  
    "identityTgAttachmentSecretArn": "XXXXXXXXXXXX",  
    "identityVpcCidrSecretArn": "XXXXXXXXXXXX",  
    "identityAccountAdConnectorSecretArn": "XXXXXXXXXXXX",  
    "identityAccountAdConnectorSecretKeyArn": "XXXXXXXXXXXX",  
    "masterAcctId": "XXXXXXXXXXXX",  
    "transitAcctId": "XXXXXXXXXXXXX",  
    "researchAcctId": "XXXXXXXXXXXXX",  
    "orgArn": "XXXXXXXXXXXXXXX"  
  }  
}
```
Open the file bb-20.ts at `~/biotechblueprint/bin/bb-20.ts`  

Lines 24-28 have a list of CIDR ranges that will be used for the VPCs created in the transit, research, identity, and vpn networks. It is important for the transit stack that these do not overlap with any IP ranges you currently use either on-premise, for existing vpn users, or in existing VPCs you use. Double check to make sure the ranges specified  

```javascript
const envIdentity  = { ..., desiredVpcCidr: "10.0.0.0/16"};  
const envTransit = { ..., desiredVpcCidr: "10.1.0.0/16"};  
const envResearch =   { ..., desiredVpcCidr: "10.2.0.0/16"};  

const vpnClientAssignedAddrCidr = "10.3.0.0.0/16";
```

## Run deployBiotechBlueprint.sh

Now you just need to run the following command   

`./deployBiotechBlueprint.sh`  

This script will kick off a number of AWS CDK deployment commands that will stand up all of the components in the Transit, Master, and Research accounts. You will want to set another timer. The deployment will take approximately 1 hour. For the record, 40 minutes of that is waiting for Microsoft’s Active Directory to boot up.  

## Connect to the VPN 

The previous deployment script sets up Active Directory in the master account, AWS AD Connectors in the Transit and Research accounts, and an Active Directory integrated Client VPN Endpoint in the Transit account.   

In order to manage users and groups, you need to first connect to the VPN Endpoint which will allow you to route into the Identity stack. From there, you can directly connect the Active Directory domain controllers from your local machine or RDP into the “Domain Controller Console” host and administer AD from there.   

### Download Client VPN Configuration File

The deployment script will automatically output the TransitVPN.ovpn file @ `~/environment/TransitVPN.ovpn`. You can right click on that file in Cloud9 to download it. You can also download again from the AWS web console by locating the Client VPN Endpoint in the Transit Account’s VPC console, selecting it, and clicking the “Download Client Configuration” button.  

Location of the TransitVPN.ovpn config file in Cloud9:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/VN6NyCe4PFHTiU93sl9pmQ.png)

For reference, you can also download the same client configuration file from the AWS VPC console’s "Client VPN Endpoints" page.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/HmtUeeRQRCDt2GpmxHKsWA.png)

### Download Client VPN Software  and import the CONFIGURATION file

You will first need a Client VPN application installed on your local machine. [These instructions have links to download](https://docs.aws.amazon.com/vpn/latest/clientvpn-user/connect.html) various compatible VPN Client tools depending on your OS (Windows/Android/iOS/MacOS/Ubuntu). Those instructions also tell you how to import a configuration file. Follow those steps with the TransitVPN.ovpn file you just downloaded on your local machine.   

### Connect to the VPN

Go ahead and connect to the VPN. You will be prompted to login with credentials.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/kuJkz1g7K5fw5TYtIjzpDQ.png)

By default, AWS Directory Services provisions a single username, “admin”, that has full domain controller permissions. The Biotech Blueprint deployment script has automatically given this admin permissions to log into this domain. To obtain the password, log into the Master Account and go to the AWS Secrets Manager service page.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/UmActxtymNaPK5zLIRjfYg.png)

Click on the `ADAdminCreds` secret   

Scroll down to the “Secret value” section and click the “Retrieve secret value” button:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/L7RuXOKYh8xqv1jmQWyo2A.png)

You will see the username/password combo that you should use log into the VPN.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/bCSSuMOXnULNO20gb8iMYQ.png)

You are now connected to the cloud! Now lets connect to that domain controller and start adding users/groups that are relevant to your company.   

## Create your desired AD Users and Groups

At this point, you can directly connect your local machine to Active Directory and manage it if you happen to have the AD administration tools already installed on your local machine. For simplicity sake, the Biotech Blueprint deployment script launches a small instance in the identity stack’s private subnet that already has the AD management tools installed and is already joined to the domain. All you need to do is RDP into that host. Keep in mind, this host is in a private subnet only routable by clients that are connected to the VPN.  

To connect to the host, log into the master account AWS console and visit the EC2 service page. Under “Instances”, you will see the “Domain Controller Console”. Right click on that instance and choose connect.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/hYM1mYdqUMsKc5QSqrrNBw.png)

Click on the “Download Remote Desktop File” and open it with your remote desktop client:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/-5dT1RgBjBHYEYh-svW9vA.png)

You may get a warning when you connect. Go ahead and click the connect button.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/FJypPRD3SwpmG0a3GlPZIQ.png)

You need to connect with the same AD credentials that you logged into the Client VPN Endpoint with. Your RDP client may default the user to your local machine’s current user. Click the “More choices” link and “Use a different account” option.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/OAUFmFXqHA3pwQc7aIktvA.png)

Your username needs to be a combination of your NetBIOS shortname and the “admin” username. You would have specified the shortname as the `corporateNetBiosShortName` value in the “Set your deployment preferences” section above. If you left the default value, the username will be: “corp\admin”.   

Your password is the same password you used to log into the VPN as described in the “Connect to the VPN” section above. You can get that same value again from Secrets Manager in the master account if you need to.  

Click OK and you will get automatically logged into the Domain Controller Console instance.   

When the instance comes up, click the Windows icon in the bottom left corner and type in “Active Directory Users and Computers” and open the app.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/zcq-Jitkv7eva7zNlUc9xQ.png)

The snapin will automatically connect to Active Directory as the domain administrator (because you are logged in as the domain admin).  

To start creating groups/users, expand the tree down from “yourcompany.com” to “yourshortname” to “Users”. For example:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/eONsc_MowKEpHRIWhI0uHw.png)

You will see 4 items in the list:  

<div data-section-style="5" style="" class="">

*   Admin - This USER is created automatically by AWS directory services and the user you are currently logged in as.  

*   svc_adconnector - This USER is a service account used by the AD Connectors in the Transit and Research accounts to connect to the domain controller.  

*   Connectors - This GROUP gives permissions for the AD connectors in the Transit and Research accounts.  

*   CorporateVpnUsers - This GROUP gives members permissions to connect to the Transit VPN solution. You will notice Admin is already a member of this group.  



At this point, you can start creating groups and individual users as you see fit.   

Start by creating a user for yourself. Make sure you add yourself to the CorporateVpnUsers group.  

If you want to allow someone else to connect to the VPN, create a user for them and add them to the CorporateVpnUsers group.  

In the next step, we are going to give AWS permissions based on the AD groups you create. We recommend that you create the following groups and add the user you created for yourself to them.  

ResearchAccountAdmins  
ResearchAccountUsers  
TransitAccountAdmins  
MasterAccountAdmins  
AuditAccountAdmins  
LoggingAccountAdmins  

We will associate these groups to AWS IAM  permissions in the next step.  

For the most part, non-IT staff will never need AWS permissions on the Transit/Master/Audit/Logging accounts and should likely never be added to those groups.   

## Switch AWS SSO to use AWS Directory Services

Up to this point, the AWS SSO service that AWS Control Tower setup for you in the master account has been using the AWS SSO Directory. Because we are maintaining users/groups in Active Directory, we are going to change AWS SSO to use AD instead. Log into the master account and navigate to the AWS SSO service page.   

Click on the “Directory” section.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/Ghlo32OkOfNzu2g2tDVPwQ.png)

Click on the “Change directory” link.  

Choose “Microsoft AD directory”.  

The identity stack’s AD environment should be prepopulated in the “Existing directories" drop down. Click Next.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/mz6J_ARbxxIJzKBBhzQxfA.png)

You will get a warning that that all existing permissions will be removed. Type “CONFIRM” to acknowledge this.   

It should only take a few seconds. You should see the following if it completed successfully.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/4uGqlTdMHQcH9C9dU-bHng.png)

Click on the “Proceed to the directory” button. Then navigate the “AWS accounts” page in the AWS SSO console.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/xPTJXCZK1nGPRV73VUWReg.png)

Its from here that we assign Active Directory users or groups IAM permissions. Lets start off giving access to the master account.   

Check the box next to the master account on the list and click the “Assign users” button.   

You will see a search box come up to search for group names. Search for the group name you created earlier that you want to give master account admin privileges too. If you followed the recommended group names above, it would be “MasterAccountAdmins”. (Make sure you added yourself to that group  as described in the “Create your desired AD users and groups“ section above) Then click ”Next: Permissions sets“.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/j3CI62gDvGnQBm3863EiTQ.png)

Now we are about to assign permissions to users of that group on the account we selected. In order to give members of this group full administrator access to the account, we just need to check the “AWSAdministratorAccess” policy and click finish.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/X7ACbgj3oeHyzTslMwYSpg.png)

As you can see, there are other types of pre-built permission sets that you can assign to users or create your own. You can also select multiple permissions sets for the group. If a users has multiple permissions sets, they will see an option to login to the account for each permission set the belong to. For example, you may want to give users the option of escalating their privileges or emulating another role’s permissions.   

Repeat this process for the Transit, Research, Audit, and Log Archive accounts based on the groups or users you created in Active Directory.   

## Log into your AWS Portal and conquer

Go back to the AWS SSO Dashboard and copy the “User portal URL”.  

This URL is the entry point for for all users who need access to the AWS Console, CLI, or SDKs.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/tKz57e8lZjmr2L2fmQm_-g.png)

Go ahead and visit that URL and login with the Active Directory username and password you created for yourself earlier.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/9HI7xYtTMlGBH6WRZMZuKw.png)

Expand the various accounts to access the management console or obtain AWS access keys and secret keys. In the image below, all of the accounts are listed as an illustration. If the logged in user only had access to one account, they would only see one account listed (or get logged in automatically).  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/j2Lj_ZfVz9zoaXdiA4CYgg.png)

## Giving account access to other users

In order to allow others to connect to the VPN or the AWS console you need to provide them with 3 things:  

<div data-section-style="5" style="" class="">

*   Active Directory Credentials - Whatever username and password you created for them  

*   For VPN Access, give them the same TransitVPN.ovpn file that you downloaded earlier and connected with. That file contains no passwords and can be shared safely among members of your company. Each user will be logging in with their own unique AD credentials you created for them.  

*   For AWS Console access, give them the “User portal URL” from the AWS SSO page that you just logged in with. They will need to log in with their AD credentials.   



# Creating and enrolling a new account into the Blueprint

At this point, you can begin your work in the shared research account that was created during the initial Biotech Blueprint deployment. You may now want to create a new account for a specific department in your company, HIPAA/clinical boundary, a CRO, a university, a partner, a consultant, an internal team, a production/test/development, or even for individual developer sandboxes. Any time you want to create a strong account-level boundary between resources created by AWS, you should consider following this process.  

From the master account, you will need to visit the Control Tower console and click the “Provision new account” button:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/LjAtM0p-oReAgSSQnsffSg.png)

From there, launch the “Account Factory” product:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/rJiM7dHhV6Q1RJwa4CicVg.png)

For the purposes of this walkthrough, I’m going to pretend we are creating an account for a fictional Contract Research Organization (CRO) called CRO-ATX. Provide a name for the stack:  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/xaBTaQrxf05nfYj-QfcILg.png)

You will need to supply the following parameters. You may be confused by the SSO* parameters. Didn't we switch SSO to use Active Directory instead of the AWS SSO identity store? The Account Factory portion of Control Tower still requires you supply the values but it does not use them.  

| Parameter Name| Recommended Value | Notes
| --- | --- | --- |
SSO User Email | admin-[groupname]@yourcompany.com |Replace with your company name
Account Email| admin-[groupname]@yourcompany.com| Replace with your company name
SSO User First Name | [Group Name] | The logical name of the group you are creating the account for
SSO User Last Name | Admin |
Managed Org Unit | Custom | Drop down field. You will only see this option
Account Name | [Group Name] | The logical name of the group you are creating the account for
<div data-section-style="13">




Click through the wizard prompts accepting the default values and click the “Launch” button on the final review page.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/SJASVJ06YQ9hEqq_yZu8-w.png)

Set another time for 20 minutes, watch some cat videos or get a coffee. After about 20 minutes you should see the deployment has succeeded under the “Status” section.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/I_h_lofIzxJiigWu7-JFGQ.png)

Now, we need to give yourself administrator access to that environment. Visit the AWS SSO console’s “AWS Accounts” section, select the checkbox next to the new account, and click the “Assign users” button.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/X7G8Y5grkPlhq_-b_DtaLg.png)

Search for yourself or an AD group you created earlier and move on to the permission sets page. Choose the “AWSAdministratorAccess” permission set and click the “Finish” button.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/n8rwqHxLqT7JmW4ImHW4WQ.png)

Now that we have the account created, we need to ‘enroll’ it into the Transit and Identity stacks. This sets up the necessary networking infrastructure required to integrate with the transit and identity solutions the blueprint has deployed.   

The Biotech Blueprint follows a ‘infrastructure as code’ philosophy, so to deploy the necessary components we are going to extend the Biotech Blueprint code base and begin customizing to your company. Dont worry, this only involves adding a few lines to the end of 2 files.  

Open back up the Cloud9 environment in the Master account we used to deploy the blueprint.  

You will likely need to refresh the ~/.aws/credentials file like we did before. Follow the instructions in the “Prepare Your AWS Credentials File” section above, but this time add the additional account profile. It should now look something like this  

```
[research]  
aws_access_key_id = AS....GZ  
aws_secret_access_key = 3ZE.....Qk  
aws_session_token = IQoJb3J.....QDcjvOBA  
region=us-east-1  

[master]  
aws_access_key_id = A...OI  
aws_secret_access_key = Q....EUJz+  
aws_session_token = IQoJ....wcYKP  
region=us-east-1  

[transit]  
aws_access_key_id = ASI....Y77  
aws_secret_access_key = 0vaFfY....5s  
aws_session_token = IQoJb3...GpgmTbs  
region=us-east-1  

[CROatx]  
aws_access_key_id = AS.....JCY  
aws_secret_access_key = 2RF......EgIq  
aws_session_token = IQoJb3J.....y3Tsm  
region=us-east-1</pre>
```

Now, open up the `biotechblueprint\cdk.json `file.  

For demonstration, we are using a fictional CRO called “CROatx”. In the following three snippets, do a find/replace for “CROatx” to a more appropriate name for the account you are creating. It needs to start with a capital letter, no spaces, no hyphens.  

Add the following  properties to the end of  the `context` property.   

```
  "app": "npx ts-node bin/bb-20.ts",  
  "requireApproval": "never",  
  "context": {  
        ....  
  "envCROatxAccountId":"XXXXXXXXX",  
  "CROatxTgAttachmentSecretArn":"XXXXXXXXXXXXX",  
  "CROatxVpcCidrSecretArn":"XXXXXXXXXXXXX"  
  }  
}
```

Leave the `XXXXXXXXXXXXX`values as Xs. The script automatically populates them.  

Now, open up the file `biotechblueprint\bin\bb-20.ts` and scroll down to the bottom.  

You will see an ‘example’ section where you can uncomment lines as necessary.  Again, find replace CROatx with the more meaningful name you used for the snippet above. Note, that the commented section demonstrates how to enroll an account and create a new VPC as well as enrolling an account with an existing VPC. The example below has the ‘existing VPC’ option commented out.   

```typescript
////////////////////////////////////////  
/// Example of how to onboard an brand new account into the Blueprint  
/// Just find and replace 'CROatx' below with a more meaningful account name (must start with a capital letter, no spaces/numbers/hyphens)  

// Example for enrolling a brand new account with a new VPC:  
const envCROatx =   { account: app.node.tryGetContext("envCROatxAccountId"), desiredVpcCidr: "10.13.0.0/16"};  
const CROatxAccount = new childAccountStack(app,'CROatxAccountStack', {env: envCROatx, desiredVpcCidr: envCROatx.desiredVpcCidr, desiredVpcName: "CROatxVpc"});  

// Example for enrolling an existing account with an existing VPC  
// Note, you need to replace the desiredVpcCidr and existingVpcID respective values of the existing VPC.  
//const envCROatx =   { account: app.node.tryGetContext("envCROatxAccountId"), desiredVpcCidr: "XXXExistingVpcCidrRangeGoesHereXXX", region: 'XXXExistingVPCRegionGoesHereXXX'};  
//const CROatxAccount = new childAccountStack(app,'CROatxAccountStack', {env: envCROatx, existingVpcId: "XXXExistingVPCIdGoesHereXXX"});  

/// Here you need to make a descion about what the account should have access to.  
/// Do you want users of this account to access resources via VPN in the transit stack? You need to instantiate the TransitToCROatxVpcRoute and CROatxToTransitVpcRoute  
/// Do you want users/resources in this account to be able to route into the research vpc and vice versa? You need to instantiate ResearchToCROatxVpcRoute and CROatxToResearchVpcRoute  
/// Do you want users/resources of this account need to communicate with the domain controller in the identity stack? You need to instantiate IdentityToCROatxVpcRoute and CROatxToIdentityVpcRoute  

// Example:  
const CROatxToTransitVpcRoute = new VpcRouteTableTransitRouteStack(app,'CROatxToTransitVpcRoute', {  
  env: envCROatx,   destinationCidr: envTransit.desiredVpcCidr,   targetVpc: CROatxAccount.Vpc });  
const TransitToCROatxVpcRoute = new VpcRouteTableTransitRouteStack(app,'TransitToCROatxVpcRoute', {  
  env: envTransit,   destinationCidr: envCROatx.desiredVpcCidr,   targetVpc: transitAccount.vpc });  

const CROatxToIdentityVpcRoute = new VpcRouteTableTransitRouteStack(app,'CROatxToIdentityVpcRoute', {  
  env: envCROatx,   destinationCidr: envIdentity.desiredVpcCidr,   targetVpc: CROatxAccount.Vpc });  
const IdentityToCROatxVpcRoute = new VpcRouteTableTransitRouteStack(app,'IdentityToCROatxVpcRoute', {  
  env: envIdentity,   destinationCidr: envCROatx.desiredVpcCidr,   targetVpc: identityAccount.Vpc });  

const CROatxToResearchVpcRoute = new VpcRouteTableTransitRouteStack(app,'CROatxToResearchVpcRoute', {  
  env: envCROatx,   destinationCidr: envResearch.desiredVpcCidr,   targetVpc: CROatxAccount.Vpc });    
const ResearchToCROatxVpcRoute = new VpcRouteTableTransitRouteStack(app,'ResearchToCROatxVpcRoute', {  
  env: envResearch,   destinationCidr: envCROatx.desiredVpcCidr,   targetVpc: researchAccount.Vpc });    

const CROatxTransitEnrolledAccountStack = new TransitEnrolledAccount(app,'CROatxTransitEnrolledAccountStack', {  
  env: envTransit,  
  AccountDescription: "CROatx",  
  AccountToEnrollVpcCidr: envCROatx.desiredVpcCidr,  
  targetVpcTransitSecretsArn: app.node.tryGetContext("CROatxTgAttachmentSecretArn"),  
  transitVPCRouteTableSecretsArn: app.node.tryGetContext("transitGatewayRouteTableSecretArn"),  
  targetVPCCidrRangeSecretsArn: app.node.tryGetContext("CROatxVpcCidrSecretArn")  
});</pre>
```

Now, open up the file `biotechblueprint\deployBiotechBlueprint.sh `and scroll down to the bottom.  

You will see another example section where you can uncomment the commands and find/replace the CROatx   

``` shell
#########################################################  
### Example of how to onboard an additional account into the Blueprint  
### ...  

CROatxAcctId="$(aws sts get-caller-identity --profile CROatx --query "Account" --output text)"  
jq '.context.envCROatxAccountId = $accountID' --arg accountID $CROatxAcctId cdk.json > tmp.$.json && mv tmp.$.json cdk.json  
cdk deploy CROatxAccountStack --context transitGatewaySecretArn=$transitGatewayIdSecretArn --profile CROatx  

CROatxGatewayAttachment="$(aws secretsmanager get-secret-value --secret-id ga --profile CROatx | grep -Po 'tgw-attach-.{17}')"  
aws secretsmanager put-secret-value --secret-id ga --secret-string $CROatxGatewayAttachment --profile CROatx  
CROatxTgAttachmentSecretArn="$(aws secretsmanager get-secret-value --secret-id ga --profile CROatx | grep -Po 'arn:aws:secretsmanager.*ga')"  
CROatxVpcCidr="$(aws secretsmanager get-secret-value --secret-id vc --profile CROatx | grep -Po '[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/..')"  
aws secretsmanager put-secret-value --secret-id vc --secret-string $CROatxVpcCidr --profile CROatx  
CROatxVpcCidrSecretArn="$(aws secretsmanager get-secret-value --secret-id vc --profile CROatx | grep -Po 'arn:aws:secretsmanager.*vc')"  

cdk deploy CROatxToTransitVpcRoute CROatxToIdentityVpcRoute CROatxToResearchVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile CROatx   

cdk deploy ResearchToCROatxVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile research       

cdk deploy IdentityToCROatxVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile master   

cdk deploy TransitToCROatxVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile transit       

cdk deploy CROatxTransitEnrolledAccountStack \  
    --context identityAccountAdConnectorSecretArn=$identityAccountAdConnectorSecretArn \  
    --context identityAccountAdConnectorSecretKeyArn=$identityAccountAdConnectorSecretKeyArn \  
    --context transitGatewayRouteTableSecretArn=$transitGatewayRouteTableSecretArn \  
    --context CROatxTgAttachmentSecretArn=$CROatxTgAttachmentSecretArn \  
    --context CROatxVpcCidrSecretArn=$CROatxVpcCidrSecretArn \  
    --profile transit         
```

Now, execute the deployment by running the following command:  

`./deployBiotechBlueprint.sh`

# Enrolling an EXISTING account into the Blueprint

Before you continue, the existing account cannot belong to an existing AWS Organization. Visit the AWS Organization console and click the ‘Leave Organization’ button before continuing.   

## Grant permissions to master account.

First thing we need to do, is give permissions to the existing account to Control Tower in the master account  in   

To do that, we need to first create an IAM role. Go to the IAM console in the existing account. Select roles on the left, and create the “Create role” button.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/b2d1S4YSdldISJD5Iror5Q.png)

For “Select type of trusted entity”, choose “Another AWS account”.  

Supply the account ID of the master account and leave the two options unchecked. Click “Next: Permissions”  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/UcHkbfrp8luxGq-O1JXvNg.png)

Select the “Administrator Access” policy and click “Next: Tags”

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/rA9dAmURsgzO9w_UKSIpmA.png)

Apply any tags if you like.   

Once you get to the Review screen, supply the following role name exactly: `AWSControlTowerExecution`

Provide a description, something like “Used to give Control Tower permissions to master account” and click “Create role”.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/0ZlX6_2mE5XJsE0VIKKi5Q.png)

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/BjDEyCbymP-IlhW-9EN_QQ.png)

## Turn Off AWS Config Recording

AWS Control Tower will take over for any AWS Config recording once you enroll it. If you are using AWS Config, you need to disable AWS Config recording before you enroll it into AWS Control Tower.   

To check if AWS config is running, go to the AWS Config console. If you see a screen like the one below that means you have never used AWS Config before and you can skip this step. Double check and make sure you are in the right region.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/RGcPJipgi3zm5g6z82GMAQ.png)

 If you see the following screen when you get to AWS Config, that means you AWS Config is enabled in this region for this account.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/N5v7u-8Apd3aBylcZRrjYQ.png)

Click on “Settings” on the left side and then the “Turn off” button to turn off recording.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/7g-RwU0_8jsnNyosk85fYQ.png)

Confirm you are turning off Config.   

You now need to delete the default configuration recorder and delivery channel in the regions where existing account has AWS Config enabled. Unfortunately, you can only do this through the AWS CLI at the moment. Run the following two command against the existing account.   

```
aws configservice delete-configuration-recorder --configuration-recorder-name default --region PUTREGIONHERE  
aws configservice delete-delivery-channel --delivery-channel-name default --region PUTREGIONHERE
```

## Add existing account into AWS Organization

Next thing we need to do is add the existing account into the new AWS Organization setup.   

From the Master Account, visit the AWS Organization’s console and click on the “Add Account” button.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/PR31NKyMhBY27PPaiH8Ppw.png)

Choose the “Invite account” option and supply the existing account’s email address or any notes you want.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/ubs2MIO9XK-puitBNbY0TQ.png)

Supply the existing account ID and any notes. An email will be sent to the root email address of the existing account to confirm the invitation to join the AWS Organization.  It will look like this once the invite has been sent.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/uUZKFLu09DoIAC9jbzuhDQ.png)

The email address associated with the existing account will receive the following email.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/Nn2v8qObNgR86sAjvxiOoQ.png)

Go the AWS Organizations console in the existing account to accept the invite (you don't need to wait on the email). If you haven’t already setup AWS Organizations, you will see the following on the dashboard. Click the “Invitations (1)” link.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/vxUgz54HkjH4SLbbUDZVVA.png)

Then click Accept.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/8vVa-UJJDEOLTvCO1oGESQ.png)

Your existing account is now part of the AWS Organization relationship with the other accounts created by the Blueprint.   

## Enroll existing account into Control Tower

Next, we need to enroll the existing account into Control Tower.   

Visit the ‘Account factory’ from the AWS Control Tower dashboard in your master account and click on the “Enroll Account” button.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/fRie-zYC8daK8CFm6duSgw.png)

Supply the email address associated with the root of the existing account. You need to provide a value for the AWS SSO fields, but they will not be used if you have switched your AWS SSO Identity provider to Active Directory or a custom IDp.   

Choose ‘Custom’ for the Organizational Unit parameter.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/p0l3tUJBx0KIhVFlT-abrQ.png)

You will see a notification that the enrollment is underway.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/rfxS0HrF8fe1WBN_AxLSvA.png)

You can follow the link to Service Catalog to observe the progress.  

Control Tower is going to be assuming the `AWSControlTowerExecution` role we created earlier and deploying resources via CloudFormation into your existing account based on your current Control Tower configurations.  

It takes about 30 minutes to enroll the account so set a timer and take a break.   

It will look like this once the account has been enrolled.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/h4wUyLl3MLk7P8HizEmc_g.png)

## Give permissions to yourself or others through SSO

Now that the existing account has been enrolled, we need to grant permissions to users/groups in your identity provider so they can login via AWS SSO.  

In the master account, visit the AWS SSO console and go to “AWS accounts”. Select the existing account from the list and click the “Assign Users” button.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/EwlHbzSQ28xziMZDgzOGew.png)

Search for yourself or any group in your IDP who you want to give administrator access to. You may want to create an "existingAccountAdministrators" group in your IDP (AD/Okta/etc) before this step. Select "Next: Permission sets" once you have selected the users/groups you want to give administrator access to.   

Choose the “AWSAdministratorAccess” permission set and click “Finish”.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/a-8XiQruiLTZMUd5Wn82QA.png)

## Enroll the existing account into the Biotech Blueprint

Pull up the Cloud9 environment or code repo where you deployed the Biotech Blueprint in. More than likely, the temporary credentials you used during the last deployment have expired. We need to reassemble that `~/.aws/credentials` file with fresh credentials for your Biotech Blueprint and existing account.  

Open up the ~/.aws/credentials file. Leave it open. We will come back to it.  It probably looks something like this at the moment:  

```
[research]  
aws_access_key_id = AS...SF  
aws_secret_access_key = DNS...ebXs  
aws_session_token = IQo...OM=  
region=us-west-2  

[master]  
aws_access_key_id = A...LH  
aws_secret_access_key = G...8vO2  
aws_session_token = IQ...Qo=  
region=us-west-2  

[transit]  
aws_access_key_id = ASI....QPVX  
aws_secret_access_key = L....1  
aws_session_token = IQ....dI=  
region=us-west-2</pre>
```

Next, log into the AWS SSO portal. You should now see the existing account appear in your account list.   

Expand the existing account, and click the “Command line or programmatic access” link on the AWSAdministratroAccess row.  

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/CahEegtc6ToU58xqANyvCg.png)

Select option 2 to copy the short term credentials to your clipboard.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/H50CAGD_QWcPo5kCe8orJg.png)

Add a new profile to your configuration file for your existing account. Feel free to change the profile name from “existingAccount” to something more meaningful to you.  Dont forget to manually add the region configuration.  

```
[existingAccount]  
aws_access_key_id = ASIATS2.....IVJ4NH  
aws_secret_access_key = 2y8Cz8bGxcLRh.....5R0sicZg79+7MFF  
aws_session_token = IQoJb3J.....ioZ+b0=  
region=us-west-2

[research]  
aws_access_key_id = AS...SF  
aws_secret_access_key = DNS...ebXs  
aws_session_token = IQo...OM=  
region=us-west-2  

[master]  
aws_access_key_id = A...LH  
aws_secret_access_key = G...8vO2  
aws_session_token = IQ...Qo=  
region=us-west-2  

[transit]  
aws_access_key_id = ASI....QPVX  
aws_secret_access_key = L....1  
aws_session_token = IQ....dI=  
region=us-west-2</pre>
```

Go through the same process for the research, master, and transit profiles. Save the file.  

Now, open up the `biotechblueprint\cdk.json `file.  

For demonstration, we are using term “CROatx” to refer to an existing account you may want to use. In the following three snippets, do a find/replace for “CROatx” to a more appropriate name for the account you are creating. It needs to start with a capital letter, no spaces, no hyphens.  

Add the following **bolded** properties to the end of  the `context` property.   

```json
{  
  "app": "npx ts-node bin/bb-20.ts",  
  "requireApproval": "never",  
  "context": {  
        ....  
  "envCROatxAccountId":"XXXXXXXXX", 
  "CROatxTgAttachmentSecretArn":"XXXXXXXXXXXXX", 
  "CROatxVpcCidrSecretArn":"XXXXXXXXXXXXX"  
  }  
}
```
Leave the `XXXXXXXXXXXXX`values as Xs. The script automatically populates them.  

Now, open up the file `biotechblueprint\bin\bb-20.ts` and scroll down to the bottom.  

You will see an ‘example’ section where you can uncomment lines as necessary.  Again, find replace CROatx with the more meaningful name you used for the snippet above.   

You will see an ‘example’ section where you can uncomment lines as necessary.  Again, find replace CROatx with the more meaningful name you used for the snippet above.   

Also, note the bolded lines below. You will need to replace the **XXXExistingVpcCidrRangeGoesHereXXX, XXXExistingVPCRegionGoesHereXXX, XXXExistingVPCIdGoesHereXXX** to the VPC in your existing account.   

```typescript
/////////////////////////////////////////  
/// Example of how to onboard an additional account into the Blueprint  
/// Just find and replace 'CROatx' below with a more meaningful account name (must start with a capital letter, no spaces/numbers/hyphens)  

// Example for enrolling a brand new account with a new VPC:  
//const envCROatx =   { account: app.node.tryGetContext("envCROatxAccountId"), desiredVpcCidr: "10.13.0.0/16"};  
//const CROatxAccount = new childAccountStack(app,'CROatxAccountStack', {env: envCROatx, desiredVpcCidr: envCROatx.desiredVpcCidr, desiredVpcName: "CROatxVpc"});  

// Example for enrolling an existing account with an existing VPC  
// Note, you need to replace the desiredVpcCidr and existingVpcID respective values of the existing VPC.  
const envCROatx =   { account: app.node.tryGetContext("envCROatxAccountId"), desiredVpcCidr: "XXXExistingVpcCidrRangeGoesHereXXX", region: 'XXXExistingVPCRegionGoesHereXXX'};  
const CROatxAccount = new childAccountStack(app,'CROatxAccountStack', {env: envCROatx, existingVpcId: "XXXExistingVPCIdGoesHereXXX"});  
  
/// Here you need to make a descion about what the account should have access to.  
/// Do you want users of this account to access resources via VPN in the transit stack? You need to instantiate the TransitToCROatxVpcRoute and CROatxToTransitVpcRoute  
/// Do you want users/resources in this account to be able to route into the research vpc and vice versa? You need to instantiate ResearchToCROatxVpcRoute and CROatxToResearchVpcRoute  
/// Do you want users/resources of this account need to communicate with the domain controller in the identity stack? You need to instantiate IdentityToCROatxVpcRoute and CROatxToIdentityVpcRoute  

// Example:  
const CROatxToTransitVpcRoute = new VpcRouteTableTransitRouteStack(app,'CROatxToTransitVpcRoute', {  
  env: envCROatx,   destinationCidr: envTransit.desiredVpcCidr,   targetVpc: CROatxAccount.Vpc });  
const TransitToCROatxVpcRoute = new VpcRouteTableTransitRouteStack(app,'TransitToCROatxVpcRoute', {  
  env: envTransit,   destinationCidr: envCROatx.desiredVpcCidr,   targetVpc: transitAccount.vpc });  

const CROatxToIdentityVpcRoute = new VpcRouteTableTransitRouteStack(app,'CROatxToIdentityVpcRoute', {  
  env: envCROatx,   destinationCidr: envIdentity.desiredVpcCidr,   targetVpc: CROatxAccount.Vpc });  
const IdentityToCROatxVpcRoute = new VpcRouteTableTransitRouteStack(app,'IdentityToCROatxVpcRoute', {  
  env: envIdentity,   destinationCidr: envCROatx.desiredVpcCidr,   targetVpc: identityAccount.Vpc });  

const CROatxToResearchVpcRoute = new VpcRouteTableTransitRouteStack(app,'CROatxToResearchVpcRoute', {  
  env: envCROatx,   destinationCidr: envResearch.desiredVpcCidr,   targetVpc: CROatxAccount.Vpc });    
const ResearchToCROatxVpcRoute = new VpcRouteTableTransitRouteStack(app,'ResearchToCROatxVpcRoute', {  
  env: envResearch,   destinationCidr: envCROatx.desiredVpcCidr,   targetVpc: researchAccount.Vpc });    

const CROatxTransitEnrolledAccountStack = new TransitEnrolledAccount(app,'CROatxTransitEnrolledAccountStack', {  
  env: envTransit,  
  AccountDescription: "CROatx",  
  AccountToEnrollVpcCidr: envCROatx.desiredVpcCidr,  
  targetVpcTransitSecretsArn: app.node.tryGetContext("CROatxTgAttachmentSecretArn"),  
  transitVPCRouteTableSecretsArn: app.node.tryGetContext("transitGatewayRouteTableSecretArn"),  
  targetVPCCidrRangeSecretsArn: app.node.tryGetContext("CROatxVpcCidrSecretArn")  
});  

/// END -  Example of how to onboard an additional account into the Blueprint  
/////////////////////////////////////////
```

Save this file.   

Now, open up the file `biotechblueprint\deployBiotechBlueprint.sh `and scroll down to the bottom.  

You will see another example section where you can uncomment the commands and find/replace the CROatx   

```
#########################################################  
### Example of how to onboard an additional account into the Blueprint  
### ...  

CROatxAcctId="$(aws sts get-caller-identity --profile CROatx --query "Account" --output text)"  
jq '.context.envCROatxAccountId = $accountID' --arg accountID $CROatxAcctId cdk.json > tmp.$.json && mv tmp.$.json cdk.json  
cdk deploy CROatxAccountStack --context transitGatewaySecretArn=$transitGatewayIdSecretArn --profile CROatx  

CROatxGatewayAttachment="$(aws secretsmanager get-secret-value --secret-id ga --profile CROatx | grep -Po 'tgw-attach-.{17}')"  
aws secretsmanager put-secret-value --secret-id ga --secret-string $CROatxGatewayAttachment --profile CROatx  
CROatxTgAttachmentSecretArn="$(aws secretsmanager get-secret-value --secret-id ga --profile CROatx | grep -Po 'arn:aws:secretsmanager.*ga')"  
CROatxVpcCidr="$(aws secretsmanager get-secret-value --secret-id vc --profile CROatx | grep -Po '[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/..')"  
aws secretsmanager put-secret-value --secret-id vc --secret-string $CROatxVpcCidr --profile CROatx  
CROatxVpcCidrSecretArn="$(aws secretsmanager get-secret-value --secret-id vc --profile CROatx | grep -Po 'arn:aws:secretsmanager.*vc')"  

cdk deploy CROatxToTransitVpcRoute CROatxToIdentityVpcRoute CROatxToResearchVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile CROatx   

cdk deploy ResearchToCROatxVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile research       

cdk deploy IdentityToCROatxVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile master   

cdk deploy TransitToCROatxVpcRoute \  
    --context transitGatewaySecretArn=$transitGatewayIdSecretArn \  
    --profile transit       

cdk deploy CROatxTransitEnrolledAccountStack \  
    --context identityAccountAdConnectorSecretArn=$identityAccountAdConnectorSecretArn \  
    --context identityAccountAdConnectorSecretKeyArn=$identityAccountAdConnectorSecretKeyArn \  
    --context transitGatewayRouteTableSecretArn=$transitGatewayRouteTableSecretArn \  
    --context CROatxTgAttachmentSecretArn=$CROatxTgAttachmentSecretArn \  
    --context CROatxVpcCidrSecretArn=$CROatxVpcCidrSecretArn \  
    --profile transit
```
Save this file.   

Run the following command to deploy the new changes:  

`./deployBiotechBlueprint.sh`  

Output should look like this once its complete.   

![](https://devspacepaul.s3-us-west-2.amazonaws.com/bbma/docs/images/EcZX-0rYcM5ctbihLe4RBg.png)

All done! Your existing account is now enrolled into the Blueprint.
