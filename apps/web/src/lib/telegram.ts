/* ── Telegram Web App SDK — global type augmentation ──────────────────────────
   Placed in src/lib so any part of the app can reference window.Telegram
   without importing from a feature-specific folder.
────────────────────────────────────────────────────────────────────────────── */

export interface TelegramWebApp {
  ready(): void;
  expand(): void;
  colorScheme: 'light' | 'dark';
  initData: string;
  initDataUnsafe: {
    start_param?: string;
    user?: TgUser;
  };
  BackButton: {
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
  };
  onEvent(eventType: string, handler: () => void): void;
  offEvent(eventType: string, handler: () => void): void;
  safeAreaInset: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset: { top: number; bottom: number; left: number; right: number };
  requestFullscreen(): void;
  exitFullscreen(): void;
  isFullscreen: boolean;
}

export type TgUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

/** Returns the Telegram WebApp instance if running inside Telegram, else undefined. */
export function getTelegramWebApp(): TelegramWebApp | undefined {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
}

/* ── Global Window augmentation ─────────────────────────────────────────────── */
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
