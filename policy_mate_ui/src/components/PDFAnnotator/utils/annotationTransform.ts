import type { BookmarkType, SimpleAnnotation } from '../types';

/**
 * Backend annotation structure from comprehensive analysis API
 */
export interface BackendAnnotation {
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
  highlighted_text?: string;
}

/**
 * Backend comprehensive analysis response structure
 */
export interface ComprehensiveAnalysisResponse {
  status: number;
  message: string;
  success: boolean;
  document_id: string;
  analysis_id: string;
  framework: string;
  annotations_count: number;
  annotations: BackendAnnotation[];
  final_verdict: {
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
  cached: boolean;
  cached_at: string;
  cache_metadata: {
    pages_analyzed: number;
    blocks_processed: number;
  };
}

/**
 * Maps backend bookmark types to frontend BookmarkType
 * Backend uses: 'action_required', 'info', 'warning', etc.
 * Frontend uses: 'review-later' | 'verify' | 'important' | 'question'
 */
export function mapBackendBookmarkType(backendType?: string): BookmarkType {
  if (!backendType) return 'review-later';

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
 * Transforms a backend annotation to frontend SimpleAnnotation format
 */
export function transformBackendAnnotation(
  backendAnn: BackendAnnotation
): SimpleAnnotation {
  return {
    id: backendAnn.annotation_id,
    session_id: backendAnn.analysis_id,
    page: backendAnn.page_number,
    x: backendAnn.x,
    y: backendAnn.y,
    width: backendAnn.width,
    height: backendAnn.height,
    timestamp: Date.now(), // Use current time or parse from backend if available
    action: 'bookmark', // Default to bookmark for compliance annotations
    bookmarkType: mapBackendBookmarkType(backendAnn.bookmark_type),
    bookmarkNote: backendAnn.review_comments || '',
    resolved: backendAnn.resolved ?? false,
    highlightedText: backendAnn.highlighted_text,
  };
}

/**
 * Transforms an array of backend annotations to frontend format
 */
export function transformBackendAnnotations(
  backendAnnotations: BackendAnnotation[]
): SimpleAnnotation[] {
  return backendAnnotations.map(transformBackendAnnotation);
}
