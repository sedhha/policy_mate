import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthenticationError, verifyIdToken } from '@/utils/verifyIdToken';
import { server_env as env } from '@/utils/server_variables';

/**
 * GET /api/pdf
 * Generates a pre-signed URL for secure PDF access from S3
 *
 * Query Parameters:
 * - bucket: S3 bucket name (required)
 * - key: S3 object key/path (required)
 * - filename: Optional filename for download
 *
 * Headers:
 * - Authorization: Bearer token (required)
 *
 * Returns:
 * - url: Pre-signed URL for direct S3 access
 * - expiresIn: Expiry time in seconds
 * - filename: Suggested filename for the PDF
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate Cognito JWT token
    const bearer_token = request.headers.get('authorization');
    if (!bearer_token || !bearer_token.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Unauthorized: Missing or invalid Authorization header',
        },
        { status: 401 }
      );
    }
    await verifyIdToken(bearer_token.split(' ')[1]);

    // 2. Validate AWS credentials are configured
    const accessKeyId = env.NEXT_AWS_ACCESS_KEY_ID;
    const secretAccessKey = env.NEXT_AWS_SECRET_ACCESS_KEY;
    const region = env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      console.error('❌ AWS credentials not configured in environment');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Server configuration error: AWS credentials not found',
        },
        { status: 500 }
      );
    }

    // 3. Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const key = searchParams.get('key');
    const filename = searchParams.get('filename') || 'document.pdf';

    if (!bucket || !key) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required parameters: bucket and key are required',
        },
        { status: 400 }
      );
    }

    // 4. Initialize S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // 5. Generate pre-signed URL
    const expiresIn = Number(env.PDF_URL_EXPIRY_SECONDS) || 300; // Default: 5 minutes

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${filename}"`,
      ResponseContentType: 'application/pdf',
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    console.log(
      `✅ Generated pre-signed URL for s3://${bucket}/${key} (expires in ${expiresIn}s)`
    );

    // 6. Return pre-signed URL
    return NextResponse.json({
      status: 'success',
      url: presignedUrl,
      expiresIn,
      filename,
      bucket,
      key,
    });
  } catch (error) {
    console.error('❌ Error generating pre-signed URL:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details,
        },
        { status: error.statusCode || 401 }
      );
    }

    // Handle specific AWS errors
    else if (error instanceof Error) {
      if (error.name === 'NoSuchKey') {
        return NextResponse.json(
          {
            status: 'error',
            message: 'PDF file not found in S3',
          },
          { status: 404 }
        );
      }

      if (error.name === 'AccessDenied') {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Access denied to S3 resource',
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to generate PDF URL',
      },
      { status: 500 }
    );
  }
}
