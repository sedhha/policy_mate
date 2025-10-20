import { verifyIdToken, AuthenticationError } from '@/utils/verifyIdToken';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader =
    request.headers.get('authorization') ||
    request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing or invalid Authorization header',
      },
      { status: 401 }
    );
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const result = await verifyIdToken(idToken);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
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

    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during token verification',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
