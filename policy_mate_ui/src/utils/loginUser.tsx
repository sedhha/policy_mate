import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    SignUpCommand,
    ConfirmSignUpCommand,
    GetUserCommand,
    ResendConfirmationCodeCommand,
    InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { env } from "@/utils/variables";

export const loginWithAwsCognito = async (username: string, password: string): Promise<{ data?: InitiateAuthCommandOutput; error?: string }> => {
    const client = new CognitoIdentityProviderClient({ region: env.NEXT_PUBLIC_AWS_REGION });
    const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
        },
    });

    try {
        const response = await client.send(command);
        console.log('Login successful:', response);
        return { data: response };
    } catch (error) {
        console.log("Error occurred during login", (error as Error).message);
        console.error('Login failed:', error);
        return { error: (error as Error).message };
    }
};
