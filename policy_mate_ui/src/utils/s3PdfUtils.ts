/**
 * S3 PDF Fetching Utilities
 *
 * This module provides type-safe utilities for fetching PDFs from S3
 * using pre-signed URLs for secure access.
 */

export interface S3PdfUrlRequest {
  bucket: string;
  key: string;
  filename?: string;
}

export interface S3PdfUrlResponse {
  status: 'success' | 'error';
  url?: string;
  expiresIn?: number;
  filename?: string;
  bucket?: string;
  key?: string;
  message?: string;
}

/**
 * Fetches a pre-signed URL for accessing a PDF stored in S3
 *
 * @param bucket - S3 bucket name
 * @param key - S3 object key (path to the PDF)
 * @param filename - Optional filename for the download
 * @param idToken - Authentication token
 * @returns Pre-signed URL response with expiry information
 *
 * @example
 * ```typescript
 * const result = await getS3PdfUrl(
 *   'my-bucket',
 *   'documents/abc-123.pdf',
 *   'compliance-doc.pdf',
 *   authToken
 * );
 * if (result.status === 'success') {
 *   // Use result.url to fetch the PDF
 * }
 * ```
 */
export async function getS3PdfUrl(
  bucket: string,
  key: string,
  filename: string,
  idToken: string
): Promise<S3PdfUrlResponse> {
  const params = new URLSearchParams({
    bucket,
    key,
    filename,
  });

  const response = await fetch(`/api/pdf?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      status: 'error',
      message:
        error.message || `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  return await response.json();
}

/**
 * Parses an S3 URI into bucket and key components
 *
 * @param s3Uri - S3 URI in format: s3://bucket-name/path/to/object
 * @returns Object with bucket and key, or null if invalid
 *
 * @example
 * ```typescript
 * const { bucket, key } = parseS3Uri('s3://my-bucket/docs/file.pdf');
 * // bucket: 'my-bucket'
 * // key: 'docs/file.pdf'
 * ```
 */
export function parseS3Uri(
  s3Uri: string
): { bucket: string; key: string } | null {
  const s3Pattern = /^s3:\/\/([^/]+)\/(.+)$/;
  const match = s3Uri.match(s3Pattern);

  if (!match) {
    return null;
  }

  return {
    bucket: match[1],
    key: match[2],
  };
}
