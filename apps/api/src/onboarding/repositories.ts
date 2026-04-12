import type { Db } from '../db';

export type OnboardingRow = {
  id: string;
  provider_id: string;
  status: 'in_progress' | 'completed' | 'skipped';
  current_step: number;
  started_at: Date;
  completed_at: Date | null;
  updated_at: Date;
};

export async function findOnboarding(db: Db, providerId: string): Promise<OnboardingRow | null> {
  const rows = await db<OnboardingRow[]>`
    SELECT * FROM provider_onboarding WHERE provider_id = ${providerId} LIMIT 1
  `;
  return rows[0] ?? null;
}

// Upsert: advance step only forward (never go backwards)
export async function upsertOnboarding(db: Db, providerId: string, step: number): Promise<OnboardingRow> {
  const rows = await db<OnboardingRow[]>`
    INSERT INTO provider_onboarding (provider_id, current_step)
    VALUES (${providerId}, ${step})
    ON CONFLICT (provider_id) DO UPDATE SET
      current_step = GREATEST(provider_onboarding.current_step, ${step}),
      updated_at   = NOW()
    RETURNING *
  `;
  return rows[0]!;
}

export async function completeOnboarding(db: Db, providerId: string): Promise<void> {
  await db`
    INSERT INTO provider_onboarding (provider_id, status, current_step, completed_at)
    VALUES (${providerId}, 'completed', 5, NOW())
    ON CONFLICT (provider_id) DO UPDATE SET
      status       = 'completed',
      current_step = 5,
      completed_at = NOW(),
      updated_at   = NOW()
  `;
}
