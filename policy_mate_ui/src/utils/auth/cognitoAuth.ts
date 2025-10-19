import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Create a verifier for ID tokens
const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'unknown',
  tokenUse: 'id', // Specify we're verifying ID tokens
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
});

// Function to verify an ID token
export async function verifyIdToken(token: string) {
  try {
    // Verify the token - pass both token and props
    const payload = await idTokenVerifier.verify(token, {
      clientId:
        process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? 'your-app-client-id',
      tokenUse: 'id',
    });

    // console.log('Token is valid!');
    // console.log('User details:', {
    //   sub: payload.sub, // User's unique ID
    //   email: payload.email,
    //   username: payload['cognito:username'],
    //   // Access other claims as needed
    // });

    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
}

// Example usage
const token = 'eyJraWQiOiJ...'; // The ID token from your client
verifyIdToken(token)
  .then((payload) => {
    // Token is valid, proceed with your logic
    console.log('Authenticated user:', payload.sub);
  })
  .catch((err) => {
    // Token is invalid or expired
    console.error('Authentication failed');
  });
