import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { searchProviders, getSearchMeta, type SortOption } from './repositories';
import { photoPublicUrl } from '../supabase';
import { parseSearchQuery } from './ai-parser';

// Parse 'YYYY-MM-DD' + 'HH:MM' as Almaty local time (UTC+5)
function parseAlmatyDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000+05:00`);
}

function addCoverUrls<T extends { cover_path: string | null }>(env: AppEnv, results: T[]) {
  return results.map(r => ({ ...r, cover_url: r.cover_path ? photoPublicUrl(env, r.cover_path) : null }));
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

      const limit = q['limit'] ? Math.min(50, parseInt(q['limit'], 10)) : 20;
      const page  = q['page']  ? Math.max(1, parseInt(q['page'],  10))  : 1;

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
        featured:     q['featured']      === 'true' ? true : undefined,
        hasInstagram: q['has_instagram'] === 'true' ? true : undefined,
        hasWhatsapp:  q['has_whatsapp']  === 'true' ? true : undefined,
        hasTwoGis:    q['has_two_gis']   === 'true' ? true : undefined,
        sort:  q['sort'] as SortOption | undefined,
        page,
        limit,
      });

      return reply.send({
        ok: true,
        providers: addCoverUrls(env, results),
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

    // POST /search/parse  — text → structured filters (no search executed)
    app.post('/search/parse', async (req, reply) => {
      const body  = req.body as Record<string, unknown>;
      const query = typeof body['query'] === 'string' ? body['query'].trim() : '';
      if (!query) return reply.code(400).send({ ok: false, error: 'query required' });

      const result = await parseSearchQuery(query, env);
      return reply.send({ ok: true, ...result });
    });

    // POST /search/ai  — text → parse + search in one shot
    app.post('/search/ai', async (req, reply) => {
      const body  = req.body as Record<string, unknown>;
      const query = typeof body['query'] === 'string' ? body['query'].trim() : '';
      if (!query) return reply.code(400).send({ ok: false, error: 'query required' });

      const { filters, understood, mode } = await parseSearchQuery(query, env);

      const dateFrom = filters.date && filters.time_from
        ? parseAlmatyDateTime(filters.date, filters.time_from)
        : undefined;
      const dateTo = filters.date && filters.time_to
        ? parseAlmatyDateTime(filters.date, filters.time_to)
        : filters.date && filters.time_from
          ? parseAlmatyDateTime(filters.date, '23:59')
          : undefined;

      const { results, total } = await searchProviders(db, {
        city:         filters.city,
        region:       filters.region,
        category:     filters.category,
        subcategory:  filters.subcategory,
        dateFrom,
        dateTo,
        priceFrom:    filters.price_from,
        priceTo:      filters.price_to,
        featured:     filters.featured,
        sort: 'featured_first',
        page: 1,
        limit: 18,
      });

      return reply.send({
        ok: true,
        filters,
        understood,
        mode,
        providers: addCoverUrls(env, results),
        total,
        pages: Math.ceil(total / 18),
      });
    });
  };

  return plugin;
}
