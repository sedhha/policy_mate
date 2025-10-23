# How to Run Locally

After unzipping the file:

Make sure you setup your admin CLI profile with the required permissions to create resources in your AWS account.

These two variables must be exported:

```bash
export AWS_PROFILE=policy-mate # Or whichever profile you want to use which should have the required permissions
export AWS_REGION=us-east-1
```

Setup IAC: (Make sure you have terraform installed. We're using terraform to setup the required AWS resources)

```bash
cd scripts
chmod +x ./setup_aws.sh
./setup_aws.sh
```

Once confirmed this will output variables like this:

```bash
Outputs:

cognito_client_id = "<COGNITO_CLIENT_ID>"
cognito_pool_id = "<COGNITO_POOL_ID>"
```

Just copy those values and update your `.env.local` file in the `policy_mate_ui` folder with those values.

`cd policy_mate-main` (This will be our root directory for the rest of the instructions - you can open your editor here if required.)
`cd policy_mate_ui`
`pnpm install`
`pnpm dev`
