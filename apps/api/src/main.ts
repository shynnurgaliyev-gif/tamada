import { parseEnv } from '@tamada/config';
import { createApp } from './app';

async function main() {
  const env = parseEnv();
  const app = createApp(env);

  try {
    await app.listen({ port: env.APP_PORT, host: '0.0.0.0' });
    app.log.info(`${env.APP_NAME} running on port ${env.APP_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
