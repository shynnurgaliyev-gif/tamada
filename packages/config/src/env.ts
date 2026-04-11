import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('tamada-api'),
  APP_PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: z.string(),
  DATABASE_DIRECT_URL: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Auth
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_EXPIRES_DAYS: z.coerce.number().default(30),

  // WhatsApp
  WHATSAPP_PROVIDER: z.enum(['stub', 'real']).default('stub'),
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_API_KEY: z.string().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),

  // Payments
  KASPI_API_KEY: z.string().optional(),

  // Security
  CORS_ORIGINS: z.string().optional(), // comma-separated list of allowed origins

  // Jobs / Reminders
  INTERNAL_JOBS_SECRET: z.string().optional(),
  CALENDAR_STALE_DAYS: z.coerce.number().default(7),
  DEFAULT_MORNING_REMINDER_HOUR: z.coerce.number().default(9),

  // AI Search
  AI_SEARCH_ENABLED: z.string().default('false'),
  OPENAI_API_KEY: z.string().optional(),
  AI_SEARCH_MODEL: z.string().default('gpt-4o-mini'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(): AppEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return result.data;
}
