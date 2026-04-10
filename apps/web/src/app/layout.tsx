import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Тамада',
  description: 'Тамада — платформа для организации мероприятий',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
