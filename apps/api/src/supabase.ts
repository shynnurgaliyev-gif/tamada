import { createClient } from '@supabase/supabase-js';
import type { AppEnv } from '@tamada/config';

export type SupabaseClient = ReturnType<typeof createClient>;

export const PHOTOS_BUCKET = 'provider-photos';

export function createSupabaseClient(env: AppEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export function photoPublicUrl(env: AppEnv, storagePath: string): string {
  return `${env.SUPABASE_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath}`;
}
