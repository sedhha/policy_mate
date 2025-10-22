import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { verifyIdToken, AuthenticationError } from '@/utils/verifyIdToken';

// Initialize AWS DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.NEXT_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.NEXT_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_AWS_SECRET_ACCESS_KEY!,
  },
});

// DynamoDB table names
const DOCUMENTS_TABLE = 'PolicyMateUserFiles';
const FILES_TABLE = 'PolicyMateFiles';

// Document status enum (matches backend)
const DocumentStatus = {
  UPLOAD_SUCCESS: 12,
  ANALYSIS_INITIATED: 21,
  ANALYSIS_SUCCEEDED: 31,
  ANALYSIS_FAILED: 32,
  REPORT_GENERATED: 41,
  COMPLIANT: 51,
  NON_COMPLIANT: 52,
  PARTIALLY_COMPLIANT: 53,
};

// Status details helper
function getStatusDetails(status: number) {
  const statusMap: Record<
    number,
    { label: string; color: string; emoji: string }
  > = {
    12: { label: 'Upload Successful', color: 'blue', emoji: '✅' },
    21: { label: 'Analysis In Progress', color: 'yellow', emoji: '🔄' },
    31: { label: 'Analysis Complete', color: 'green', emoji: '✅' },
    32: { label: 'Analysis Failed', color: 'red', emoji: '❌' },
    41: { label: 'Report Generated', color: 'green', emoji: '📊' },
    51: { label: 'Compliant', color: 'green', emoji: '✅' },
    52: { label: 'Non-Compliant', color: 'red', emoji: '⚠️' },
    53: { label: 'Partially Compliant', color: 'yellow', emoji: '⚠️' },
  };
  return statusMap[status] || { label: 'Unknown', color: 'gray', emoji: '❓' };
}

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Format timestamp helper
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * GET /api/docs
 * Fetches all documents for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and verify bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace('Bearer ', '');

    // Verify token and get user claims
    let claims;
    try {
      const verificationResult = await verifyIdToken(idToken);
      claims = verificationResult.claims;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: 'Invalid or expired token', details: error.message },
          { status: error.statusCode }
        );
      }
      throw error;
    }

    const userId = claims?.sub;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 400 }
      );
    }

    // Step 1: Get user's uploaded file IDs from DOCUMENTS table
    const userFilesCommand = new ScanCommand({
      TableName: DOCUMENTS_TABLE,
      FilterExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': { S: userId },
      },
    });

    const userFilesResponse = await dynamoClient.send(userFilesCommand);
    const userFilesItems = userFilesResponse.Items || [];

    // Collect all file IDs
    const fileIds = new Set<string>();
    for (const item of userFilesItems) {
      const unmarshalled = unmarshall(item);
      const uploadedFiles = unmarshalled.uploaded_files || [];
      uploadedFiles.forEach((id: string) => fileIds.add(id));
    }

    // If no files, return empty list
    if (fileIds.size === 0) {
      return NextResponse.json({
        documents: [],
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Get file metadata from FILES table
    const filesCommand = new ScanCommand({
      TableName: FILES_TABLE,
    });

    const filesResponse = await dynamoClient.send(filesCommand);
    const filesItems = filesResponse.Items || [];

    // Filter and format documents
    const documents = filesItems
      .map((item) => unmarshall(item))
      .filter((item) => {
        const fileId = item.file_id;
        const status = Number(item.status || 0);
        return fileIds.has(fileId) && status >= DocumentStatus.UPLOAD_SUCCESS;
      })
      .map((item) => {
        const status = Number(item.status || 0);
        const statusDetails = getStatusDetails(status);
        const fileSize = Number(item.file_size || 0);
        const timestamp = Number(item.created_at || 0);
        const s3Key = item.s3_key || '';
        const fileName = s3Key
          ? s3Key.split('/').pop() || 'Unknown'
          : 'Unknown';

        return {
          document_id: item.file_id,
          file_name: fileName,
          file_type: item.file_type || 'Unknown',
          document_size: fileSize,
          formatted_size: formatFileSize(fileSize),
          compliance_status: status,
          status_label: statusDetails.label,
          status_color: statusDetails.color,
          status_emoji: statusDetails.emoji,
          timestamp: timestamp,
          formatted_date: formatTimestamp(timestamp),
          pages: Number(item.page_count || 0),
          s3_key: s3Key,
          s3_bucket: process.env.S3_BUCKET_NAME || '',
        };
      });

    return NextResponse.json({
      documents,
      count: documents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
