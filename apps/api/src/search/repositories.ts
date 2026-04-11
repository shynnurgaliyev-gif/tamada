import type { Db } from '../db';

export type SortOption = 'featured_first' | 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export type SearchFilters = {
  country?: string | undefined;
  region?: string | undefined;
  city?: string | undefined;
  category?: string | undefined;
  subcategory?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  priceFrom?: number | undefined;
  priceTo?: number | undefined;
  featured?: boolean | undefined;
  hasInstagram?: boolean | undefined;
  hasWhatsapp?: boolean | undefined;
  hasTwoGis?: boolean | undefined;
  sort?: SortOption | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export type SearchResult = {
  id: string;
  display_name: string;
  slug: string;
  bio: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  is_featured: boolean;
  is_verified: boolean;
  cover_path: string | null;
  min_price: string | null;
  min_currency: string | null;
  categories: string[] | null;
  has_instagram: boolean;
  has_whatsapp: boolean;
  has_two_gis: boolean;
};

export type SearchMeta = {
  countries: string[];
  regions: string[];
  cities: string[];
  categories: string[];
};

export async function searchProviders(
  db: Db,
  filters: SearchFilters,
): Promise<{ results: SearchResult[]; total: number }> {
  const limit = Math.min(filters.limit ?? 20, 50);
  const offset = ((filters.page ?? 1) - 1) * limit;

  const sort = filters.sort ?? 'featured_first';
  const orderClause =
    sort === 'price_asc'  ? db`ORDER BY v.min_price::numeric ASC NULLS LAST, v.is_featured DESC` :
    sort === 'price_desc' ? db`ORDER BY v.min_price::numeric DESC NULLS LAST, v.is_featured DESC` :
    sort === 'name_asc'   ? db`ORDER BY v.display_name ASC` :
    sort === 'newest'     ? db`ORDER BY v.created_at DESC` :
    /* featured_first */    db`ORDER BY v.is_featured DESC, v.created_at DESC`;

  // Availability check: no overlapping busy/blocked/tentative entries
  const availFilter = filters.dateFrom && filters.dateTo
    ? db`AND NOT EXISTS (
          SELECT 1 FROM calendar_entries ce
          WHERE ce.provider_id = v.id
            AND ce.status = ANY(ARRAY['busy','blocked','tentative']::calendar_entry_status[])
            AND ce.starts_at < ${filters.dateTo}
            AND ce.ends_at   > ${filters.dateFrom}
        )`
    : db``;

  // Category + subcategory (uses services table directly for subcategory precision)
  const catFilter = filters.subcategory && filters.category
    ? db`AND EXISTS (
          SELECT 1 FROM provider_services ps
          WHERE ps.provider_id = v.id AND ps.is_active = true
            AND ps.category    = ${filters.category}
            AND ps.subcategory = ${filters.subcategory}
        )`
    : filters.category
      ? db`AND ${filters.category} = ANY(v.categories)`
      : db``;

  // Price filter against services table
  const priceFilter = filters.priceFrom !== undefined || filters.priceTo !== undefined
    ? db`AND EXISTS (
          SELECT 1 FROM provider_services ps
          WHERE ps.provider_id = v.id AND ps.is_active = true
            AND ps.price_from IS NOT NULL
            ${filters.priceFrom !== undefined ? db`AND ps.price_from::numeric >= ${filters.priceFrom}` : db``}
            ${filters.priceTo   !== undefined ? db`AND ps.price_from::numeric <= ${filters.priceTo}`   : db``}
        )`
    : db``;

  const results = await db<SearchResult[]>`
    SELECT v.*
    FROM   public_providers_search v
    WHERE  1 = 1
      ${filters.country   ? db`AND v.country_code = ${filters.country}`  : db``}
      ${filters.region    ? db`AND v.region        = ${filters.region}`   : db``}
      ${filters.city      ? db`AND v.city          = ${filters.city}`     : db``}
      ${filters.featured  ? db`AND v.is_featured   = true`               : db``}
      ${filters.hasInstagram ? db`AND v.has_instagram = true`             : db``}
      ${filters.hasWhatsapp  ? db`AND v.has_whatsapp  = true`             : db``}
      ${filters.hasTwoGis    ? db`AND v.has_two_gis   = true`             : db``}
      ${catFilter}
      ${priceFilter}
      ${availFilter}
    ${orderClause}
    LIMIT  ${limit}
    OFFSET ${offset}
  `;

  const countRow = await db<{ total: string }[]>`
    SELECT COUNT(*) AS total
    FROM   public_providers_search v
    WHERE  1 = 1
      ${filters.country   ? db`AND v.country_code = ${filters.country}`  : db``}
      ${filters.region    ? db`AND v.region        = ${filters.region}`   : db``}
      ${filters.city      ? db`AND v.city          = ${filters.city}`     : db``}
      ${filters.featured  ? db`AND v.is_featured   = true`               : db``}
      ${filters.hasInstagram ? db`AND v.has_instagram = true`             : db``}
      ${filters.hasWhatsapp  ? db`AND v.has_whatsapp  = true`             : db``}
      ${filters.hasTwoGis    ? db`AND v.has_two_gis   = true`             : db``}
      ${catFilter}
      ${priceFilter}
      ${availFilter}
  `;

  const total = parseInt(countRow[0]?.total ?? '0', 10);
  return { results, total };
}

export async function getSearchMeta(db: Db): Promise<SearchMeta> {
  const [countries, regions, cities, cats] = await Promise.all([
    db<{ country_code: string }[]>`
      SELECT DISTINCT country_code FROM public_providers_search
      WHERE country_code IS NOT NULL ORDER BY country_code
    `,
    db<{ region: string }[]>`
      SELECT DISTINCT region FROM public_providers_search
      WHERE region IS NOT NULL ORDER BY region
    `,
    db<{ city: string }[]>`
      SELECT DISTINCT city FROM public_providers_search
      WHERE city IS NOT NULL ORDER BY city
    `,
    db<{ category: string }[]>`
      SELECT DISTINCT unnest(categories) AS category
      FROM public_providers_search
      WHERE categories IS NOT NULL ORDER BY 1
    `,
  ]);
  return {
    countries: countries.map(r => r.country_code),
    regions:   regions.map(r => r.region),
    cities:    cities.map(r => r.city),
    categories: cats.map(r => r.category),
  };
}
