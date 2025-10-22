# Policy Mate: AI-Powered Compliance Co-Pilot

**Policy Mate** is an AWS Bedrock-powered agentic compliance platform that helps organizations analyze policies, detect gaps, and stay ahead of frameworks like **GDPR**, **SOC2**, and **HIPAA**.

[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock-orange)](https://aws.amazon.com/bedrock/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)

## 🚀 What it Does

Upload any compliance document—we analyze it against GDPR, SOC2, or HIPAA in **minutes, not weeks**. Our multi-agent AI system automatically:

### 📄 Intelligent Document Analysis

- Breaks documents into semantic chunks while preserving context
- Identifies compliance gaps, violations, and risk areas
- Generates framework-specific annotations with severity ratings
- Caches results for instant re-access (with force re-analysis option)

### 🎯 Smart Annotations

- Auto-categorizes findings: `verify`, `review`, `info`, or `action_required`
- Highlights exact problematic text with regulatory context
- Provides actionable recommendations aligned with framework controls
- Supports filtering by framework, severity, or resolution status

### 💬 Dual Exploration Modes

**Interactive Mode**: Visual document interface where you highlight text for instant phrase-wise analysis, manage annotations, and see AI recommendations in context

**Chat Window**: Conversational AI that answers questions like "What are the highest-risk GDPR violations?" or "Analyze the data retention section again"

### ⚡ Performance Optimization

- Hash-based deduplication prevents redundant processing
- Pre-signed S3 URLs for secure, direct uploads
- Intelligent caching delivers instant responses on repeat queries
- Real-time status tracking (uploading → analyzing → analyzed)

---

## 🏗️ Architecture Overview

Policy Mate follows a **serverless, multi-agent architecture** built on AWS services with Next.js 15 frontend.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Next.js 15)              │
│  - Dashboard (File List + Upload)                           │
│  - Chat Interface (AI Conversation)                         │
│  - Interactive Mode (Live Annotations)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐          ┌───────▼────────┐
│  Next.js API   │          │  Web URL Config│
│  Routes (Proxy)│          │  bedrock_handler│
└───────┬────────┘          └───────┬────────┘
        │                           │
        │         ┌─────────────────┴──────────────┐
        │         │                                 │
┌───────▼─────────▼──────┐              ┌──────────▼─────────┐
│   API Gateway          │              │  agent_v2_handler  │
│   Lambda Triggers      │              │  (Supervisor Agent)│
└────────┬───────────────┘              └──────────┬─────────┘
         │                                         │
         │                              ┌──────────┴─────────┐
         │                              │                    │
         │                    ┌─────────▼───────┐  ┌────────▼────────┐
         │                    │ Compliance Agent│  │Annotations Agent│
         │                    └─────────┬───────┘  └────────┬────────┘
         │                              │                    │
         │                              └──────────┬─────────┘
         │                                         │
┌────────▼─────────────────────────────────────────▼────────┐
│              AWS Bedrock (Claude Haiku/Sonnet)            │
│              Strands + AgentCore Framework                │
└────────┬──────────────────────────────────────────────────┘
         │
┌────────▼─────────────────────┐
│   Data Storage Layer         │
│   - DynamoDB (6 tables)      │
│   - S3 (Documents)           │
│   - Inference Cache          │
└──────────────────────────────┘
```

📊 **See Interactive Architecture**: Visit `/architecture` page or explore [`docs/v2/`](docs/v2/) for detailed Mermaid diagrams.

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand (authStore + agentStore)
- **PDF Rendering**: PDF.js with custom worker configuration
- **Linting**: Biome (fast Rust-based tooling)
- **Authentication**: AWS Cognito SDK

### Backend

- **Runtime**: AWS Lambda (Python 3.12)
- **AI Framework**: Strands + Bedrock AgentCore
- **LLM**: Anthropic Claude (Haiku for speed, Sonnet for reasoning)
- **Package Manager**: `uv` (faster than pip/poetry)
- **Deployment**: Custom shell scripts with MD5 caching

### Data Storage

- **Database**: DynamoDB (6 tables)
- **Object Storage**: S3 (pre-signed URL uploads)
- **Vector Search**: OpenSearch _(deprecated in current MVP)_
- **Cache**: DynamoDB-based inference cache

### AWS Services

- **Compute**: Lambda, API Gateway, Web URL Config
- **AI**: AWS Bedrock (Claude 3 Haiku & Sonnet)
- **Auth**: Cognito User Pools (JWT tokens)
- **Storage**: S3, DynamoDB
- **Monitoring**: CloudWatch Logs

---

## 🚦 Quick Start

### Prerequisites

- **Node.js** 20+ and **pnpm** 10.18+
- **Python** 3.12 and **uv** package manager
- **AWS CLI** configured with credentials
- **AWS Account** with Bedrock access (Claude models enabled)

### 1. Install uv (Python Package Manager)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region (e.g., us-east-1)
```

### 3. Backend Setup (Lambda Functions)

```bash
cd lambdas

# Install dependencies
uv pip install --python 3.12 .

# Configure environment
cp .env.example .env
# Edit .env with your AWS settings

# Optional: Start local OpenSearch for testing
../scripts/opensearch-local.sh start
uv run python pre/load_indexing.py
uv run python pre/load_embeddings.py

# Test locally
uv run python test_agent.py

# Deploy to AWS
./deploy.sh
```

### 4. Frontend Setup (Next.js)

```bash
cd policy_mate_ui

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with AWS Cognito + API endpoints

# Run development server
pnpm dev
# Open http://localhost:3000
```

### 5. AWS Cognito Setup

Create a Cognito User Pool:

```bash
aws cognito-idp create-user-pool \
  --pool-name policy-mate-users \
  --auto-verified-attributes email \
  --policies '{"PasswordPolicy":{"MinimumLength":8}}'

# Create app client
aws cognito-idp create-user-pool-client \
  --user-pool-id <your-pool-id> \
  --client-name policy-mate-web \
  --no-generate-secret
```

Update `.env.local` with the pool ID and client ID from above commands.

---

## 📂 Project Structure

```
policy_mate/
├── lambdas/                      # Backend AWS Lambda handlers
│   ├── agent_v2_handler.py       # Supervisor agent (Web URL Config)
│   ├── file_upload_handler.py    # Pre-signed S3 URLs + deduplication
│   ├── file_confirmation_handler.py
│   ├── doc_status_handler.py
│   ├── annotations_agent_handler.py
│   ├── conversation_history_handler.py
│   ├── deploy.sh                 # Multi-handler deployment script
│   ├── src/
│   │   ├── agents/               # Agent implementations
│   │   │   ├── supervisor_agent.py
│   │   │   ├── compliance_agent.py
│   │   │   ├── annotations_agent.py
│   │   │   └── v2/prompts.py     # Agent system prompts
│   │   ├── tools/                # Reusable tool functions
│   │   └── utils/                # Shared utilities
│   └── pyproject.toml            # Python dependencies (uv)
│
├── policy_mate_ui/               # Next.js 15 frontend
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/        # File list + upload
│   │   │   ├── chat/             # AI conversation
│   │   │   ├── analyse/          # Interactive annotations
│   │   │   └── api/              # API routes (CORS proxy)
│   │   ├── components/           # React components
│   │   ├── stores/               # Zustand state management
│   │   └── utils/                # API clients, Cognito SDK
│   ├── biome.json                # Linting config
│   └── package.json              # Node dependencies (pnpm)
│
├── docs/                         # Documentation
│   └── v2/                       # Architecture diagrams (Mermaid)
│       ├── system-overview.mmd
│       ├── frontend-architecture.mmd
│       ├── backend-lambda-architecture.mmd
│       ├── agent-orchestration.mmd
│       ├── upload-to-analysis-flow.mmd
│       ├── data-storage-architecture.mmd
│       └── authentication-flow.mmd
│
├── scripts/                      # Utility scripts
│   ├── opensearch-local.sh       # Docker OpenSearch (dev)
│   └── ...
│
└── backup/                       # Reference data
    └── compliance_controls_data.json
```

---

## 🧠 Multi-Agent System

Policy Mate uses the **Tool-Agent Pattern** with a supervisor coordinating specialized child agents.

### Agent Hierarchy

```
Supervisor Agent (agent_v2_handler)
├── Compliance Agent
│   ├── list_docs(user_id)
│   ├── doc_status(document_id)
│   ├── comprehensive_check(document_id, framework_id)
│   ├── phrase_wise_compliance_check(text, question, framework_id)
│   └── list_controls(framework_id)
│
├── Annotations Agent
│   ├── load_annotations(document_id, framework_id, include_resolved)
│   ├── update_annotation_status(annotation_id, resolved)
│   ├── update_annotation_details(annotation_id, bookmark_type, comments)
│   ├── remove_annotation(annotation_id)
│   ├── start_annotation_conversation(annotation_id, message)
│   ├── add_conversation_message(session_id, message, role)
│   └── get_annotation_conversation(annotation_id)
│
└── Drafting Agent (Sub-agent of Compliance)
    └── document_drafting_assistant(doc_type, framework, context)
```

### Response Format (Standardized)

All agents return JSON with this structure:

```json
{
  "session_id": "uuid | null",
  "error_message": "",
  "tool_payload": {
    "...": "Exact raw tool response - NO MODIFICATIONS"
  },
  "summarised_markdown": "## User-friendly summary\n\n...",
  "suggested_next_actions": [
    {
      "action": "analyze_gdpr",
      "description": "Run GDPR analysis on document abc-123"
    }
  ]
}
```

**See detailed agent flows**: [`docs/v2/agent-orchestration.mmd`](docs/v2/agent-orchestration.mmd)

---

## 💾 Data Architecture

### DynamoDB Tables

| Table                    | Primary Key                     | Purpose                         | GSI         |
| ------------------------ | ------------------------------- | ------------------------------- | ----------- |
| **Files**                | file_id                         | Document metadata, status, hash | -           |
| **User_Files**           | user_id, file_id                | User-document access mapping    | -           |
| **Annotations**          | annotation_id                   | AI-generated compliance issues  | document_id |
| **Inference_Cache**      | cache_key (doc_id#framework_id) | Cached analysis results         | -           |
| **Compliance_Controls**  | framework_id, control_id        | GDPR/SOC2/HIPAA requirements    | -           |
| **Conversation_History** | session_id, timestamp           | Chat + annotation discussions   | -           |

### S3 Bucket Structure

```
s3://policy-mate-bucket/
├── standard-docs/
│   ├── public/gdpr/...          # Public regulatory docs
│   └── <org_id>/custom_gdpr/... # Org-specific docs
└── manual-docs/<org_id>/...     # User-uploaded documents
```

**See detailed storage schema**: [`docs/v2/data-storage-architecture.mmd`](docs/v2/data-storage-architecture.mmd)

---

## 🔐 Authentication Flow

1. **User Registration**: `/register` → AWS Cognito → Email verification
2. **Login**: `/login` → Cognito → JWT ID token → `authStore` (sessionStorage)
3. **API Request**: Include `Authorization: Bearer <token>` header
4. **Lambda Validation**: `@require_cognito_auth` decorator validates JWT
5. **Protected Routes**: `LayoutWrapper` checks token before rendering pages

**See full auth sequence**: [`docs/v2/authentication-flow.mmd`](docs/v2/authentication-flow.mmd)

---

## 📊 Upload to Analysis Flow

```
1. User uploads file → file_upload_handler
2. Check hash in DynamoDB (deduplication)
   - Exists → Return existing file_id
   - New → Generate pre-signed S3 URL
3. Frontend uploads directly to S3 (15-min URL)
4. file_confirmation_handler updates status: "uploaded"
5. User requests analysis → agent_v2_handler
6. Supervisor routes to Compliance Agent
7. comprehensive_check_tool:
   - Check cache (doc_id#framework_id)
   - If miss: Parse PDF → Chunk → Analyze with Bedrock
   - Generate annotations → Store in DynamoDB
   - Cache result
8. Return JSON response with annotations
9. Frontend renders:
   - 🔴 3 critical issues
   - ⚠️ 5 warnings
   - 📋 2 reviews needed
```

**See full sequence diagram**: [`docs/v2/upload-to-analysis-flow.mmd`](docs/v2/upload-to-analysis-flow.mmd)

---

## 🛠️ Development Workflow

### Local Development

```bash
# Terminal 1: Backend testing
cd lambdas
uv run python test_agent.py

# Terminal 2: Frontend
cd policy_mate_ui
pnpm dev

# Terminal 3: OpenSearch (optional)
./scripts/opensearch-local.sh start
```

### Deployment

**Lambda Functions:**

```bash
cd lambdas

# Deploy all changed handlers (MD5 caching)
./deploy.sh

# Force redeploy all
./deploy.sh --force

# Deploy specific handler
./deploy.sh --handler agent_v2_handler

# For large handlers (>50MB unzipped)
./create_handler_zip.sh --handler annotations_agent --with-env
```

**Frontend (Vercel):**

```bash
cd policy_mate_ui
pnpm build
vercel deploy --prod
```

### Testing

```bash
# Test supervisor agent
cd lambdas
uv run python test_agent.py

# Test individual tools
uv run python test_local.py

# Frontend linting
cd policy_mate_ui
pnpm lint     # Check
pnpm format   # Fix with Biome
```

---

## 🚧 Known Limitations & Future Work

### Current MVP Limitations

- ❌ **No SQS Auto-Analysis**: Documents not auto-analyzed on upload (manual trigger)
- ❌ **Supervisor Routing Unstable**: Direct agent calls from frontend instead of smart routing
- ❌ **OpenSearch Unused**: Vector search not integrated in MVP
- ⚠️ **30s API Gateway Timeout**: Using Web URL Config workaround for agent calls
- ⚠️ **CORS Workaround**: Annotations go through Next.js API proxy

### Planned Enhancements

1. **Activate SQS Pipeline**: S3 upload → SQS → Lambda → auto-analysis
2. **Fix Supervisor Agent**: Improve routing with few-shot examples
3. **Implement Inference Cache Fully**: Cache all analysis types
4. **Add Real-Time Collaboration**: WebSocket for multi-user annotations
5. **Export Reports**: Generate PDF/DOCX compliance reports
6. **Expand Frameworks**: ISO27001, PCI-DSS, NIST
7. **Custom Framework Builder**: Org-specific compliance requirements
8. **Accuracy Improvements**: Refine chunking + prompt engineering

---

## 📚 Documentation

- **Architecture Diagrams**: [`docs/v2/*.mmd`](docs/v2/) (Mermaid)
- **Agent Prompts**: [`lambdas/src/agents/v2/prompts.py`](lambdas/src/agents/v2/prompts.py)
- **Copilot Instructions**: [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- **Project Story**: [`PROJECT_STORY.md`](PROJECT_STORY.md)

### External Resources

- [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [Strands Framework](https://github.com/anthropics/anthropic-sdk-python)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [AWS Cognito Guide](https://docs.aws.amazon.com/cognito/)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Backend**: Follow PEP 8, use type hints, document with docstrings
- **Frontend**: Use Biome for linting, TypeScript strict mode
- **Agents**: Return standardized JSON response format
- **Tests**: Add tests for new tools/handlers

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:

- **AWS Bedrock** (Claude Haiku/Sonnet)
- **Strands AgentCore** (Multi-agent orchestration)
- **Next.js 15** (App Router)
- **Zustand** (State management)
- **uv** (Python package manager)
- **Biome** (Fast linting)

---

## 📧 Contact

- **GitHub**: [@sedhha](https://github.com/sedhha)
- **Project Repo**: [policy_mate](https://github.com/sedhha/policy_mate)

---

**Policy Mate** - Transforming compliance from burden to competitive advantage through agentic AI 🚀
