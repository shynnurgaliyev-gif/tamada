import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Поиск исполнителей',
  description: 'Найдите тамаду, фотографа, видеографа, диджея и других специалистов в Казахстане. Фильтры по городу, дате и цене. Смотрите занятость прямо на профиле.',
  openGraph: {
    title: 'Поиск исполнителей | Octiqa',
    description: 'Octiqa — найдите исполнителя на свадьбу или мероприятие в Казахстане. Управление занятостью, прямые контакты.',
    type: 'website',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
