import type { Metadata } from 'next';
import './globals.css';

const WEB_URL = process.env['NEXT_PUBLIC_WEB_URL'] ?? 'https://octiqa.kz';

export const metadata: Metadata = {
  title: {
    default: 'Octiqa — найдите исполнителя на мероприятие в Казахстане',
    template: '%s | Octiqa',
  },
  description: 'Octiqa — платформа, которая помогает исполнителю управлять занятостью и связывает его с клиентом. Тамады, фотографы, видеографы, диджеи по всему Казахстану.',
  metadataBase: new URL(WEB_URL),
  openGraph: {
    siteName: 'Octiqa',
    locale: 'ru_KZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
