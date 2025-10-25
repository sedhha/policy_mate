# How to Run Locally

After unzipping the file (please make sure to take terraform files from main branch. I am making these changes after the hack, so you may not have terraform files in the zip you downloaded).

This is just one inconvenience. Sorry about that :)

Make sure you setup your admin CLI profile with the required permissions to create resources in your AWS account.

Dummy `.env` files should be added in root directory and `policy_mate_ui` directory.
These need to be updated after running the setup script.

```bash
# Root directory
ENV_AWS_REGION=us-east-1
COGNITO_USER_POOL_ID='us-east-1_bAHGAZpFO'
COGNITO_CLIENT_ID='723cpt2otr4u5k2lml0j30gvjp'
S3_BUCKET_NAME='policymate-dev-3e53'
```

```bash
# policy_mate_ui directory
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_CLIENT_ID='723cpt2otr4u5k2lml0j30gvjp'
NEXT_PUBLIC_COGNITO_USER_POOL_ID='us-east-1_bAHGAZpFO'
NEXT_PUBLIC_API_BASE_URL='http://localhost:8080/invocations'
NEXT_PUBLIC_LONG_API_BASE_URL='http://localhost:8080/invocations'
NEXT_AWS_ACCESS_KEY_ID=your_access_key_id # Your access key credentials thats stored under profile
NEXT_AWS_SECRET_ACCESS_KEY=your_secret_access_key # Your AWS secret access key stored under profile
S3_BUCKET_NAME='policymate-dev-3e53'
PDF_URL_EXPIRY_SECONDS=300
```

These two variables must be exported:

```bash
export AWS_PROFILE=policy-mate # Or whichever profile you want to use which should have the required permissions
export AWS_REGION=us-east-1
terraform init # Terraform is needed for this project to work and setup up infrastructure
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

cognito_client_id = "723cpt2otr4u5k2lml0j30gvjp"
cognito_pool_id = "us-east-1_bAHGAZpFO"
s3_bucket_arn = "arn:aws:s3:::policymate-dev-3e53"
s3_bucket_domain_name = "policymate-dev-3e53.s3.amazonaws.com"
s3_bucket_name = "policymate-dev-3e53"
✅ Deployment complete!
```

From above, we need to populate our `.env` file in the root directory:

# Running Backend

```bash
# Agent Core Runtime Requirments
ENV_AWS_REGION=us-east-1
COGNITO_USER_POOL_ID='us-east-1_bAHGAZpFO'
COGNITO_CLIENT_ID='723cpt2otr4u5k2lml0j30gvjp'
S3_BUCKET_NAME='policymate-dev-3e53'
```

```bash
export AWS_REGION='us-east-1' # OR the region which you used to perform the setup
export AWS_PROFILE='policy-mate' # OR the profile which you used to perform the setup
cd lambdas
uv sync
uv run deploy_agent.py
```

## Testing CURL

```bash
➜  policy_mate source /home/shivamsahil/projects/2025/oct/policy_mate/lambdas/.venv/bin/activate
(policy-mate-lambda) ➜  policy_mate git:(main) ✗ curl --location 'http://localhost:8080/invocations' \
--header 'Content-Type: application/json' \
--data '{"prompt":"What can you do?"}'
{"session_id": "019a1501-d40d-7f3f-8a2d-421fb9f50365", "error_message": "", "tool_payload": {}, "summarised_markdown": "# 🎯 Compliance Assistant Capabilities\n\n## 📄 Document Analysis\n- **List Documents** - Retrieve all documents for a user\n- **Check Compliance Status** - View current analysis state of any document\n- **Run Framework Analysis** - Analyze documents against GDPR, SOC2, or HIPAA frameworks\n- **Analyze Text Snippets** - Check specific text passages for compliance issues\n- **View Framework Controls** - List all controls for a specific compliance framework\n\n## 📌 Annotation Management\n- **View Annotations** - Display all annotations and bookmarks for documents\n- **Update Status** - Mark annotations as resolved or unresolved\n- **Manage Comments** - Add, edit, or delete annotation details\n- **Start Conversations** - Begin discussion threads on specific annotations\n- **Delete Annotations** - Remove annotations when no longer needed\n- **View Threads** - Access conversation history on annotations\n\n## ✍️ Document Drafting\n- **Draft Compliance Documents** - Create professional templates for:\n  - Privacy policies\n  - Security policies\n  - Data retention policies\n  - Incident response plans\n  - Data processing agreements\n  - Business continuity plans\n  - Acceptable use policies\n  - Access control policies\n  - Custom compliance documents\n- **Refine Existing Policies** - Improve and align documents with frameworks\n- **Framework Alignment** - Ensure compliance with GDPR, SOC2, HIPAA, ISO27001, NIST, or general standards\n- **Customizable Content** - Add product/service context and specific requirements\n\n## 🔄 How to Use\n\nSimply describe what you need:\n- \"List my documents\"\n- \"Run GDPR analysis on document [id]\"\n- \"Show annotations for document [id]\"\n- \"Draft a HIPAA-compliant privacy policy\"\n- \"Check compliance status of document [id]\"\n- \"Start a conversation on annotation [id]\"", "suggested_next_actions": [{"action": "list_documents", "description": "Get started by listing your uploaded documents - provide your user ID to see all documents"}, {"action": "draft_policy", "description": "Create a new compliance document - specify document type (e.g., privacy policy), framework (GDPR/SOC2/HIPAA), and any context about your product"}, {"action": "explore_frameworks", "description": "Learn about compliance requirements - ask me to list all controls for any framework (GDPR, SOC2, or HIPAA)"}]}%
```

### Test 2:

```bash
curl --location 'http://localhost:8080/invocations' \
--header 'Content-Type: application/json' \
--data-raw '{
    "prompt": "List all my documents.\n\nfor the user - [user_email=activity.schoolsh2@gmail.com] [user_id=b4d8b4d8-1031-705e-a4a8-849522fb20b1]"}'
```

## Moving to UI Setup

```bash
# First go to root directory
(policy-mate-lambda) ➜  policy_mate git:(main) ✗ cd policy_mate_ui
(policy-mate-lambda) ➜  policy_mate_ui git:(main) ✗ pnpm install
Lockfile is up to date, resolution step is skipped
Packages: +384
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 384, reused 384, downloaded 0, added 384, done

dependencies:
+ @aws-sdk/client-cognito-identity-provider 3.907.0
+ @aws-sdk/client-dynamodb 3.914.0
+ @aws-sdk/client-lambda 3.914.0
+ @aws-sdk/client-s3 3.913.0
+ @aws-sdk/s3-request-presigner 3.913.0
+ @aws-sdk/util-dynamodb 3.914.0
+ highlight.js 11.11.1
+ jwt-decode 4.0.0
+ katex 0.16.25
+ lucide-react 0.545.0
+ next 15.5.4
+ pdfjs-dist 5.4.296
+ react 19.1.0
+ react-dom 19.1.0
+ react-markdown 10.1.0
+ react-pdf 10.2.0
+ rehype-highlight 7.0.2
+ rehype-katex 7.0.1
+ rehype-stringify 10.0.1
+ remark-gfm 4.0.1
+ remark-math 6.0.0
+ remark-parse 11.0.0
+ remark-rehype 11.1.2
+ unified 11.0.5
+ zod 4.1.12
+ zustand 5.0.8

devDependencies:
+ @biomejs/biome 2.2.0
+ @tailwindcss/postcss 4.1.14
+ @types/node 20.19.19
+ @types/react 19.2.0
+ @types/react-dom 19.2.0
+ tailwindcss 4.1.14
+ typescript 5.9.3

╭ Warning ───────────────────────────────────────────────────────────────────────────────────╮
│                                                                                            │
│   Ignored build scripts: @tailwindcss/oxide, sharp.                                        │
│   Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.   │
│                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────╯

Done in 2s using pnpm v10.11.1
(policy-mate-lambda) ➜  policy_mate_ui git:(main) ✗
```

Setup `.env.local` file in `policy_mate_ui` directory:

```bash
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_CLIENT_ID='723cpt2otr4u5k2lml0j30gvjp'
NEXT_PUBLIC_COGNITO_USER_POOL_ID='us-east-1_bAHGAZpFO'
NEXT_PUBLIC_API_BASE_URL='http://localhost:8080/invocations'
NEXT_PUBLIC_LONG_API_BASE_URL='http://localhost:8080/invocations'
NEXT_AWS_ACCESS_KEY_ID=your_access_key_id # Your access key credentials thats stored under profile
NEXT_AWS_SECRET_ACCESS_KEY=your_secret_access_key # Your AWS secret access key stored under profile
S3_BUCKET_NAME='policymate-dev-3e53'
PDF_URL_EXPIRY_SECONDS=300
```

After adding `.env.local` file, your tree should look something like this from root directory:

```bash
├── policy_mate_ui
│   ├── .env.local
│   ├── .gitignore
│   ├── .npmrc
│   ├── .vercel
│   ├── README.md
│   ├── biome.json
│   ├── docs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── postcss.config.mjs
│   ├── public
│   ├── src
│   ├── tsconfig.json
│   └── tsconfig.tsbuildinfo
```
