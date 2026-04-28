/* ── env ──────────────────────────────────────────────────────────────────────
   Zod-validated public env vars for the Next.js client/server.

   Why: previously every page had `process.env['NEXT_PUBLIC_API_URL'] ?? ''`,
   which silently broke all fetches when the var was missing. This module
   throws at import time on misconfiguration.

   Notes:
   - Only NEXT_PUBLIC_* are read here; Next.js inlines those at build time so
     they're available on both server and client. Server-only secrets MUST
     stay out of this file.
────────────────────────────────────────────────────────────────────────────── */

import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WEB_URL: z.string().url().default('https://octiqa.kz'),
});

const result = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
  NEXT_PUBLIC_WEB_URL: process.env['NEXT_PUBLIC_WEB_URL'],
});

if (!result.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid public env:', result.error.flatten().fieldErrors);
  throw new Error('Invalid public environment variables (NEXT_PUBLIC_*)');
}

export const env = result.data;
export const API_URL = env.NEXT_PUBLIC_API_URL;
export const WEB_URL = env.NEXT_PUBLIC_WEB_URL;
