# Policy Mate

## Setup

### 1. Install uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. AWS Authentication

```bash
aws configure
```

### 5. Test Lambda

```bash
aws lambda invoke --function-name policy-mate-function output.json
cat output.json
```

## Project Structure

- `lambdas/` - Python Lambda function code
- `policy_mate_ui/` - Frontend application
