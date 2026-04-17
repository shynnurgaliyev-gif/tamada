import { parseEnv } from '@tamada/config';
import { createApp } from './app';
import { createDb } from './db';
import { createSupabaseClient } from './supabase';
import { createWhatsAppProvider } from './auth/whatsapp';

async function registerTelegramWebhook(env: ReturnType<typeof parseEnv>, log: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void }): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const webhookUrl = `${env.APP_BASE_URL}/telegram/webhook`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (data.ok) {
      log.info(`Telegram webhook registered: ${webhookUrl}`);
    } else {
      log.warn(`Telegram webhook registration failed: ${data.description ?? 'unknown error'}`);
    }
  } catch (err) {
    log.error(`Telegram webhook registration error: ${String(err)}`);
  }
}

async function main() {
  const env = parseEnv();
  const db = createDb(env);
  const supabase = createSupabaseClient(env);
  const wa = createWhatsAppProvider(env);
  const app = createApp(env, db, supabase, wa);

  try {
    await app.listen({ port: env.APP_PORT, host: '0.0.0.0' });
    app.log.info(`${env.APP_NAME} running on port ${env.APP_PORT}`);
    await registerTelegramWebhook(env, app.log);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
