import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import {
  getCountries, getRegions, getCities,
  getCategories, getSubcategories,
  getCurrencies, getLinkTypes,
} from './repositories';

export function createReferenceRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    // GET /reference/countries
    app.get('/reference/countries', async () => {
      const data = await getCountries(db);
      return { ok: true, countries: data };
    });

    // GET /reference/regions?country_id=
    app.get<{ Querystring: { country_id?: string } }>('/reference/regions', async (req) => {
      const data = await getRegions(db, req.query.country_id);
      return { ok: true, regions: data };
    });

    // GET /reference/cities?region_id=
    app.get<{ Querystring: { region_id?: string } }>('/reference/cities', async (req) => {
      const data = await getCities(db, req.query.region_id);
      return { ok: true, cities: data };
    });

    // GET /reference/categories
    app.get('/reference/categories', async () => {
      const data = await getCategories(db);
      return { ok: true, categories: data };
    });

    // GET /reference/subcategories?category_id=
    app.get<{ Querystring: { category_id?: string } }>('/reference/subcategories', async (req) => {
      const data = await getSubcategories(db, req.query.category_id);
      return { ok: true, subcategories: data };
    });

    // GET /reference/currencies
    app.get('/reference/currencies', async () => {
      const data = await getCurrencies(db);
      return { ok: true, currencies: data };
    });

    // GET /reference/link-types
    app.get('/reference/link-types', async () => {
      const data = await getLinkTypes(db);
      return { ok: true, linkTypes: data };
    });
  };
}
