# Gemini LLM Setup Guide

## Two Ways to Use Gemini with LiteLLM

### Option 1: Google AI Studio (Recommended - No Google Cloud Required) ✅

**Pros:**

- ✅ Simple API key authentication (like OpenAI)
- ✅ No Google Cloud Project needed
- ✅ No service account or complex auth
- ✅ Free tier available
- ✅ Lower cost for most use cases

**Setup:**

1. Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Set environment variable:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```
3. Use model prefix `gemini/`:
   ```python
   llm = GeminiLLM(model_name="gemini/gemini-2.0-flash-exp")
   ```

**Available Models (Google AI Studio):**

- `gemini/gemini-2.0-flash-exp` - Fast, experimental
- `gemini/gemini-1.5-flash` - Fast, production
- `gemini/gemini-1.5-pro` - More powerful
- `gemini/gemini-pro` - Older model

**Dependencies:** None extra needed! Just `litellm>=1.0.0`

---

### Option 2: Vertex AI (Enterprise - Requires Google Cloud)

**Pros:**

- Enterprise features (SLAs, VPCs, etc.)
- More control over deployment
- Integration with Google Cloud services

**Cons:**

- ❌ Requires Google Cloud Project
- ❌ Requires authentication setup
- ❌ Requires `google-cloud-aiplatform` library
- ❌ More complex setup
- ❌ Potentially higher costs

**Setup:**

1. Install additional dependency:
   ```bash
   pip install google-cloud-aiplatform>=1.70.0
   ```
2. Set up authentication:

   ```bash
   # Option A: Using gcloud
   gcloud auth application-default login

   # Option B: Using service account
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   export VERTEXAI_PROJECT="your-project-id"
   export VERTEXAI_LOCATION="us-central1"
   ```

3. Use model prefix `vertex_ai/`:
   ```python
   llm = GeminiLLM(model_name="vertex_ai/gemini-2.0-flash")
   ```

---

## Current Setup

Your code is now configured to use **Google AI Studio** (Option 1) by default:

- Model: `gemini/gemini-2.0-flash-exp`
- No Google Cloud dependencies required
- Just set `GEMINI_API_KEY` environment variable

## Cost Comparison

**Google AI Studio:**

- Gemini 1.5 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Free tier: 15 requests per minute

**Vertex AI:**

- Gemini 1.5 Flash: Similar pricing but with additional Google Cloud costs
- No free tier (pay-as-you-go)

## Environment Variables

Add to your `.env` file:

```bash
# For Google AI Studio (Recommended)
GEMINI_API_KEY=your-api-key-here

# For Vertex AI (Only if using vertex_ai/ models)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# VERTEXAI_PROJECT=your-project-id
# VERTEXAI_LOCATION=us-central1
```

## Testing

```python
from src.utils.services.llm import llm

# Simple test
response = llm.invoke("Say hello in 5 words")
print(response)
```
