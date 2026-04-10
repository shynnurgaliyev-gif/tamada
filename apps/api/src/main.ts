import { parseEnv } from '@tamada/config';
import { createApp } from './app';
import { createDb } from './db';
import { createWhatsAppProvider } from './auth/whatsapp';

async function main() {
  const env = parseEnv();
  const db = createDb(env);
  const wa = createWhatsAppProvider(env);
  const app = createApp(env, db, wa);

  try {
    await app.listen({ port: env.APP_PORT, host: '0.0.0.0' });
    app.log.info(`${env.APP_NAME} running on port ${env.APP_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
