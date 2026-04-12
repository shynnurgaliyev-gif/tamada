import type { Metadata } from 'next';
import './globals.css';

const WEB_URL = process.env['NEXT_PUBLIC_WEB_URL'] ?? 'https://tamada.kz';

export const metadata: Metadata = {
  title: {
    default: 'Тамада — исполнители на мероприятия в Казахстане',
    template: '%s | Тамада',
  },
  description: 'Найдите тамаду, фотографа, видеографа, диджея и других исполнителей на свадьбу и мероприятия в Казахстане.',
  metadataBase: new URL(WEB_URL),
  openGraph: {
    siteName: 'Тамада',
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
