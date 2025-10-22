# Policy Mate: AI-Powered Compliance Co-Pilot

**Policy Mate** is an AWS-powered agentic compliance co-pilot that helps organizations analyze policies, detect gaps, and stay ahead of frameworks like **GDPR**, **SOC 2**, and **HIPAA**.

## Inspiration

The digital economy today is exploding—AI, cybersecurity, Web3, automation—data is everywhere.

And with great power comes great responsibility. Well we would like to extend it to with great power comes great responsibility as well as great accountability.

As technology expands across borders, so do the laws that govern it. Frameworks like GDPR, HIPAA, and SOC2 are just a few of the standards organizations must comply with to operate globally and ethically.

That’s where Policy Mate steps in—your copilot for compliance. It helps you identify, flag, and fix compliance issues faster, so your team can focus on innovation instead of paperwork.

We ourselves are tech enthusiasts and always look to launch cool tech products. While doing some research about the process we came across such cases where the product market highly depends on the compliance policies they follow and we have been doing looking to understand the same.

With our passion for tech and enthusiasm for agentic ecosystem, we were inspired to build something like this and potentially expand it to end to end agentic system.

---

## What it does?

Upload any compliance document—we analyze it against GDPR, SOC2, or HIPAA in **minutes, not weeks**. Our dual-agent AI system automatically:

**📄 Analyzes Documents Intelligently**

- Breaks documents into semantic chunks while preserving context
- Identifies compliance gaps, violations, and risk areas
- Generates framework-specific annotations with severity ratings
- Caches results for instant re-access (with force re-analysis option)

**🎯 Creates Smart Annotations**

- Auto-categorizes findings: verify, review, info, or action required
- Highlights exact problematic text with regulatory context
- Provides actionable recommendations aligned with framework controls
- Supports filtering by framework, severity, or resolution status

**💬 Enables Two Exploration Modes**

_Live Editor_: Visual document interface where you highlight text for instant phrase-wise analysis, manage annotations, and see AI recommendations in context

_Chat Window_: Conversational AI that answers questions like "What are the highest-risk GDPR violations?" or "Analyze the data retention section again"

**⚡ Optimizes Performance**

- Hash-based deduplication prevents redundant processing
- Pre-signed S3 URLs for secure, direct uploads
- Intelligent caching delivers instant responses on repeat queries
- Real-time status tracking (uploading → analyzing → analyzed)

---

## How we built it

## Architecture Evolution: Three Iterations to MVP

### Previous Platform (TiDB Foundation)

We started with a proof-of-concept on TiDB platform using:

- **Frontend**: Vite React App
- **Database**: TiDB MySQL with BM25 and full-text search (FTS)
- **AI Layer**: LLM tools with a single conversation agent (non-agentic system)

This validated the concept but lacked scalability and proper agent orchestration.

### V1 Architecture (AWS Bedrock Manual - This is where we started working on this Hack - Around 2nd October 2025)

We migrated to AWS and built **PolicyMate Agent** using:

- **Agent Framework**: AWS Bedrock Agents (manual UI configuration)
- **Tool Definition**: YML API schemas defining agent capabilities
- **Handler**: `agent_handler` Lambda function
- **Challenge**: Too verbose, required manual AWS Console setup for prompts, lacked flexibility

We are extensively using it for POC and testing purposes, however due to challenges with custom output formatting bugs, synchronisation issues with prompt updates, and verbosity in agent configuration, we decided to move to a more programmatic way of using agents.

### V2 Architecture (Second Stage MVP - Strands Framework)

Complete rebuild with modern agentic architecture:

- **Agent Framework**: Strands + Agent Core for scalability
- **Specialized Agents**: Dual-agent system (Compliance + Annotation)
- **Tool Refactoring**: V1 Lambda tools refactored for Strands compatibility
- **Result**: Clean, scalable, and maintainable architecture

## Final Agent Architecture Design (AWS AgentCore Runtime with Strands)

```
User Query → Supervisor Agent → [Compliance Agent | Annotations Agent]
                    ↓
              Synthesizes Response
```

### The Supervisor Agent

**Role**: Query router and response synthesizer

- Analyzes user intent from natural language queries
- Routes requests to the appropriate specialist agent
- Combines multiple agent responses into coherent answers
- Maintains conversation context across interactions

**Example**: User asks _"Does our privacy policy comply with GDPR Article 13?"_
→ Supervisor routes to Compliance Agent for gap analysis

### Specialized Child Agents

#### 1. Compliance Agent

**Expertise**: Regulatory framework analysis

- Compares documents against GDPR, SOC2, HIPAA controls
- Identifies compliance gaps and violations
- Provides evidence-based recommendations
- Caches results to avoid duplicate analysis

#### 2. Annotations Agent

**Expertise**: Document markup and collaboration

- Manages inline comments and feedback
- Tracks compliance issues at specific document locations
- Enables team collaboration on policy improvements
- Links annotations to compliance controls

### Response Format

All agents return **structured JSON** with four components:

```json
{
  "tool_payload": {
    /* Raw data */
  },
  "summarised_markdown": "Human-readable analysis",
  "error_message": "",
  "suggested_next_actions": ["Action 1", "Action 2"]
}
```

This ensures consistent UI rendering and enables progressive disclosure (summary → details).

## Key Benefits

**🎯 Specialization**: Each agent masters one domain vs. single generalist agent
**⚡ Performance**: Parallel agent execution where possible
**💾 Intelligent Caching**: DynamoDB stores analysis results (keyed by `document#framework`)
**🔄 Extensibility**: Add new agents without modifying existing ones
**📊 Context Awareness**: Supervisor maintains conversation state across multi-turn interactions

## Example Workflow

```
User: "Analyze our employee handbook for GDPR compliance"
  ↓
Supervisor: Identifies compliance analysis task
  ↓
Compliance Agent:
  - Retrieves handbook from S3
  - Queries 47 relevant GDPR controls via vector search
  - Analyzes each section against requirements
  - Returns gap report with specific Article violations
  ↓
Supervisor: Formats findings with action items
  ↓
UI: Displays color-coded compliance dashboard
```

---

## Frontend: Next.js 15 Full-Stack Application

### Tech Stack

- **Framework**: Next.js 15 (hosted on Vercel)
- **Language**: TypeScript/JavaScript
- **UI Components**: React with modern hooks
- **PDF Rendering**: PDF.js with custom worker configuration
- **Authentication**: AWS Cognito SDK integration

## Challenges we ran into

**1. PDF.js Worker Integration**
Next.js 15 introduced server-side rendering complexities for PDF.js workers. We solved this by:

- Configuring custom webpack settings for worker bundling
- Setting up proper server-side PDF.js initialization
- Implementing dynamic imports to prevent SSR conflicts
- Reference: [Stack Overflow solution](https://stackoverflow.com/questions/78121846/how-to-get-pdfjs-dist-working-with-next-js-14)

**2. Lambda bundling for more than 50MBs**
Initially our deployments were one command stop with:

```bash
./deploy.sh
```

However as our codebase grew, we started hitting the AWS Lambda deployment package size limit of 50MBs zipped. We resolved this by using S3 bucket deployment method for larger packages.

**3. CORS Optimization**
To save development time on CORS configuration:

- **Compliance Agent**: Direct API Gateway calls (full CORS setup completed)
- **Annotation Agent**: Routed through Next.js API routes (`/api/annotations/*`)
- This hybrid approach balanced speed of development with security requirements

**4. Accuracy vs. Autonomy**

Balancing AI autonomy with compliance accuracy demanded careful prompt engineering and validation workflows. We developed **confidence scoring** and **human-in-the-loop** mechanisms for critical decisions.

**5. API Gateway timeout Issues**

Due to API gateway timeout issues, we were still not able to deploy a sustainable version as we were not using streaming. We tried multiple approach like setting up SQS and polling mechanism but none seem to have worked and so we decided to run and test locally. By the time this goes live, we would be working on the same and hopefully be able to make the APIs fully streamable along with FE changes.

**6. AgentCore unexpected bugs**

During integration and testing we did face a lot of unexpected agent core bugs -

- Sometimes we got a strange message - tool_count is more than agent count something.
- We tried to use browser tool in our sub agent (which was invoked by supervisor agent) - but it failed with some cryptic error. Also playwright dependency is heavy enough and since we were following a mono repo design we ended up bloating our python libraries - great learning for project organisation.

### Tool Refactoring Journey

Many tools started as Lambda functions for V1 Bedrock agents with YML schema definitions. We refactored them to work seamlessly with Strands:

- Removed AWS Console prompt dependencies
- Standardized input/output formats
- Added comprehensive error handling
- Made them callable from Python code (not just through Bedrock)

---

## LLM Integration: Claude Models

### Model Selection Strategy

We use Anthropic's Claude models via AWS Bedrock:

**Claude Haiku 4.5**: Fast, cost-effective for:

- Quick phrase analysis
- Status checks
- Simple annotation generation

**Claude Sonnet 4.5**: Advanced reasoning for:

- Comprehensive document analysis
- Complex framework mapping
- Multi-control compliance checks

_Current Status_: Claude Haiku 4.5 for cost effectiveness and speed

### Intelligent Document Processing

**Chunking Algorithm**:

1. Parse document into sections
2. Identify actionable text content (skip headers, footers, page numbers)
3. Create semantic chunks preserving context boundaries
4. Maintain chunk size within LLM context limits
5. Add overlap between chunks to prevent context loss

**Batch Processing**:

- Process multiple chunks in parallel
- Aggregate results into cohesive insights
- Generate annotations with precise page/position references
- Cache final results for instant re-access

---

## Security Implementation

### Multi-Layer Authentication

**Layer 1: AWS Cognito**

- User registration with email verification
- Secure password policies
- JWT token generation (ID token + Access token)

**Layer 3: Lambda Authorization**

- `agent_v2_handler` validates Cognito ID token on every request
- Extracts user context from token claims
- Rejects invalid/expired tokens with 401 Unauthorized

### Secure File Handling

- Files never pass through Lambda functions
- Pre-signed S3 URLs with constrained permissions (time-limited, size-limited)
- Direct client-to-S3 upload reduces attack surface
- Hash-based deduplication prevents storage abuse

---

## Data Flow Architecture

### Upload to Analysis Pipeline

**Step 1: Upload Request**

```
User → Next.js → file_upload_handler → Files Table (hash check)
```

**Step 2a: Hash Exists (Deduplication)**

```
Files Table → file_upload_handler → Next.js → User (existing file details)
```

**Step 2b: New File**

```
file_upload_handler → S3 (generate pre-signed URL) → Next.js → S3 (direct upload)
```

**Step 3: Confirmation**

```
Next.js → upload_confirmation_handler → Files Table + User Files Table
```

**Step 4: Analysis (Future Auto-trigger)**

```
S3 → SQS → Background Processor (Not implemented right now) → Inference Cache + Annotations
```

### Query to Response Pipeline

**Compliance Query**:

```
Chat Window → API Gateway → agent_v2_handler (auth check) → Compliance Agent → Tools → DynamoDB/LLM → Response
```

**Annotation Operation**:

```
Live Editor → Next.js API → annotations_handler → Annotation Agent → Tools → DynamoDB → Response
```

---

## Development Challenges & Solutions

### Challenge 1: Next.js 15 PDF.js Integration

**Problem**: PDF.js workers failed in SSR environment
**Solution**: Custom webpack config, dynamic imports, server-side worker initialization
**Time Spent**: ~8 hours debugging and implementing

### Challenge 2: Agent Verbosity (V1 Bedrock)

**Problem**: AWS Console-based agent configuration was inflexible and verbose
**Solution**: Migrated to Strands framework for programmatic agent definition
**Impact**: 10x faster iteration on agent prompts and tools

### Challenge 3: CORS Complexity

**Problem**: Full CORS setup for multiple endpoints was time-consuming
**Solution**: Hybrid approach—direct APIGW for compliance, Next.js API proxy for annotations
**Trade-off**: Slight latency increase for annotations, but faster development

### Challenge 4: Conversation Threading Schema

**Problem**: How to store and retrieve threaded conversations efficiently
**Solution**: DynamoDB composite key (session_id + timestamp) with chronological sort
**Benefit**: Zero additional indexing, automatic time-ordering, scalable to millions of messages

### Challenge 5: Supervisor Agent Routing

**Problem**: LLM-based routing was inaccurate, sent queries to wrong agents
**Solution**: Temporarily disabled, using direct agent calls from frontend
**Next Steps**: Improved prompt engineering with few-shot examples - still not stable and not part of MVP.

---

## Accomplishments that we're proud of

- Built a fully functioning compliance-analysis prototype in under two weeks with 0 ground knowledge of AWS Bedrock or Strands
- Integrated multi-framework support (GDPR + SOC 2 + HIPAA)
- Achieved semantic retrieval precision > 0.85 in testing
- Deployed end-to-end serverless stack using AWS Lambda, Bedrock, and OpenSearch (though dropped opensearch part later)
- Created an intuitive chat interface that makes compliance accessible to non-technical users
- Implemented enterprise-grade security with multi-tenant data isolation

## What we learned

### **Agentic AI Design Patterns**

We discovered that **specialized agents with clear responsibilities** outperform monolithic AI systems. Our tool-calling architecture enables each agent to focus on specific compliance domains while maintaining system coherence.

### **RAG for Regulatory Content**

Traditional keyword search fails with regulatory language. **Vector embeddings combined with semantic search** dramatically improved relevance, achieving $\text{precision} > 0.85$ for control-to-document matching.

### **Serverless AI Orchestration**

AWS Lambda's event-driven model proved ideal for agentic workflows, enabling **elastic scaling** and **cost-effective processing** of compliance workloads.

### **Human-AI Collaboration**

The most effective compliance AI doesn't replace human judgment but **augments expert decision-making** with comprehensive analysis and contextual recommendations.

## What's next for Policy Mate

Policy Mate represents the beginning of **autonomous compliance intelligence**. Our roadmap includes:

1. **Activate SQS Auto-Analysis**: Background processing pipeline for instant insights post-upload
2. **Fix Supervisor Agent**: Improve routing logic for seamless multi-agent experience
3. **Accuracy improvements**: Refine LLM prompts and chunking algorithms for better compliance detection
4. **Multi Agent Orchestration**: Enable dynamic agent collaboration for complex queries
5. **Expand Framework Support**: Add ISO27001, PCI-DSS, NIST beyond current GDPR/SOC2/HIPAA
6. **Implement Inference Cache Fully**: Complete caching layer for all analysis types
7. **Add Real-Time Collaboration**: WebSocket support for multi-user annotation discussions
8. **Export Capabilities**: Generate compliance reports in PDF/DOCX formats
9. **Expand Regulatory Coverage**: Integrate more frameworks and real-time updates. Also custom framework builder for org-specific needs.

**Policy Mate envisions a future where compliance is proactive, intelligent, and seamlessly integrated into organizational workflows**—transforming regulatory burden into competitive advantage through the power of agentic AI.
