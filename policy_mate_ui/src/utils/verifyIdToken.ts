// filePath: policy_mate_ui/src/utils/verifyIdToken.ts
import { env } from '@/utils/variables';
import * as jose from 'jose';

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

// JWKS URL
const JWKS_URL = `https://cognito-idp.${env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

// Cache for JWKS
let jwksCache: any = null;

/**
 * Fetch JWKS from Cognito (with caching)
 */
async function getJwks(): Promise<any> {
  if (!jwksCache) {
    try {
      console.log('🔍 Fetching JWKS from:', JWKS_URL);

      const response = await fetch(JWKS_URL, {
        signal: AbortSignal.timeout(15000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      jwksCache = await response.json();
      console.log(
        '✅ JWKS fetched successfully, keys:',
        jwksCache.keys?.length
      );

      if (jwksCache.keys) {
        jwksCache.keys.forEach((key: any, idx: number) => {
          console.log(`  Key ${idx + 1} kid:`, key.kid);
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch JWKS:', error.message);
      throw new Error(`Failed to fetch JWKS: ${error.message}`);
    }
  } else {
    console.log('✅ Using cached JWKS');
  }

  return jwksCache;
}

/**
 * Validate JWT token and return claims
 */
export const verifyIdToken = async (
  idToken: string
): Promise<VerifyTokenResponse> => {
  console.log('🔐 Starting token verification...');

  try {
    // Decode the token header to get the kid
    const header = jose.decodeProtectedHeader(idToken);
    console.log('🔍 Token header:', header);
    console.log('🔑 Token kid:', header.kid);

    if (!header.kid) {
      throw new Error('Token missing kid in header');
    }

    // Get JWKS
    const jwks = await getJwks();

    // Find the matching key
    const key = jwks.keys.find((k: any) => k.kid === header.kid);

    if (!key) {
      console.error('❌ Key not found for kid:', header.kid);
      throw new Error('Invalid token key - kid not found in JWKS');
    }

    console.log('✅ Found matching key');

    // Import the JWK
    const publicKey = await jose.importJWK(key, header.alg);

    // Verify the token
    const { payload } = await jose.jwtVerify(idToken, publicKey, {
      issuer: `https://cognito-idp.${env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}`,
      // audience: env.NEXT_PUBLIC_COGNITO_CLIENT_ID, // Uncomment if you want to verify audience
    });

    console.log('✅ Token verified successfully! 🎉');
    console.log('👤 User ID:', payload.sub);
    console.log('📧 Email:', payload.email);

    return {
      success: true,
      claims: payload as TokenClaims,
      userId: payload.sub as string,
      email: payload.email as string,
      username: payload['cognito:username'] as string,
    };
  } catch (error: any) {
    console.error('=== Token Verification Error ===');
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message);

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
