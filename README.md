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

### 3. Initialize Terraform
```bash
cd terraform
terraform init
```

### 4. Deploy Lambda
```bash
terraform plan
terraform apply
```

### 5. Test Lambda
```bash
aws lambda invoke --function-name policy-mate-function output.json
cat output.json
```

## Project Structure
- `lambdas/` - Python Lambda function code
- `terraform/` - Infrastructure as Code
- `policy_mate_ui/` - Frontend application
