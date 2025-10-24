#!/usr/bin/env bash
set -euo pipefail

# --- PATH SETUP ---
# Determine where this script is, and where terraform code lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$SCRIPT_DIR/terraform"
TF_LOG_PATH="$TF_DIR/terraform.log"

AWS_PROFILE_NAME="${AWS_PROFILE:-policy-mate}"

export AWS_PROFILE="$AWS_PROFILE_NAME"
export AWS_REGION="${AWS_REGION:-us-east-1}"

echo "🚀 Starting Terraform deployment..."
echo "Terraform directory: $TF_DIR"
echo "Using AWS profile: $AWS_PROFILE_NAME"
echo "Logging to: $TF_LOG_PATH"
echo

# --- INITIALIZE ---
echo "🧩 Initializing Terraform..."
terraform -chdir="$TF_DIR" init -upgrade | tee "$TF_LOG_PATH"

# --- VALIDATE ---
echo "🔍 Validating Terraform configuration..."
terraform -chdir="$TF_DIR" validate | tee -a "$TF_LOG_PATH"

# --- PLAN ---
echo "🧠 Generating plan..."
terraform -chdir="$TF_DIR" plan -out="$TF_DIR/plan.tfplan" | tee -a "$TF_LOG_PATH"

# --- APPLY ---
echo
read -p "Apply this plan? (y/N): " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "⚙️  Applying infrastructure changes..."
  terraform -chdir="$TF_DIR" apply -auto-approve "$TF_DIR/plan.tfplan" | tee -a "$TF_LOG_PATH"
  echo "✅ Deployment complete!"
else
  echo "❌ Aborted by user."
  exit 0
fi
