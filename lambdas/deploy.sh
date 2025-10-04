#!/bin/bash
set -e

export AWS_PROFILE=policy-mate
ROLE_ARN="arn:aws:iam::354468042457:role/lambda-execution-role"
BUILD_DIR="build"

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
    
    if [ -f ".deploy_cache/$HANDLER" ] && [ "$(cat .deploy_cache/$HANDLER)" == "$LOCAL_HASH" ]; then
        echo "[$HANDLER] No changes, skipping"
        return
    fi
    
    echo "[$HANDLER] Deploying..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda.zip >/dev/null
    
    mkdir -p .deploy_cache
    echo $LOCAL_HASH > .deploy_cache/$HANDLER
    echo "[$HANDLER] Deployed"
}

echo "Building package..."
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

pip install -r requirements.txt -t $BUILD_DIR --quiet
cp *_handler.py $BUILD_DIR/

cd $BUILD_DIR && zip -r ../lambda.zip . -q && cd ..

for handler_file in *_handler.py; do
    HANDLER=$(basename $handler_file _handler.py)
    deploy_handler $HANDLER
done

if [ -f .env ]; then
    echo "\nUpdating environment variables..."
    ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | grep -v 'AWS_PROFILE' | \
        awk -F= '{printf "%s=%s,", $1, $2}' | sed 's/,$//')
    
    if [ -n "$ENV_VARS" ]; then
        for handler_file in *_handler.py; do
            HANDLER=$(basename $handler_file _handler.py)
            FUNCTION_NAME="policy-mate-${HANDLER}"
            aws lambda update-function-configuration \
                --function-name $FUNCTION_NAME \
                --environment "Variables={$ENV_VARS}" &>/dev/null
        done
    fi
fi

rm -rf $BUILD_DIR lambda.zip
echo "\nAll deployments complete!"
