import { NextRequest, NextResponse } from 'next/server';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { verifyIdToken, AuthenticationError } from '@/utils/verifyIdToken';
import { server_env as env } from '@/utils/server_variables';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({
  region: env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.NEXT_AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.NEXT_AWS_SECRET_ACCESS_KEY!,
  },
});

const lambdaClient = new LambdaClient({
  region: env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.NEXT_AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.NEXT_AWS_SECRET_ACCESS_KEY!,
  },
});

const POLLING_TABLE_NAME = 'PolicyMatePollingStatus';
const BEDROCK_HANDLER_LAMBDA = 'policy-mate-bedrock-handler';

interface PollingResponse {
  status: 'processing' | 'completed' | 'error';
  request_id: string;
  message?: string;
  response?: any;
  created_at?: number;
}

/**
 * POST /api/polling
 * Creates a new polling request and triggers the bedrock handler Lambda
 * Body: { request_id, ...event_data }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing or invalid authorization header',
        },
        { status: 401 }
      );
    }

    // Extract and verify the ID token to get user claims
    const idToken = authHeader.replace('Bearer ', '');
    let userClaims;

    try {
      const verificationResult = await verifyIdToken(idToken);
      userClaims = verificationResult.claims;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Invalid or expired token',
            details: error.message,
          },
          { status: error.statusCode }
        );
      }
      throw error;
    }

    const body = await request.json();
    const requestId = body.request_id || crypto.randomUUID();

    // Check if polling entry already exists
    const getItemCommand = new GetItemCommand({
      TableName: POLLING_TABLE_NAME,
      Key: marshall({ request_id: requestId }),
    });

    const existingItem = await dynamoClient.send(getItemCommand);

    if (existingItem.Item) {
      const item = unmarshall(existingItem.Item);
      const status = item.status;

      if (status === 'completed') {
        return NextResponse.json(
          {
            status: 'completed',
            request_id: requestId,
            response: item.response,
          },
          { status: 200 }
        );
      }

      if (status === 'processing') {
        return NextResponse.json(
          {
            status: 'processing',
            request_id: requestId,
            message: 'Request is still being processed',
          },
          { status: 202 }
        );
      }

      if (status === 'error') {
        return NextResponse.json(
          {
            status: 'error',
            request_id: requestId,
            message: item.error_message || 'Processing failed',
          },
          { status: 500 }
        );
      }
    }

    // Create new polling entry
    const putItemCommand = new PutItemCommand({
      TableName: POLLING_TABLE_NAME,
      Item: marshall({
        request_id: requestId,
        status: 'processing',
        created_at: Date.now(),
      }),
    });

    await dynamoClient.send(putItemCommand);
    body['session_id'] = requestId;
    body['user_claims'] = userClaims;
    // Prepare event for Lambda invocation with user claims
    const lambdaEvent = {
      body,
      headers: {
        authorization: authHeader,
      },
    };

    // Invoke bedrock handler Lambda asynchronously (fire and forget)
    const invokeCommand = new InvokeCommand({
      FunctionName: BEDROCK_HANDLER_LAMBDA,
      InvocationType: 'Event', // Asynchronous invocation
      Payload: new TextEncoder().encode(JSON.stringify(lambdaEvent)),
    });

    // Fire and forget - don't wait for Lambda invocation to complete
    lambdaClient.send(invokeCommand).catch((error) => {
      console.error('Lambda invocation error:', error);
      // Note: Response already sent, but we can update DynamoDB if needed
    });

    return NextResponse.json(
      {
        status: 'processing',
        request_id: requestId,
        message: 'Request is being processed. Please poll for results.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating polling request:', error);
    return NextResponse.json(
      {
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to create request',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/polling?request_id=xxx
 * Checks the status of a polling request
 */
export async function GET(request: NextRequest) {
  try {
    // Extract bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing or invalid authorization header',
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('request_id');

    if (!requestId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing request_id parameter',
        },
        { status: 400 }
      );
    }

    // Get polling entry from DynamoDB
    const getItemCommand = new GetItemCommand({
      TableName: POLLING_TABLE_NAME,
      Key: marshall({ request_id: requestId }),
    });

    const result = await dynamoClient.send(getItemCommand);

    if (!result.Item) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Request not found',
        },
        { status: 404 }
      );
    }

    const item = unmarshall(result.Item);
    const status = item.status;

    const response: PollingResponse = {
      status: status,
      request_id: requestId,
    };

    if (status === 'processing') {
      response.message = 'Request is still being processed';
      return NextResponse.json(response, { status: 202 });
    }

    if (status === 'completed') {
      response.response = item.response;
      return NextResponse.json(response, { status: 200 });
    }

    if (status === 'error') {
      response.message = item.error_message || 'Processing failed';
      return NextResponse.json(response, { status: 500 });
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Unknown status',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error checking polling status:', error);
    return NextResponse.json(
      {
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to check status',
      },
      { status: 500 }
    );
  }
}
