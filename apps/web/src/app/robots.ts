import type { MetadataRoute } from 'next';

const WEB_URL = process.env['NEXT_PUBLIC_WEB_URL'] ?? 'https://linkora.kz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/search', '/p/'],
        disallow: ['/dashboard/', '/api/'],
      },
    ],
    sitemap: `${WEB_URL}/sitemap.xml`,
  };
}
