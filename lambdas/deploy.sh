#!/bin/bash
set -e

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv not found. Installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

export AWS_PROFILE=policy-mate
ROLE_ARN="arn:aws:iam::354468042457:role/lambda-execution-role"
BUILD_DIR="build"
FORCE_DEPLOY=false

if [ "$1" == "--force" ] || [ "$1" == "-f" ]; then
    FORCE_DEPLOY=true
fi

deploy_handler() {
    local HANDLER=$1
    local FUNCTION_NAME="policy-mate-${HANDLER}"
    local HANDLER_FILE="${HANDLER}_handler.py"
    
    echo "\n[$HANDLER] Checking..."
    
    # Check if function exists
    if ! aws lambda get-function --function-name $FUNCTION_NAME 2>/dev/null >/dev/null; then
        echo "[$HANDLER] Creating function..."
        mkdir -p $BUILD_DIR
        echo "def lambda_handler(event, context): return {'statusCode': 200}" > $BUILD_DIR/temp.py
        cd $BUILD_DIR && zip -q ../temp.zip temp.py && cd ..
        
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --runtime python3.12 \
            --role $ROLE_ARN \
            --handler ${HANDLER}_handler.lambda_handler \
            --zip-file fileb://temp.zip
        
        rm -rf $BUILD_DIR temp.zip
    fi
    
    # Check if code changed
    local LOCAL_HASH=$(md5sum $HANDLER_FILE | cut -d' ' -f1)
    local SKIP_DEPLOY=false
    
    if [ "$FORCE_DEPLOY" = false ] && [ -f ".deploy_cache/$HANDLER" ] && [ "$(cat .deploy_cache/$HANDLER)" == "$LOCAL_HASH" ]; then
        echo "[$HANDLER] No changes, skipping"
        SKIP_DEPLOY=true
    fi
    
    if [ "$SKIP_DEPLOY" = false ]; then
        echo "[$HANDLER] Deploying..."
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file fileb://lambda.zip >/dev/null
        
        mkdir -p .deploy_cache
        echo $LOCAL_HASH > .deploy_cache/$HANDLER
        echo "[$HANDLER] Deployed"
    fi
}

echo "Building package..."
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

uv pip install --python 3.12 --target $BUILD_DIR .
cp *_handler.py $BUILD_DIR/
cp -r src $BUILD_DIR/

cd $BUILD_DIR && zip -r ../lambda.zip . -q && cd ..

# Prepare environment variables
ENV_VARS=""
if [ -f .env ]; then
    ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | grep -v 'AWS_PROFILE' | grep -v 'AWS_REGION' | \
        awk -F= '{printf "%s=%s,", $1, $2}' | sed 's/,$//')
fi

for handler_file in *_handler.py; do
    HANDLER=$(basename $handler_file _handler.py)
    deploy_handler $HANDLER
done

# Update env vars for all functions (always)
if [ -n "$ENV_VARS" ]; then
    echo "\nUpdating environment variables..."
    for handler_file in *_handler.py; do
        HANDLER=$(basename $handler_file _handler.py)
        FUNCTION_NAME="policy-mate-${HANDLER}"
        echo "[$HANDLER] Waiting for function to be ready..."
        aws lambda wait function-updated --function-name $FUNCTION_NAME
        echo "[$HANDLER] Setting environment variables"
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --environment "Variables={$ENV_VARS}" >/dev/null
    done
else
    echo "\nWarning: No environment variables found in .env file"
fi

rm -rf $BUILD_DIR lambda.zip
echo "\nAll deployments complete!"
