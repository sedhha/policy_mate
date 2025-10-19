import { NextRequest, NextResponse } from 'next/server';

type BookmarkType = 'review-later' | 'verify' | 'important' | 'question';

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
 * GET /api/annotations/[sessionId]
 * Fetches annotations for a given analysis session and transforms them
 * to the format expected by the frontend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  try {
    // TODO: Replace this with actual backend API call
    // const response = await fetch(`${process.env.BACKEND_URL}/api/analysis/${sessionId}`);
    // const backendData = await response.json();
    // TODO: Replace this with actual backend API call
    // const response = await fetch(`${process.env.BACKEND_URL}/api/analysis/${sessionId}`);
    // const backendData = await response.json();

    // Simulated backend response (your actual backend structure)
    const backendData = {
      status: 200,
      message: 'Comprehensive analysis completed',
      success: true,
      document_id: 'ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c',
      analysis_id: sessionId,
      framework: 'GDPR',
      annotations_count: 5,
      annotations: [
        {
          annotation_id: '0199fbd0-981a-7f92-8851-ab87ef9caeac',
          page_number: 1,
          file_id: 'ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c',
          x: 74,
          width: 453,
          y: 317,
          review_comments:
            '🔴 **GDPR-12.1** - HIGH\n\n**Issue:**\nThe policy does not specify how individuals can withdraw consent as easily as it was given.\n\n**Recommended Action:**\nProvide details on the process for individuals to withdraw consent, such as the methods available and the timeframe for honoring such requests.\n\n---\n*AI-generated compliance analysis*',
          bookmark_type: 'action_required',
          analysis_id: sessionId,
          resolved: false,
          height: 57,
        },
        {
          annotation_id: '0199fbd0-981b-7a87-bbae-cc1a58a58762',
          page_number: 1,
          file_id: 'ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c',
          x: 74,
          width: 458,
          y: 413,
          review_comments:
            '🔴 **GDPR-13.1** - HIGH\n\n**Issue:**\nThe policy does not specify the data retention periods for different categories of personal data.\n\n**Recommended Action:**\nClearly define the retention periods for each type of personal data collected and processed, and ensure they are in line with the data minimization principle.\n\n---\n*AI-generated compliance analysis*',
          bookmark_type: 'action_required',
          analysis_id: sessionId,
          resolved: false,
          height: 57,
        },
        {
          annotation_id: '0199fbd0-981c-7cab-9219-577e280209b1',
          page_number: 1,
          file_id: 'ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c',
          x: 74,
          width: 465,
          y: 509,
          review_comments:
            '🔴 **GDPR-15.1** - HIGH\n\n**Issue:**\nThe policy does not provide details on the process for individuals to exercise their right of access to their personal data.\n\n**Recommended Action:**\nDescribe the specific steps individuals must take to submit a request to access their personal data, including the information they must provide and the timeframe for the company to respond.\n\n---\n*AI-generated compliance analysis*',
          bookmark_type: 'action_required',
          analysis_id: sessionId,
          resolved: false,
          height: 57,
        },
        {
          annotation_id: '0199fbd0-981d-74b5-a67f-9c4b1609115a',
          page_number: 2,
          file_id: 'ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c',
          x: 74,
          width: 468,
          y: 73,
          review_comments:
            '⚪ **GDPR-28.1** - CRITICAL\n\n**Issue:**\nThe policy does not specify the requirements for Data Processing Agreements (DPAs) with vendors and third parties, such as the mandatory clauses that must be included.\n\n**Recommended Action:**\nProvide details on the mandatory components of the DPAs, including the specific contractual clauses required to ensure GDPR compliance by vendors and third parties.\n\n---\n*AI-generated compliance analysis*',
          bookmark_type: 'action_required',
          analysis_id: sessionId,
          resolved: false,
          height: 45,
        },
        {
          annotation_id: '0199fbd0-981e-7f12-94d1-5f6c5d1ec016',
          page_number: 2,
          file_id: 'ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c',
          x: 74,
          width: 465,
          y: 157,
          review_comments:
            '⚪ **GDPR-32.1** - CRITICAL\n\n**Issue:**\nThe policy does not describe the specific technical and organizational measures used to secure personal data transferred outside the EEA, such as the encryption methods and other safeguards employed.\n\n**Recommended Action:**\nClearly document the technical and organizational measures used to secure personal data transferred outside the EEA, including the specific encryption methods, access controls, and other safeguards implemented.\n\n---\n*AI-generated compliance analysis*',
          bookmark_type: 'action_required',
          analysis_id: sessionId,
          resolved: false,
          height: 45,
        },
      ],
      final_verdict: {
        summary:
          'Document has significant compliance gaps with GDPR. 3 critical issues require immediate attention.',
        high_severity_count: 3,
        total_annotations: 5,
        document_status: 52,
        verdict: 'NON_COMPLIANT',
        critical_issues: [
          'The policy does not specify how individuals can withdraw consent as easily as it was given.',
          'The policy does not specify the data retention periods for different categories of personal data.',
          'The policy does not provide details on the process for individuals to exercise their right of access to their personal data.',
        ],
        low_severity_count: 0,
        medium_severity_count: 0,
        compliance_score: 70,
      },
      cached: true,
      cached_at: '2025-10-19T09:32:56.045947+00:00',
      cache_metadata: {
        pages_analyzed: 15,
        blocks_processed: 5,
      },
    };

    // Transform backend response to frontend format
    const frontendAnnotations: FrontendAnnotation[] =
      backendData.annotations.map((ann) => ({
        id: ann.annotation_id,
        session_id: ann.analysis_id,
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
      }));

    const response: FrontendResponse = {
      annotations: frontendAnnotations,
      metadata: {
        framework: backendData.framework,
        compliance_score: backendData.final_verdict.compliance_score,
        verdict: backendData.final_verdict.verdict,
        summary: backendData.final_verdict.summary,
        cached: backendData.cached,
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
