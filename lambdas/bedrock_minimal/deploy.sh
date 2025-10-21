#!/bin/bash
set -e

# Minimal deployment script for bedrock_handler
# Only installs required dependencies

export AWS_PROFILE=policy-mate
ROLE_ARN="arn:aws:iam::354468042457:role/lambda-execution-role"
FUNCTION_NAME="policy-mate-bedrock-handler"
BUILD_DIR="build"

echo "🚀 Building minimal bedrock handler deployment..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv not found. Installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Clean and create build directory
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Install minimal dependencies
echo "📦 Installing dependencies..."
uv pip install --python 3.12 --target $BUILD_DIR \
    boto3>=1.35.0 \
    aws-lambda-typing>=2.20.0 \
    python-jose[cryptography]>=3.3.0 \
    requests>=2.32.0 \
    mypy-boto3-bedrock-agent-runtime>=1.40.0

# Copy handler and utilities
echo "📋 Copying handler and utilities..."
cp bedrock_handler.py $BUILD_DIR/
cp -r src $BUILD_DIR/

# Create deployment package
echo "📦 Creating deployment package..."
cd $BUILD_DIR && zip -r ../bedrock_lambda.zip . -q && cd ..

PACKAGE_SIZE=$(du -h bedrock_lambda.zip | cut -f1)
echo "✅ Package size: $PACKAGE_SIZE"

# Check if function exists
if ! aws lambda get-function --function-name $FUNCTION_NAME 2>/dev/null >/dev/null; then
    echo "📝 Creating Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.12 \
        --role $ROLE_ARN \
        --handler bedrock_handler.lambda_handler \
        --zip-file fileb://bedrock_lambda.zip \
        --timeout 60 \
        --memory-size 512 \
        --environment "Variables={AGENT_ID=policyMate-WoQ1uB3z5m,AGENT_ALIAS=DEFAULT}"
    echo "✅ Function created"
else
    echo "🔄 Updating existing function code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://bedrock_lambda.zip >/dev/null
    
    echo "⏳ Waiting for function to be ready..."
    aws lambda wait function-updated --function-name $FUNCTION_NAME
    
    echo "⚙️  Updating configuration..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout 60 \
        --memory-size 512 \
        --environment "Variables={AGENT_ID=policyMate-WoQ1uB3z5m,AGENT_ALIAS=DEFAULT}" >/dev/null
    
    echo "✅ Function updated"
fi

# Cleanup
rm -rf $BUILD_DIR bedrock_lambda.zip

echo "🎉 Deployment complete!"
echo "📍 Function: $FUNCTION_NAME"
echo "🔧 Handler: bedrock_handler.lambda_handler"
echo "📦 Package size: $PACKAGE_SIZE"
