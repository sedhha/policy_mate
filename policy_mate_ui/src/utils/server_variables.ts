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
  NEXT_PUBLIC_LONG_API_BASE_URL: z.url(
    'NEXT_PUBLIC_LONG_API_BASE_URL must be a valid URL'
  ),
  NEXT_PUBLIC_AWS_GATEWAY_URL: z.url(
    'NEXT_PUBLIC_AWS_GATEWAY_URL must be a valid URL'
  ),
  NEXT_AWS_ACCESS_KEY_ID: z
    .string()
    .min(1, 'NEXT_AWS_ACCESS_KEY_ID is required'),
  NEXT_AWS_SECRET_ACCESS_KEY: z
    .string()
    .min(1, 'NEXT_AWS_SECRET_ACCESS_KEY is required'),
  S3_BUCKET_NAME: z.string().min(1, 'S3_BUCKET_NAME is required'),
  PDF_URL_EXPIRY_SECONDS: z.number().optional(),
});
export type EnvVariables = z.infer<typeof EnvSchema>;

console.log('🔧 Validating environment variables...');
const server_env: EnvVariables = {
  NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION!,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL!,
  NEXT_PUBLIC_LONG_API_BASE_URL: process.env.NEXT_PUBLIC_LONG_API_BASE_URL!,
  NEXT_PUBLIC_AWS_GATEWAY_URL: process.env.NEXT_PUBLIC_AWS_GATEWAY_URL!,
  NEXT_AWS_ACCESS_KEY_ID: process.env.NEXT_AWS_ACCESS_KEY_ID!,
  NEXT_AWS_SECRET_ACCESS_KEY: process.env.NEXT_AWS_SECRET_ACCESS_KEY!,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
  PDF_URL_EXPIRY_SECONDS: isNaN(Number(process.env.PDF_URL_EXPIRY_SECONDS))
    ? 300
    : Number(process.env.PDF_URL_EXPIRY_SECONDS),
};

EnvSchema.parse(server_env); // This will throw if the environment variables are not valid
export { server_env };
