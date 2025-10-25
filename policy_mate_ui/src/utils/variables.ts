// filePath: policy_mate_ui/src/utils/variables.ts
import { z } from 'zod';

export const ClientEnvSchema = z.object({
  NEXT_PUBLIC_AWS_REGION: z
    .string()
    .min(1, 'NEXT_PUBLIC_AWS_REGION is required'),
  NEXT_PUBLIC_COGNITO_CLIENT_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_COGNITO_CLIENT_ID is required'),
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_COGNITO_USER_POOL_ID is required'),
  NEXT_PUBLIC_API_BASE_URL: z.url(
    'NEXT_PUBLIC_API_BASE_URL must be a valid URL'
  ),
  NEXT_PUBLIC_AWS_GATEWAY_URL: z.url(
    'NEXT_PUBLIC_AWS_GATEWAY_URL must be a valid URL'
  ),
  NEXT_PUBLIC_LONG_API_BASE_URL: z.url(
    'NEXT_PUBLIC_API_BASE_URL must be a valid URL'
  ),
});

export type ClientEnvVariables = z.infer<typeof ClientEnvSchema>;

console.log('🔧 Validating environment variables...');

const env: ClientEnvVariables = {
  NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION!,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  NEXT_PUBLIC_COGNITO_USER_POOL_ID:
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL!,
  NEXT_PUBLIC_LONG_API_BASE_URL: process.env.NEXT_PUBLIC_LONG_API_BASE_URL!,
  NEXT_PUBLIC_AWS_GATEWAY_URL: process.env.NEXT_PUBLIC_AWS_GATEWAY_URL!,
};

ClientEnvSchema.parse(env); // This will throw if the environment variables are not valid
export { env };
