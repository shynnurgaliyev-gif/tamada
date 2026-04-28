import type { MetadataRoute } from 'next';

import { WEB_URL } from '@/lib/env';

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
