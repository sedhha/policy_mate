import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    ConfirmSignUpCommand,
    ResendConfirmationCodeCommand,
    SignUpCommandOutput,
    ConfirmSignUpCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { env } from "@/utils/variables";

export interface RegisterUserParams {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
}

export const registerWithAwsCognito = async ({
    email,
    password,
    username,
    firstName,
    lastName,
}: RegisterUserParams): Promise<{ data?: SignUpCommandOutput; error?: string }> => {
    const client = new CognitoIdentityProviderClient({ region: env.NEXT_PUBLIC_AWS_REGION });

    const userAttributes = [
        {
            Name: 'email',
            Value: email,
        },
    ];

    // Add optional attributes if provided
    if (firstName) {
        userAttributes.push({
            Name: 'given_name',
            Value: firstName,
        });
    }

    if (lastName) {
        userAttributes.push({
            Name: 'family_name',
            Value: lastName,
        });
    }

    const command = new SignUpCommand({
        ClientId: env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        Username: username,
        Password: password,
        UserAttributes: userAttributes,
    });

    try {
        const response = await client.send(command);
        return { data: response };
    } catch (error) {
        console.log("Error occurred during registration", (error as Error).message);
        console.error('Registration failed:', error);
        return { error: (error as Error).message };
    }
};

export const confirmRegistration = async (
    username: string,
    confirmationCode: string
): Promise<{ data?: ConfirmSignUpCommandOutput; error?: string }> => {
    const client = new CognitoIdentityProviderClient({ region: env.NEXT_PUBLIC_AWS_REGION });

    const command = new ConfirmSignUpCommand({
        ClientId: env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        Username: username,
        ConfirmationCode: confirmationCode,
    });

    try {
        const response = await client.send(command);
        return { data: response };
    } catch (error) {
        console.log("Error occurred during confirmation", (error as Error).message);
        console.error('Confirmation failed:', error);
        return { error: (error as Error).message };
    }
};

export const resendConfirmationCode = async (
    username: string
): Promise<{ success: boolean; error?: string }> => {
    const client = new CognitoIdentityProviderClient({ region: env.NEXT_PUBLIC_AWS_REGION });

    const command = new ResendConfirmationCodeCommand({
        ClientId: env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        Username: username,
    });

    try {
        await client.send(command);
        return { success: true };
    } catch (error) {
        console.log("Error occurred during resend", (error as Error).message);
        console.error('Resend failed:', error);
        return { success: false, error: (error as Error).message };
    }
};
