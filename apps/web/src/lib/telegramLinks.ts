const DEFAULT_TG_BOT_USERNAME = 'octiqa_mini_bot';
const DEFAULT_TG_MINIAPP_SHORT_NAME = 'octiqa';

function cleanBotUsername(value: string | undefined): string {
  const username = (value ?? DEFAULT_TG_BOT_USERNAME).trim().replace(/^@+/, '');
  return username || DEFAULT_TG_BOT_USERNAME;
}

function cleanMiniAppShortName(value: string | undefined): string {
  return (value ?? DEFAULT_TG_MINIAPP_SHORT_NAME).trim().replace(/^\/+/, '');
}

function withStartApp(baseUrl: string, startApp: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}startapp=${encodeURIComponent(startApp)}`;
}

export const TELEGRAM_BOT_USERNAME = cleanBotUsername(process.env['NEXT_PUBLIC_TG_BOT_USERNAME']);
export const TELEGRAM_MINIAPP_SHORT_NAME = cleanMiniAppShortName(process.env['NEXT_PUBLIC_TG_MINIAPP_SHORT_NAME']);

export const TELEGRAM_BOT_LINK = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
export const TELEGRAM_MINIAPP_LINK = TELEGRAM_MINIAPP_SHORT_NAME
  ? `${TELEGRAM_BOT_LINK}/${TELEGRAM_MINIAPP_SHORT_NAME}`
  : TELEGRAM_BOT_LINK;

export const TELEGRAM_ONBOARDING_LINK = withStartApp(TELEGRAM_MINIAPP_LINK, 'onboarding');
export const TELEGRAM_DASHBOARD_LINK = withStartApp(TELEGRAM_MINIAPP_LINK, 'dashboard');
