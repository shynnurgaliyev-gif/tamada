import type { Metadata } from 'next';
import './globals.css';

const WEB_URL = process.env['NEXT_PUBLIC_WEB_URL'] ?? 'https://linkora.kz';

export const metadata: Metadata = {
  title: {
    default: 'Linkora — найдите исполнителя на мероприятие в Казахстане',
    template: '%s | Linkora',
  },
  description: 'Linkora связывает клиентов и исполнителей. Тамады, фотографы, видеографы, диджеи и другие специалисты по всему Казахстану — профили, календарь занятости, прямые контакты.',
  metadataBase: new URL(WEB_URL),
  openGraph: {
    siteName: 'Linkora',
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
