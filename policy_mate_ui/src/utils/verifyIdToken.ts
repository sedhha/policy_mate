// filePath: policy_mate_ui/src/utils/verifyIdToken.ts
import { server_env } from '@/utils/server_variables';

export interface TokenClaims {
  'sub': string;
  'email'?: string;
  'cognito:username'?: string;
  'email_verified'?: boolean;
  'iat'?: number;
  'exp'?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface VerifyTokenResponse {
  success: boolean;
  claims?: TokenClaims;
  userId?: string;
  email?: string;
  username?: string;
  error?: string;
  details?: string;
}

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
 * Validate JWT token via API endpoint and return claims
 */
export const verifyIdToken = async (
  idToken: string
): Promise<VerifyTokenResponse> => {
  console.log('🔐 Starting token verification via API...');

  try {
    const response = await fetch(
      `${server_env.NEXT_PUBLIC_AWS_GATEWAY_URL}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      }
    );

    if (!response.ok) {
      console.log('Nnon-ok response received during token verification.');
      const errorData = await response.json().catch(async () => ({
        error: await response.text(),
      }));
      console.error(
        '❌ Token verification failed:',
        response.status,
        errorData
      );
      throw new AuthenticationError(
        'Invalid or expired token',
        response.status,
        errorData.message || response.statusText
      );
    }

    const data = await response.json();
    console.log('✅ Token verification succeeded:', data);

    return {
      success: true,
      claims: data.claims as TokenClaims,
      userId: data.userId || (data.claims?.sub as string),
      email: data.email || (data.claims?.email as string),
      username: data.username || (data.claims?.['cognito:username'] as string),
    };
  } catch (error: any) {
    console.error('=== Token Verification Error ===');
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message);

    if (error instanceof AuthenticationError) {
      throw error;
    }

    throw new AuthenticationError(
      'Invalid or expired token',
      401,
      error.message
    );
  }
};

/**
 * Check if a token is valid without throwing errors
 */
export async function isTokenValid(idToken: string): Promise<boolean> {
  try {
    await verifyIdToken(idToken);
    return true;
  } catch {
    return false;
  }
}
