# Step 0 in detail: set up AWS on your laptop (about 20 minutes)

You only need AWS right now. Google Cloud can wait until the 1:30 mark.

## 0.1 Set a spending alarm first (2 minutes)

1. In the AWS console, search **Budgets** and open it, then click **Create budget**.
2. Pick **Use a template** and choose **Zero spend budget**. Enter your email and create it.

AWS emails you the moment anything costs money. This project should stay at or near $0.

## 0.2 Create a login for the command line (5 minutes)

Don't use your root (sign-up) login from the command line. Make an IAM user instead:

1. Search **IAM** and open it. Go to **Users** and click **Create user**.
2. User name: `capstone-admin`. Leave console access unticked. Click **Next**.
3. Choose **Attach policies directly**, tick **AdministratorAccess**, then click **Next** and **Create user**.
4. Click the new user, open the **Security credentials** tab and click **Create access key**.
5. Choose **Command Line Interface (CLI)**, tick the confirmation box, then click **Next** and **Create access key**.
6. Click **Download .csv file**. You get the Access key ID and Secret access key, and the secret is shown only once. Never put these in your slides or on GitHub.

## 0.3 Install three tools (10 minutes)

**Windows**
- **Git for Windows** from git-scm.com. This gives you **Git Bash**, which runs the project's `.sh` scripts. Use Git Bash for every command below.
- **AWS CLI v2:** download and run https://awscli.amazonaws.com/AWSCLIV2.msi
- (SAM CLI not needed: deploy.sh uses only the AWS CLI.)
- Close and reopen Git Bash after installing so it finds the new tools.

**Mac**
- AWS CLI: download and run https://awscli.amazonaws.com/AWSCLIV2.pkg
- SAM CLI: `brew install aws-sam-cli` (or the macOS installer from the AWS SAM docs)

**Linux**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip && unzip awscliv2.zip && sudo ./aws/install
curl -L https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip -o sam.zip \
  && unzip sam.zip -d sam-installation && sudo ./sam-installation/install
```

Check that both work:
```bash
aws --version     # aws-cli/2.x ...
sam --version     # SAM CLI, version 1.x ...
```

You don't need Python or Docker on the laptop. The deploy script skips `sam build`.

## 0.4 Connect the CLI to your account (2 minutes)

```bash
aws configure
```
Answer the four prompts:
```
AWS Access Key ID:      <from the .csv>
AWS Secret Access Key:  <from the .csv>
Default region name:    ap-south-1
Default output format:  json
```
Check that it worked:
```bash
aws sts get-caller-identity       # prints your account number and .../capstone-admin
```

## 0.5 Make the shared API token (1 minute)

Your laptop, the Pi and both clouds must all use the same token. In Git Bash or a terminal:
```bash
export API_TOKEN=$(openssl rand -hex 16)
echo $API_TOKEN
```
Copy the printed value into a note. **Every new terminal** needs `export API_TOKEN=<that value>` again before you run a deploy script.

## 0.6 Unzip the project

Unzip `capstone.zip` somewhere simple, such as your Desktop. Then:
```bash
cd ~/Desktop/capstone/cloud/aws
./deploy.sh
```
That is step 3 of the README. It takes about 3 to 5 minutes and ends by printing **ApiUrl**. Save that URL, because the Pi and the dashboard need it.

## If something goes wrong

| Error | Fix |
|---|---|
| `aws: command not found` / `sam: command not found` | Close and reopen the terminal. On Windows, use Git Bash, not the old Command Prompt. |
| `Unable to locate credentials` | Run `aws configure` again. |
| `InvalidClientTokenId` | The access key was mistyped. Create a new key and run `aws configure` again. |
| `set API_TOKEN` error from deploy.sh | You opened a new terminal. Run `export API_TOKEN=...` again. |
| `permission denied: ./deploy.sh` | Run `bash deploy.sh` instead. |
| Stack shows `ROLLBACK_COMPLETE` | Run `aws cloudformation delete-stack --stack-name capstone-workflow --region ap-south-1`, wait a minute, then run deploy.sh again. Paste the error into the project thread. |
