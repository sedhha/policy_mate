#!/bin/bash
set -e

# Configuration
BUILD_DIR="build"
ZIPS_DIR="zips"
SPECIFIC_HANDLER=""
INCLUDE_ENV=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --handler|-h)
            SPECIFIC_HANDLER="$2"
            shift 2
            ;;
        --with-env|-e)
            INCLUDE_ENV=true
            shift
            ;;
        --help)
            echo "Usage: ./create_handler_zip.sh --handler <handler_name> [--with-env]"
            echo ""
            echo "Options:"
            echo "  --handler, -h    Handler name (without _handler.py suffix)"
            echo "  --with-env, -e   Include environment variables in a .env.json file"
            echo ""
            echo "Examples:"
            echo "  ./create_handler_zip.sh --handler annotations_agent"
            echo "  ./create_handler_zip.sh -h compliance_check --with-env"
            echo ""
            echo "Available handlers:"
            ls -1 *_handler.py 2>/dev/null | sed 's/_handler.py/  - /' || echo "  (none found)"
            exit 0
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

# Check if handler is specified
if [ -z "$SPECIFIC_HANDLER" ]; then
    echo "❌ Error: No handler specified!"
    echo ""
    echo "Usage: ./create_handler_zip.sh --handler <handler_name>"
    echo ""
    echo "Available handlers:"
    ls -1 *_handler.py 2>/dev/null | sed 's/_handler.py/  - /' || echo "  (none found)"
    exit 1
fi

# Check if handler file exists
HANDLER_FILE="${SPECIFIC_HANDLER}_handler.py"
if [ ! -f "$HANDLER_FILE" ]; then
    echo "❌ Error: Handler file '$HANDLER_FILE' not found!"
    echo ""
    echo "Available handlers:"
    ls -1 *_handler.py 2>/dev/null | sed 's/_handler.py/  - /' || echo "  (none found)"
    exit 1
fi

echo "📦 Creating zip package for: $SPECIFIC_HANDLER"
echo ""

# Create zips directory if it doesn't exist
mkdir -p $ZIPS_DIR

# Clean up previous build
rm -rf $BUILD_DIR

# Create build directory
mkdir -p $BUILD_DIR

echo "📥 Installing dependencies with uv..."
# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "⚠️  uv not found. Installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Install dependencies
uv pip install --python 3.12 --target $BUILD_DIR . --quiet

echo "📄 Copying handler and source files..."
# Copy the handler file
cp $HANDLER_FILE $BUILD_DIR/

# Copy the src directory (contains agents, utils, tools, etc.)
if [ -d "src" ]; then
    cp -r src $BUILD_DIR/
fi

# Handle environment variables
if [ "$INCLUDE_ENV" = true ] && [ -f .env ]; then
    echo "🔐 Including environment variables..."
    # Create a JSON file with environment variables
    echo "{" > $BUILD_DIR/.env.json
    grep -v '^#' .env | grep -v '^$' | grep -v 'AWS_PROFILE' | grep -v 'AWS_REGION' | \
        awk -F= '{printf "  \"%s\": \"%s\",\n", $1, $2}' | sed '$ s/,$//' >> $BUILD_DIR/.env.json
    echo "}" >> $BUILD_DIR/.env.json
    
    # Force OPEN_SEARCH_ENV to 'aws' for Lambda deployments
    sed -i 's/"OPEN_SEARCH_ENV": "[^"]*"/"OPEN_SEARCH_ENV": "aws"/' $BUILD_DIR/.env.json
fi

# Create the zip file
ZIP_NAME="${SPECIFIC_HANDLER}_handler.zip"
ZIP_PATH="$ZIPS_DIR/$ZIP_NAME"

echo "🗜️  Creating zip archive..."
cd $BUILD_DIR && zip -r ../$ZIP_PATH . -q && cd ..

# Get zip file size
ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo "   📦 File: $ZIP_PATH"
echo "   📊 Size: $ZIP_SIZE"
echo ""

# Show contents summary
echo "📋 Package contents:"
unzip -l "$ZIP_PATH" | head -20
TOTAL_FILES=$(unzip -l "$ZIP_PATH" | tail -1 | awk '{print $2}')
echo "   ... (total $TOTAL_FILES files)"
echo ""

# Cleanup build directory
rm -rf $BUILD_DIR
echo "🧹 Cleaned up build directory"
echo ""
echo "💡 Tip: You can now upload this to S3 or deploy to Lambda:"
echo "   aws s3 cp $ZIP_PATH s3://your-bucket/lambdas/"
echo "   aws lambda update-function-code --function-name policy-mate-${SPECIFIC_HANDLER} --zip-file fileb://$ZIP_PATH"
