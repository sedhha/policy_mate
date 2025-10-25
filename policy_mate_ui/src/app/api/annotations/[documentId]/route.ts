import { server_env as env } from '@/utils/server_variables';
import { NextRequest, NextResponse } from 'next/server';

type BookmarkType = 'review-later' | 'verify' | 'important' | 'question';

interface BackendAnnotation {
  annotation_id: string;
  page_number: number;
  file_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  review_comments: string;
  bookmark_type: string;
  analysis_id: string;
  resolved: boolean;
}

interface BackendToolPayload {
  status: number;
  message: string;
  document_id: string;
  framework_id: string | null;
  total_annotations: number;
  annotations: BackendAnnotation[];
  final_verdict?: {
    summary: string;
    high_severity_count: number;
    total_annotations: number;
    document_status: number;
    verdict: string;
    critical_issues: string[];
    low_severity_count: number;
    medium_severity_count: number;
    compliance_score: number;
  };
  cached?: boolean;
  cached_at?: string;
  cache_metadata?: {
    pages_analyzed: number;
    blocks_processed: number;
  };
}

interface BackendResponse {
  error_message: string;
  tool_payload: { data: BackendToolPayload };
  summarised_markdown: string;
  suggested_next_actions: Array<{
    action: string;
    description: string;
  }>;
  session_id: string;
}

interface FrontendAnnotation {
  id: string;
  session_id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
  action: 'bookmark';
  bookmarkType: BookmarkType;
  bookmarkNote: string;
  resolved: boolean;
  highlightedText?: string;
}

interface FrontendResponse {
  annotations: FrontendAnnotation[];
  metadata: {
    framework: string;
    compliance_score: number;
    verdict: string;
    summary: string;
    cached: boolean;
  };
}

/**
 * Maps backend bookmark types to frontend BookmarkType
 */
function mapBookmarkType(backendType: string): BookmarkType {
  const mapping: Record<string, BookmarkType> = {
    action_required: 'important',
    info: 'review-later',
    warning: 'verify',
    question: 'question',
    critical: 'important',
  };
  return mapping[backendType.toLowerCase()] || 'review-later';
}

/**
 * GET /api/annotations/[documentId]
 * Fetches annotations for a given analysis session and transforms them
 * to the format expected by the frontend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

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
    // Call the Lambda API
    const lambdaUrl = env.NEXT_PUBLIC_API_BASE_URL;

    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `load_annotations for [document_id=${documentId}]`,
      }),
    });

    if (!lambdaResponse.ok) {
      console.log('Lambda response status:', lambdaResponse.status);
      const statusText = await lambdaResponse.text();
      console.log('Lambda response text:', statusText);
      throw new Error(
        `Lambda API returned ${lambdaResponse.status}: ${lambdaResponse.statusText}`
      );
    }
    console.log('Lambda response status:', lambdaResponse.status);
    const backendData: BackendResponse = await lambdaResponse.json();
    const payload = backendData.tool_payload.data;
    console.log('Backend payload:', backendData);

    // Check for errors
    if (backendData.error_message && payload !== undefined) {
      throw new Error(backendData.error_message);
    }

    const { annotations = [] } = payload;
    // Transform backend response to frontend format
    const frontendAnnotations: FrontendAnnotation[] = annotations.map(
      (ann: BackendAnnotation) => ({
        id: ann.annotation_id,
        session_id: ann.file_id,
        page: ann.page_number,
        x: ann.x,
        y: ann.y,
        width: ann.width,
        height: ann.height,
        timestamp: Date.now(),
        action: 'bookmark' as const,
        bookmarkType: mapBookmarkType(ann.bookmark_type),
        bookmarkNote: ann.review_comments,
        resolved: ann.resolved,
      })
    );

    const response: FrontendResponse = {
      annotations: frontendAnnotations,
      metadata: {
        framework: payload.framework_id || 'Unknown',
        compliance_score: payload.final_verdict?.compliance_score || 0,
        verdict: payload.final_verdict?.verdict || 'PENDING',
        summary:
          payload.final_verdict?.summary || backendData.summarised_markdown,
        cached: payload.cached || false,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json(
      {
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch annotations',
      },
      { status: 500 }
    );
  }
}
