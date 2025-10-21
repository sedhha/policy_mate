# Set your AWS profile and S3 bucket
export AWS_PROFILE=policy-mate
S3_BUCKET="policy-mate"  # Replace with your S3 bucket name

# Set the handler file (change this to deploy different handlers)
HANDLER_FILE="agent_v2_handler.py"

# Extract handler name from filename (removes _handler.py suffix)
HANDLER_NAME=$(basename "$HANDLER_FILE" _handler.py)
BUILD_DIR="build"

# Validate handler file exists
if [ ! -f "$HANDLER_FILE" ]; then
    echo "❌ Error: Handler file '$HANDLER_FILE' not found!"
    exit 1
fi

# Build the package
echo "Building package for: $HANDLER_NAME"
rm -rf $BUILD_DIR lambda.zip
mkdir -p $BUILD_DIR

# Install dependencies using uv
uv pip install --python 3.12 --target $BUILD_DIR .

# Copy the handler file
cp "$HANDLER_FILE" $BUILD_DIR/

# Copy the src directory (contains agents, utils, etc.)
cp -r src $BUILD_DIR/

# Prepare environment variables (optional - add to .env file if needed)
if [ -f .env ]; then
    ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | grep -v 'AWS_PROFILE' | grep -v 'AWS_REGION' | \
        awk -F= '{printf "%s=%s,", $1, $2}' | sed 's/,$//')
    ENV_VARS=$(echo "$ENV_VARS" | sed 's/OPEN_SEARCH_ENV=[^,]*/OPEN_SEARCH_ENV=aws/')
    echo "Environment variables prepared: $ENV_VARS"
fi

# Create the zip file
cd $BUILD_DIR && zip -r ../lambda.zip . -q && cd ..
echo "✅ Package created: lambda.zip"

# Upload to S3
aws s3 cp lambda.zip s3://$S3_BUCKET/lambdas/policy-mate-${HANDLER_NAME}-handler.zip
echo "✅ Uploaded to S3: s3://$S3_BUCKET/lambdas/policy-mate-${HANDLER_NAME}-handler.zip"

# Cleanup
rm -rf $BUILD_DIR lambda.zip
echo "✅ Cleanup complete"