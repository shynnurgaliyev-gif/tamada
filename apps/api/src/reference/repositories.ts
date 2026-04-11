import type { Db } from '../db';

export type RefCountry = {
  id: string;
  code: string;
  name_ru: string;
  name_kz: string;
  sort_order: number;
};

export type RefRegion = {
  id: string;
  country_id: string;
  code: string;
  name_ru: string;
  name_kz: string;
  region_type: 'oblast' | 'city_republican';
  sort_order: number;
};

export type RefCity = {
  id: string;
  country_id: string;
  region_id: string;
  name_ru: string;
  name_kz: string;
  city_type: string;
  sort_order: number;
};

export type RefCategory = {
  id: string;
  code: string;
  name_ru: string;
  name_kz: string;
  icon: string | null;
  sort_order: number;
};

export type RefSubcategory = {
  id: string;
  category_id: string;
  code: string;
  name_ru: string;
  name_kz: string;
  sort_order: number;
};

export type RefCurrency = {
  id: string;
  code: string;
  symbol: string;
  name_ru: string;
  sort_order: number;
};

export type RefLinkType = {
  id: string;
  code: string;
  name_ru: string;
  icon: string | null;
  sort_order: number;
};

export async function getCountries(db: Db): Promise<RefCountry[]> {
  return db<RefCountry[]>`
    SELECT id, code, name_ru, name_kz, sort_order
    FROM ref_countries
    WHERE is_active = true
    ORDER BY sort_order, name_ru
  `;
}

export async function getRegions(db: Db, countryId?: string): Promise<RefRegion[]> {
  if (countryId) {
    return db<RefRegion[]>`
      SELECT id, country_id, code, name_ru, name_kz, region_type, sort_order
      FROM ref_regions
      WHERE is_active = true AND country_id = ${countryId}
      ORDER BY sort_order, name_ru
    `;
  }
  return db<RefRegion[]>`
    SELECT id, country_id, code, name_ru, name_kz, region_type, sort_order
    FROM ref_regions
    WHERE is_active = true
    ORDER BY sort_order, name_ru
  `;
}

export async function getCities(db: Db, regionId?: string): Promise<RefCity[]> {
  if (regionId) {
    return db<RefCity[]>`
      SELECT id, country_id, region_id, name_ru, name_kz, city_type, sort_order
      FROM ref_cities
      WHERE is_active = true AND region_id = ${regionId}
      ORDER BY sort_order, name_ru
    `;
  }
  return db<RefCity[]>`
    SELECT id, country_id, region_id, name_ru, name_kz, city_type, sort_order
    FROM ref_cities
    WHERE is_active = true
    ORDER BY sort_order, name_ru
  `;
}

export async function getCategories(db: Db): Promise<RefCategory[]> {
  return db<RefCategory[]>`
    SELECT id, code, name_ru, name_kz, icon, sort_order
    FROM ref_categories
    WHERE is_active = true
    ORDER BY sort_order, name_ru
  `;
}

export async function getSubcategories(db: Db, categoryId?: string): Promise<RefSubcategory[]> {
  if (categoryId) {
    return db<RefSubcategory[]>`
      SELECT id, category_id, code, name_ru, name_kz, sort_order
      FROM ref_subcategories
      WHERE is_active = true AND category_id = ${categoryId}
      ORDER BY sort_order, name_ru
    `;
  }
  return db<RefSubcategory[]>`
    SELECT id, category_id, code, name_ru, name_kz, sort_order
    FROM ref_subcategories
    WHERE is_active = true
    ORDER BY sort_order, name_ru
  `;
}

export async function getCurrencies(db: Db): Promise<RefCurrency[]> {
  return db<RefCurrency[]>`
    SELECT id, code, symbol, name_ru, sort_order
    FROM ref_currencies
    WHERE is_active = true
    ORDER BY sort_order, code
  `;
}

export async function getLinkTypes(db: Db): Promise<RefLinkType[]> {
  return db<RefLinkType[]>`
    SELECT id, code, name_ru, icon, sort_order
    FROM ref_link_types
    WHERE is_active = true
    ORDER BY sort_order, name_ru
  `;
}
