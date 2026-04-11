import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { searchProviders, getSearchMeta, type SortOption } from './repositories';
import { photoPublicUrl, PHOTOS_BUCKET } from '../supabase';

// Parse 'YYYY-MM-DD' + 'HH:MM' as Almaty local time (UTC+5)
function parseAlmatyDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000+05:00`);
}

export function createSearchRoutes(db: Db, env: AppEnv) {
  const plugin: FastifyPluginAsync = async (app) => {

    // GET /search/providers
    app.get('/search/providers', async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;

      const dateFrom = q['date'] && q['time_from']
        ? parseAlmatyDateTime(q['date'], q['time_from'])
        : undefined;
      const dateTo = q['date'] && q['time_to']
        ? parseAlmatyDateTime(q['date'], q['time_to'])
        : q['date'] && q['time_from']
          ? parseAlmatyDateTime(q['date'], '23:59')
          : undefined;

      const { results, total } = await searchProviders(db, {
        country:      q['country'],
        region:       q['region'],
        city:         q['city'],
        category:     q['category'],
        subcategory:  q['subcategory'],
        dateFrom,
        dateTo,
        priceFrom:    q['price_from']  ? Number(q['price_from'])  : undefined,
        priceTo:      q['price_to']    ? Number(q['price_to'])    : undefined,
        featured:     q['featured'] === 'true' ? true : undefined,
        hasInstagram: q['has_instagram'] === 'true' ? true : undefined,
        hasWhatsapp:  q['has_whatsapp']  === 'true' ? true : undefined,
        hasTwoGis:    q['has_two_gis']   === 'true' ? true : undefined,
        sort:         (q['sort'] as SortOption | undefined),
        page:         q['page']  ? Math.max(1, parseInt(q['page'],  10)) : 1,
        limit:        q['limit'] ? Math.min(50, parseInt(q['limit'], 10)) : 20,
      });

      // Add full cover URLs
      const providers = results.map(r => ({
        ...r,
        cover_url: r.cover_path ? photoPublicUrl(env, r.cover_path) : null,
      }));

      const limit = q['limit'] ? Math.min(50, parseInt(q['limit'], 10)) : 20;
      const page  = q['page']  ? Math.max(1, parseInt(q['page'],  10))  : 1;

      return reply.send({
        ok: true,
        providers,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    });

    // GET /search/filters/meta
    app.get('/search/filters/meta', async (_req, reply) => {
      const meta = await getSearchMeta(db);
      return reply.send({ ok: true, ...meta });
    });
  };

  return plugin;
}
