import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type ProviderPublic = {
  display_name: string;
  slug: string;
  bio: string | null;
  city: string | null;
  region: string | null;
};

async function fetchProvider(slug: string): Promise<ProviderPublic | null> {
  try {
    const res = await fetch(`${API}/public/providers/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { ok: boolean; provider?: ProviderPublic };
    return data.ok ? (data.provider ?? null) : null;
  } catch {
    return null;
  }
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await fetchProvider(slug);

  if (!provider) {
    return {
      title: 'Профиль не найден',
      robots: { index: false },
    };
  }

  const location = [provider.city, provider.region].filter(Boolean).join(', ');
  const title = location
    ? `${provider.display_name} — ${location}`
    : provider.display_name;
  const description = provider.bio
    ? provider.bio.slice(0, 160)
    : `Профиль исполнителя ${provider.display_name} на Linkora. Услуги, фото, контакты и календарь занятости.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Linkora`,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${title} | Linkora`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProviderPage({ params }: PageProps) {
  const { slug } = await params;
  return <ProfileClient slug={slug} />;
}
