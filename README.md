# How to Run Locally

## Commands

```bash
git clone https://github.com/sedhha/policy_mate
cd policy_mate
```

Make sure you setup your admin CLI profile with the required permissions to create resources in your AWS account.

Create a `.env` file in lambdas folder and `.env` file in policy_mate_ui folder.

Structure should look like this (some ignored folders might be missing):

```bash
.
├── PROJECT_STORY.md
├── README.md
├── README_OLD.md
├── WhiteBoard.md
├── backup
│   ├── compliance_controls_data.json
│   ├── data.json
│   └── mapping.json
├── docker-compose.yml
├── docs
│   ├── 01-user-experience-layer.mmd
│   ├── 02-security-api-layer.mmd
│   ├── 03-ai-processing-layer.mmd
│   ├── 04-data-storage-layer.mmd
│   ├── 05-document-lifecycle-sequence.mmd
│   ├── HowToRunLocally.md
│   ├── OpenSearchMigration.md
│   ├── architecture-diagram.mmd
│   ├── devpost-pitch.md
│   └── v2
├── lambdas
│   ├── README.md
│   ├── agent.py
│   ├── agent_handler.py
│   ├── agent_v2_handler.py
│   ├── annotations_agent_handler.py
│   ├── auth_claims_handler.py
│   ├── auth_claims_handler.zip
│   ├── bedrock_minimal
│   ├── build
│   ├── compliance_check_handler.py
│   ├── comprehensive_check_handler.py
│   ├── conversation_history_handler.py
│   ├── deploy_agent.py
│   ├── dist
│   ├── doc_status_handler.py
│   ├── file_confirmation_handler.py
│   ├── file_confirmation_handler.zip
│   ├── file_upload_handler.py
│   ├── file_upload_handler.zip
│   ├── meta
│   ├── polling_handler.py
│   ├── pre
│   ├── publish_to_s3.sh
│   ├── pyproject.toml
│   ├── schemas
│   ├── secrets.json
│   ├── show_doc_handler.py
│   ├── src
│   ├── test_agent.py
│   ├── test_get_agent_prompt.py
│   ├── test_local.py
│   ├── test_show_doc.py
│   ├── tests
│   └── uv.lock
├── policy_mate_ui
│   ├── README.md
│   ├── biome.json
│   ├── docs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── node_modules
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── postcss.config.mjs
│   ├── public
│   ├── src
│   ├── tsconfig.json
│   └── tsconfig.tsbuildinfo
└── scripts
    ├── backup-opensearch.sh
    ├── opensearch-local.sh
    ├── restore-opensearch.sh
    ├── setup_aws.sh
    ├── terraform
    ├── terraform.tfstate
    └── upgrade-opensearch.sh
```

Content of `.env` file in lambdas directory:

```bash
# Root directory
ENV_AWS_REGION=us-east-1
COGNITO_USER_POOL_ID='DUMMY_VALUE_BEFORE_IAC'
COGNITO_CLIENT_ID='DUMMY_VALUE_BEFORE_IAC'
S3_BUCKET_NAME='policymate-dev-3e53'
```

```bash
# policy_mate_ui directory
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_CLIENT_ID='DUMMY_VALUE_BEFORE_IAC'
NEXT_PUBLIC_COGNITO_USER_POOL_ID='DUMMY_VALUE_BEFORE_IAC'
NEXT_PUBLIC_API_BASE_URL='http://localhost:8080/invocations'
NEXT_PUBLIC_LONG_API_BASE_URL='http://localhost:8080/invocations'
NEXT_PUBLIC_AWS_GATEWAY_URL='<DUMMY_VALUE_BEFORE_IAC>'
NEXT_AWS_ACCESS_KEY_ID='ACTUAL_AWS_PROFILE_ACCESS_KEY_ID'
NEXT_AWS_SECRET_ACCESS_KEY='ACTUAL_AWS_PROFILE_SECRET_ACCESS_KEY'
S3_BUCKET_NAME='DUMMY_BUCKET_NAME_BEFORE_IAC'
PDF_URL_EXPIRY_SECONDS=300
```

These two variables must be exported:

```bash
export AWS_PROFILE=policy-mate # Or whichever profile you want to use which should have the required permissions
export AWS_REGION=us-east-1
terraform init # Terraform is needed for this project to work and setup up infrastructure
```

Setup IAC: (Make sure you have terraform installed. We're using terraform to setup the required AWS resources)

````bash
cd scripts
```bash
export AWS_PROFILE=policy-mate # Or whichever profile you want to use which should have the required permissions
export AWS_REGION=us-east-1
terraform init # Terraform is needed for this project to work and setup up infrastructure
````

```bash
cd scripts
chmod +x ./setup_aws.sh
./setup_aws.sh
```

Once confirmed this will output variables like this:

```bash
Outputs:

Apply complete! Resources: 4 added, 4 changed, 4 destroyed.

Outputs:
api_gateway_urls = {
  "auth_claims_handler" = "https://66eub6nitl.execute-api.us-east-1.amazonaws.com/dev/api/verify"
  "file_confirmation_handler" = "https://66eub6nitl.execute-api.us-east-1.amazonaws.com/dev/api/uploads"
  "file_upload_handler" = "https://66eub6nitl.execute-api.us-east-1.amazonaws.com/dev/api/uploads"
}
cognito_client_id = "723cpt2otr4u5k2lml0j40gvjp"
cognito_pool_id = "us-east-1_bAHGXZpFO"
s3_bucket_arn = "arn:aws:s3:::policymate-dev-3f53"
s3_bucket_domain_name = "policymate-dev-3f53.s3.amazonaws.com"
s3_bucket_name = "policymate-dev-3f53"
✅ Deployment complete!
(policy-mate-lambda) ➜  scripts git:(main) ✗
(policy-mate-lambda) ➜  scripts git:(main) ✗
```

Change FE and BE `.env` files with the actual values from above output.

From above, we need to populate our `.env` file in the root directory:

# Running Backend

```bash
# Agent Core Runtime Requirments
ENV_AWS_REGION=us-east-1
COGNITO_USER_POOL_ID='us-east-1_bAHGXZpFO'
COGNITO_CLIENT_ID='723cpt2otr4u5k2lml0j40gvjp'
S3_BUCKET_NAME='policymate-dev-3f53'
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

Setup `.env.local` file in `policy_mate_ui` directory as per iac output again.

`NEXT_PUBLIC_AWS_GATEWAY_URL` will be `https://66eub6nitl.execute-api.us-east-1.amazonaws.com/dev/api` in this case.

```bash
NEXT_PUBLIC_AWS_REGION=us-east-1 # or the one you used with aws profile
NEXT_PUBLIC_COGNITO_CLIENT_ID='COMES_FROM_IAC_OUTPUT'
NEXT_PUBLIC_COGNITO_USER_POOL_ID='COMES_FROM_IAC_OUTPUT'
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

Now run the UI:

```bash
pnpm dev
```

UI should appear in `http://localhost:3000` and backend terminal should be running on `http://localhost:8080/invocations`.

Now we can interact with UI :)
