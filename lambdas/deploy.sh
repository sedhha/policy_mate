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
SPECIFIC_HANDLER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_DEPLOY=true
            shift
            ;;
        --handler|-h)
            SPECIFIC_HANDLER="$2"
            shift 2
            ;;
        *)
            # If no flag, treat as handler name
            if [ -z "$SPECIFIC_HANDLER" ]; then
                SPECIFIC_HANDLER="$1"
            fi
            shift
            ;;
    esac
done

deploy_handler() {
    local HANDLER=$1
    local FUNCTION_NAME="policy-mate-${HANDLER}"
    local HANDLER_FILE="${HANDLER}_handler.py"
    
    # Check if handler file exists
    if [ ! -f "$HANDLER_FILE" ]; then
        echo "[$HANDLER] Error: Handler file '$HANDLER_FILE' not found"
        return 1
    fi
    
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
    
    return 0
}

update_env_vars() {
    local HANDLER=$1
    local FUNCTION_NAME="policy-mate-${HANDLER}"
    
    if [ -n "$ENV_VARS" ]; then
        echo "[$HANDLER] Waiting for function to be ready..."
        aws lambda wait function-updated --function-name $FUNCTION_NAME
        echo "[$HANDLER] Setting environment variables"
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --environment "Variables={$ENV_VARS}" >/dev/null
    fi
}

echo "Building package..."
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

uv pip install --python 3.12 --target $BUILD_DIR .

# Copy specific handler or all handlers
if [ -n "$SPECIFIC_HANDLER" ]; then
    HANDLER_FILE="${SPECIFIC_HANDLER}_handler.py"
    if [ ! -f "$HANDLER_FILE" ]; then
        echo "Error: Handler file '$HANDLER_FILE' not found!"
        echo "Available handlers:"
        ls -1 *_handler.py 2>/dev/null | sed 's/_handler.py//' || echo "  (none found)"
        exit 1
    fi
    cp $HANDLER_FILE $BUILD_DIR/
    echo "Packaging handler: $SPECIFIC_HANDLER"
else
    cp *_handler.py $BUILD_DIR/
    echo "Packaging all handlers"
fi

cp -r src $BUILD_DIR/

cd $BUILD_DIR && zip -r ../lambda.zip . -q && cd ..

# Prepare environment variables
ENV_VARS=""
if [ -f .env ]; then
    ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | grep -v 'AWS_PROFILE' | grep -v 'AWS_REGION' | \
        awk -F= '{printf "%s=%s,", $1, $2}' | sed 's/,$//')
    # Force OPEN_SEARCH_ENV to 'aws' for Lambda deployments
    ENV_VARS=$(echo "$ENV_VARS" | sed 's/OPEN_SEARCH_ENV=[^,]*/OPEN_SEARCH_ENV=aws/')
    # Add OPEN_SEARCH_ENV=aws if not present
    if ! echo "$ENV_VARS" | grep -q "OPEN_SEARCH_ENV="; then
        ENV_VARS="${ENV_VARS},OPEN_SEARCH_ENV=aws"
    fi
fi

# Deploy specific handler or all handlers
if [ -n "$SPECIFIC_HANDLER" ]; then
    if deploy_handler $SPECIFIC_HANDLER; then
        update_env_vars $SPECIFIC_HANDLER
    else
        echo "Deployment failed!"
        rm -rf $BUILD_DIR lambda.zip
        exit 1
    fi
else
    # Deploy all handlers
    DEPLOYED_HANDLERS=()
    for handler_file in *_handler.py; do
        HANDLER=$(basename $handler_file _handler.py)
        if deploy_handler $HANDLER; then
            DEPLOYED_HANDLERS+=($HANDLER)
        fi
    done
    
    # Update env vars for all deployed functions
    if [ ${#DEPLOYED_HANDLERS[@]} -gt 0 ]; then
        echo "\nUpdating environment variables..."
        for HANDLER in "${DEPLOYED_HANDLERS[@]}"; do
            update_env_vars $HANDLER
        done
    fi
fi

rm -rf $BUILD_DIR lambda.zip
echo "\nDeployment complete!"