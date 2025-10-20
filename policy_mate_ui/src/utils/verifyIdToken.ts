// filePath: policy_mate_ui/src/utils/verifyIdToken.ts
import { env } from '@/utils/variables';

/**
 * Claims returned from the Lambda auth verification
 */
export interface TokenClaims {
  'sub': string; // User ID
  'email'?: string;
  'cognito:username'?: string;
  'email_verified'?: boolean;
  'iat'?: number; // Issued at
  'exp'?: number; // Expiration
  [key: string]: string | number | boolean | undefined;
}

/**
 * Response from the verify endpoint
 */
export interface VerifyTokenResponse {
  success: boolean;
  claims?: TokenClaims;
  userId?: string;
  email?: string;
  username?: string;
  error?: string;
  details?: string;
}

/**
 * Error class for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Verify an ID token by calling the Lambda auth verification endpoint
 *
 * @param idToken - The Cognito ID token to verify
 * @returns Promise resolving to the token claims if valid
 * @throws AuthenticationError if token is invalid or request fails
 *
 * @example
 * ```typescript
 * try {
 *   const claims = await verifyIdToken(idToken);
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     console.error('Auth failed:', error.statusCode, error.message);
 *   }
 * }
 * ```
 */
export async function verifyIdToken(
  idToken: string
): Promise<VerifyTokenResponse> {
  if (!idToken) {
    throw new AuthenticationError('ID token is required', 400);
  }

  const url = `${env.NEXT_PUBLIC_API_BASE_URL}/verify`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Parse response body
    const data: VerifyTokenResponse = await response.json();

    // Handle non-200 responses
    if (!response.ok) {
      const text = await response.text();
      const errorMessage = text || data.error || 'Token verification failed';
      const details = data.details || '';

      throw new AuthenticationError(errorMessage, response.status, details);
    }

    // Successful verification
    if (!data.success || !data.claims) {
      throw new AuthenticationError(
        'Invalid response format from verification endpoint',
        500
      );
    }

    return data;
  } catch (error) {
    // Re-throw AuthenticationError as-is
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Handle network or other errors
    if (error instanceof TypeError) {
      throw new AuthenticationError(
        'Network error: Unable to reach verification endpoint',
        0,
        error.message
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new AuthenticationError(
        'Invalid response from verification endpoint',
        500,
        error.message
      );
    }

    // Generic error handler
    throw new AuthenticationError(
      'Unexpected error during token verification',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Check if a token is valid without throwing errors
 * Useful for silent token validation
 *
 * @param idToken - The Cognito ID token to verify
 * @returns Promise resolving to true if valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await isTokenValid(idToken);
 * if (isValid) {
 *   // Proceed with authenticated operations
 * } else {
 *   // Redirect to login
 * }
 * ```
 */
export async function isTokenValid(idToken: string): Promise<boolean> {
  try {
    await verifyIdToken(idToken);
    return true;
  } catch {
    return false;
  }
}
