// filePath: policy_mate_ui/src/utils/variables.ts
import { z } from 'zod';

export const EnvSchema = z.object({
  NEXT_PUBLIC_AWS_REGION: z
    .string()
    .min(1, 'NEXT_PUBLIC_AWS_REGION is required'),
  NEXT_PUBLIC_COGNITO_CLIENT_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_COGNITO_CLIENT_ID is required'),
  NEXT_PUBLIC_API_BASE_URL: z.url(
    'NEXT_PUBLIC_API_BASE_URL must be a valid URL'
  ),
});
export type EnvVariables = z.infer<typeof EnvSchema>;

const env: EnvVariables = {
  NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION!,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL!,
};

EnvSchema.parse(env); // This will throw if the environment variables are not valid

export { env };
