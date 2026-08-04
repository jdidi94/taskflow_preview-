import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  BASE_URL: z.string().default('http://localhost:3001'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  ADMIN_URL: z.string().default('http://localhost:5175'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5175'),
  DATABASE_URL: z.string().default('mongodb://localhost:27017/taskflow'),
  JWT_SECRET: z.string().min(1).default('dev-only-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().default('dev-only-encryption-key'),
  SMTP_ENABLED: z.coerce.boolean().default(false),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/google/callback'),
  GOOGLE_DRIVE_REDIRECT_URI: z
    .string()
    .default('http://localhost:5173/auth/drive-link-callback'),
  GOOGLE_API_GEMINI_API_KEY: z.string().default(''),
  GOOGLE_GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/github/callback'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-latest'),
  AZURE_OPENAI_API_KEY: z.string().default(''),
  AZURE_OPENAI_ENDPOINT: z.string().default(''),
  AZURE_OPENAI_DEPLOYMENT: z.string().default(''),
  DEFAULT_AI_PROVIDER: z.enum(['openai', 'google', 'anthropic', 'azure']).default('google'),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const data = parsed.data

if (data.NODE_ENV === 'production' && data.JWT_SECRET === 'dev-only-change-me') {
  console.error('JWT_SECRET must be set to a strong value in production')
  process.exit(1)
}

export const env = {
  ...data,
  corsOrigins: data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  isDev: data.NODE_ENV === 'development',
  isTest: data.NODE_ENV === 'test',
  isProd: data.NODE_ENV === 'production',
}

export type Env = typeof env
