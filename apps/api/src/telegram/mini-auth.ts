import crypto from 'crypto';

export type TelegramMiniUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type VerifiedInitData = {
  user: TelegramMiniUser;
  authDate: Date;
  startParam: string | null;
};

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 24 * 60 * 60,
): VerifiedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const providedHash = params.get('hash');
  if (!providedHash) return null;
  params.delete('hash');

  const authDateRaw = params.get('auth_date');
  const authDateSeconds = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isFinite(authDateSeconds) || authDateSeconds <= 0) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - authDateSeconds) > maxAgeSeconds) return null;

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!timingSafeHexEqual(providedHash, computedHash)) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;

  let user: TelegramMiniUser;
  try {
    user = JSON.parse(userRaw) as TelegramMiniUser;
  } catch {
    return null;
  }
  if (!user || typeof user.id !== 'number') return null;

  return {
    user,
    authDate: new Date(authDateSeconds * 1000),
    startParam: params.get('start_param'),
  };
}

function timingSafeHexEqual(a: string, b: string): boolean {
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b)) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
