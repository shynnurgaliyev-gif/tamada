import postgres from 'postgres';
import type { AppEnv } from '@octiqa/config';

export type Db = ReturnType<typeof postgres>;

export function createDb(env: AppEnv): Db {
  return postgres(env.DATABASE_URL, {
    prepare: false, // Required for Supabase PgBouncer
    max: 10,
  });
}
