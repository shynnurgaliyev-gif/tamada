# Reference Data Module

Official Kazakhstan reference data for the platform.

## API Endpoints

All endpoints are public (no auth), rate-limited at 120 req/min global.

| Endpoint                              | Response key    | Description                        |
|---------------------------------------|-----------------|-------------------------------------|
| GET /reference/countries              | `countries`     | List of countries (currently: KZ)  |
| GET /reference/regions?country_id=    | `regions`       | Regions/oblasts, filter by country |
| GET /reference/cities?region_id=      | `cities`        | Cities, filter by region            |
| GET /reference/categories             | `categories`    | Service categories with icons       |
| GET /reference/subcategories?category_id= | `subcategories` | Subcategories per category      |
| GET /reference/currencies             | `currencies`    | Supported currencies                |
| GET /reference/link-types             | `linkTypes`     | Social/contact link types           |

## Database Tables (migration 009)

```
ref_countries   — ISO 3166-1 alpha-2 country codes
ref_regions     — ISO 3166-2:KZ region codes, region_type: oblast | city_republican
ref_cities      — Cities with city_type: city_republican | regional_center | city | other
ref_categories  — Service categories with code + icon
ref_subcategories — Sub-categories linked to categories
ref_currencies  — KZT, USD, EUR, RUB
ref_link_types  — instagram, whatsapp, telegram, tiktok, youtube, website, two_gis, map, other
```

## Seeded Data

### Countries (1)
- KZ — Казахстан

### Regions (20)
City-republican status (city_republican):
- KZ-75 — Алматы
- KZ-71 — Астана
- KZ-79 — Шымкент

Oblasts (17), including 2022 reorganization:
- KZ-10 — Абайская (new 2022, split from East KZ)
- KZ-19 — Акмолинская
- KZ-11 — Актюбинская
- KZ-31 — Алматинская
- KZ-23 — Атырауская
- KZ-27 — Восточно-Казахстанская
- KZ-47 — Жамбылская
- KZ-33 — Жетысуская (new 2022, split from Almaty Oblast)
- KZ-35 — Западно-Казахстанская
- KZ-39 — Карагандинская
- KZ-43 — Костанайская
- KZ-45 — Кызылординская
- KZ-55 — Мангистауская
- KZ-58 — Павлодарская
- KZ-61 — Северо-Казахстанская
- KZ-62 — Улытауская (new 2022, split from Karaganda)
- KZ-63 — Туркестанская

### Categories (16)
tamada, photographer, videographer, dj, musician, dancer, makeup_artist, florist, animator, show, host, decorator, baker, stylist, catering, other

### Currencies (4)
KZT (₸), USD ($), EUR (€), RUB (₽)

### Link Types (9)
instagram, whatsapp, telegram, tiktok, youtube, website, two_gis, map, other

## Model Refactor (migration 010)

Nullable FK columns added (safe transition — old text fields kept):

| Table              | New columns                                      |
|--------------------|--------------------------------------------------|
| providers          | country_id, region_id, city_id                   |
| provider_services  | category_id, subcategory_id, currency_id         |
| provider_links     | link_type_id                                     |

Old text columns (`city`, `region`, `category`, `currency`, `link_type`) remain intact.
