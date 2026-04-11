import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Поиск исполнителей',
  description: 'Найдите тамаду, фотографа, видеографа, диджея и других исполнителей на мероприятие в Казахстане. Фильтры по городу, дате и цене.',
  openGraph: {
    title: 'Поиск исполнителей | Тамада',
    description: 'Найдите исполнителя на свадьбу или мероприятие в Казахстане.',
    type: 'website',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
