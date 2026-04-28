import type { MetadataRoute } from 'next';

import { WEB_URL } from '@/lib/env';
import { API_URL } from '@/lib/env';

export const revalidate = 3600; // regenerate every hour

type SearchResult = {
  ok: boolean;
  providers?: Array<{ slug: string }>;
};

async function fetchAllProviderSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/search/providers?limit=50&page=1&sort=featured_first`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json() as SearchResult;
    const slugs: string[] = data.providers?.map(p => p.slug) ?? [];

    // Fetch remaining pages
    const firstData = data as SearchResult & { total?: number; pages?: number };
    const pages = firstData.pages ?? 1;
    if (pages > 1) {
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          fetch(`${API_URL}/search/providers?limit=50&page=${i + 2}&sort=featured_first`, {
            next: { revalidate: 3600 },
          })
            .then(r => r.json() as Promise<SearchResult>)
            .then(d => d.providers?.map(p => p.slug) ?? [])
            .catch(() => [] as string[]),
        ),
      );
      slugs.push(...rest.flat());
    }
    return slugs;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await fetchAllProviderSlugs();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: WEB_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${WEB_URL}/search`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
  ];

  const profileRoutes: MetadataRoute.Sitemap = slugs.map(slug => ({
    url: `${WEB_URL}/p/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...profileRoutes];
}
