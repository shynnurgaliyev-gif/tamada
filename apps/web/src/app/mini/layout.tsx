import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Octiqa',
  // Prevent indexing of the Mini App shell
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Telegram Web App SDK — must load before React hydration so that
        window.Telegram.WebApp is available synchronously on first render.
      */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
