-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Reference Data Module — Kazakhstan
-- Source: ISO 3166-2:KZ, Kazakhstan Bureau of National Statistics (Jan 2023)
-- Administrative divisions reflect 2022 reorganization (Abai, Jetisu, Ulytau)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enum types ────────────────────────────────────────────────────────────────
CREATE TYPE ref_region_type AS ENUM ('oblast', 'city_republican');
CREATE TYPE ref_city_type   AS ENUM ('city_republican', 'regional_center', 'city', 'district_center', 'other');

-- ── ref_countries ─────────────────────────────────────────────────────────────
CREATE TABLE ref_countries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,   -- ISO 3166-1 alpha-2
  name_ru    text NOT NULL,
  name_kz    text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

-- ── ref_regions ───────────────────────────────────────────────────────────────
CREATE TABLE ref_regions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id  uuid NOT NULL REFERENCES ref_countries(id),
  code        text NOT NULL UNIQUE,  -- ISO 3166-2
  name_ru     text NOT NULL,
  name_kz     text NOT NULL,
  region_type ref_region_type NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0
);

-- ── ref_cities ────────────────────────────────────────────────────────────────
CREATE TABLE ref_cities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES ref_countries(id),
  region_id  uuid NOT NULL REFERENCES ref_regions(id),
  name_ru    text NOT NULL,
  name_kz    text NOT NULL,
  city_type  ref_city_type NOT NULL DEFAULT 'city',
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0  -- lower = shown first (roughly by population)
);

-- ── ref_categories ────────────────────────────────────────────────────────────
CREATE TABLE ref_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  name_ru    text NOT NULL,
  name_kz    text NOT NULL,
  icon_name  text,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

-- ── ref_subcategories ─────────────────────────────────────────────────────────
CREATE TABLE ref_subcategories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ref_categories(id),
  code        text NOT NULL UNIQUE,
  name_ru     text NOT NULL,
  name_kz     text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0
);

-- ── ref_currencies ────────────────────────────────────────────────────────────
CREATE TABLE ref_currencies (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code      text NOT NULL UNIQUE,   -- ISO 4217
  name_ru   text NOT NULL,
  symbol    text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

-- ── ref_link_types ────────────────────────────────────────────────────────────
CREATE TABLE ref_link_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  name_ru    text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_ref_regions_country  ON ref_regions(country_id);
CREATE INDEX idx_ref_cities_region    ON ref_cities(region_id);
CREATE INDEX idx_ref_cities_country   ON ref_cities(country_id);
CREATE INDEX idx_ref_subcats_category ON ref_subcategories(category_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Countries ─────────────────────────────────────────────────────────────────
INSERT INTO ref_countries (code, name_ru, name_kz, sort_order) VALUES
('KZ', 'Казахстан', 'Қазақстан', 1);

-- ── Regions (20 total: 3 city_republican + 17 oblasts) ───────────────────────
-- ISO 3166-2:KZ codes, post-2022 reorganization
INSERT INTO ref_regions (country_id, code, name_ru, name_kz, region_type, sort_order)
SELECT c.id, r.code, r.name_ru, r.name_kz, r.region_type::ref_region_type, r.sort_order
FROM ref_countries c, (VALUES
  -- Cities of republican significance (sorted by population)
  ('KZ-75', 'Алматы',                           'Алматы',                      'city_republican', 1),
  ('KZ-71', 'Астана',                           'Астана',                      'city_republican', 2),
  ('KZ-79', 'Шымкент',                          'Шымкент',                     'city_republican', 3),
  -- Oblasts (sorted alphabetically by Russian name)
  ('KZ-10', 'Абайская область',                 'Абай облысы',                 'oblast', 10),
  ('KZ-11', 'Акмолинская область',              'Ақмола облысы',               'oblast', 11),
  ('KZ-15', 'Актюбинская область',              'Ақтөбе облысы',               'oblast', 12),
  ('KZ-19', 'Алматинская область',              'Алматы облысы',               'oblast', 13),
  ('KZ-23', 'Атырауская область',               'Атырау облысы',               'oblast', 14),
  ('KZ-27', 'Западно-Казахстанская область',    'Батыс Қазақстан облысы',      'oblast', 15),
  ('KZ-31', 'Жамбылская область',               'Жамбыл облысы',               'oblast', 16),
  ('KZ-33', 'Жетысуская область',               'Жетісу облысы',               'oblast', 17),
  ('KZ-35', 'Карагандинская область',           'Қарағанды облысы',            'oblast', 18),
  ('KZ-39', 'Костанайская область',             'Қостанай облысы',             'oblast', 19),
  ('KZ-43', 'Кызылординская область',           'Қызылорда облысы',            'oblast', 20),
  ('KZ-47', 'Мангыстауская область',            'Маңғыстау облысы',            'oblast', 21),
  ('KZ-55', 'Павлодарская область',             'Павлодар облысы',             'oblast', 22),
  ('KZ-59', 'Северо-Казахстанская область',     'Солтүстік Қазақстан облысы',  'oblast', 23),
  ('KZ-61', 'Туркестанская область',            'Түркістан облысы',            'oblast', 24),
  ('KZ-62', 'Улытауская область',               'Ұлытау облысы',               'oblast', 25),
  ('KZ-63', 'Восточно-Казахстанская область',   'Шығыс Қазақстан облысы',      'oblast', 26)
) AS r(code, name_ru, name_kz, region_type, sort_order)
WHERE c.code = 'KZ';

-- ── Cities ────────────────────────────────────────────────────────────────────
-- sort_order = roughly by population descending within region
INSERT INTO ref_cities (country_id, region_id, name_ru, name_kz, city_type, sort_order)
SELECT c.id, r.id, ci.name_ru, ci.name_kz, ci.city_type::ref_city_type, ci.sort_order
FROM ref_countries c
JOIN ref_regions r ON r.country_id = c.id
JOIN (VALUES
  -- ── Cities of Republican Significance ──────────────────────────────────
  ('KZ-75', 'Алматы',            'Алматы',           'city_republican',  1),
  ('KZ-71', 'Астана',            'Астана',            'city_republican',  1),
  ('KZ-79', 'Шымкент',           'Шымкент',           'city_republican',  1),
  -- ── KZ-10 Абайская область ─────────────────────────────────────────────
  ('KZ-10', 'Семей',             'Семей',             'regional_center',  1),
  ('KZ-10', 'Аягоз',             'Аягөз',             'city',             2),
  -- ── KZ-11 Акмолинская область ─────────────────────────────────────────
  ('KZ-11', 'Кокшетау',          'Көкшетау',          'regional_center',  1),
  ('KZ-11', 'Косшы',             'Қосшы',             'city',             2),
  ('KZ-11', 'Степногорск',       'Степногорск',       'city',             3),
  ('KZ-11', 'Щучинск',           'Щучинск',           'city',             4),
  -- ── KZ-15 Актюбинская область ─────────────────────────────────────────
  ('KZ-15', 'Актобе',            'Ақтөбе',            'regional_center',  1),
  ('KZ-15', 'Хромтау',           'Хромтау',           'city',             2),
  -- ── KZ-19 Алматинская область ─────────────────────────────────────────
  ('KZ-19', 'Конаев',            'Қонаев',            'regional_center',  1),
  ('KZ-19', 'Каскелен',          'Қаскелең',          'city',             2),
  ('KZ-19', 'Талгар',            'Талғар',            'city',             3),
  ('KZ-19', 'Жаркент',           'Жаркент',           'city',             4),
  ('KZ-19', 'Есик',              'Есік',              'city',             5),
  -- ── KZ-23 Атырауская область ──────────────────────────────────────────
  ('KZ-23', 'Атырау',            'Атырау',            'regional_center',  1),
  ('KZ-23', 'Кулсары',           'Құлсары',           'city',             2),
  -- ── KZ-27 Западно-Казахстанская область ───────────────────────────────
  ('KZ-27', 'Уральск',           'Орал',              'regional_center',  1),
  ('KZ-27', 'Аксай',             'Ақсай',             'city',             2),
  -- ── KZ-31 Жамбылская область ──────────────────────────────────────────
  ('KZ-31', 'Тараз',             'Тараз',             'regional_center',  1),
  ('KZ-31', 'Шу',                'Шу',                'city',             2),
  ('KZ-31', 'Каратау',           'Қаратау',           'city',             3),
  -- ── KZ-33 Жетысуская область ──────────────────────────────────────────
  ('KZ-33', 'Талдыкорган',       'Талдықорған',       'regional_center',  1),
  ('KZ-33', 'Жаркент',           'Жаркент',           'city',             2),
  ('KZ-33', 'Текели',            'Текелі',            'city',             3),
  -- ── KZ-35 Карагандинская область ──────────────────────────────────────
  ('KZ-35', 'Карагандa',         'Қарағанды',         'regional_center',  1),
  ('KZ-35', 'Темиртау',          'Теміртау',          'city',             2),
  ('KZ-35', 'Балхаш',            'Балқаш',            'city',             3),
  ('KZ-35', 'Шахтинск',          'Шахтинск',          'city',             4),
  ('KZ-35', 'Сарань',            'Саран',             'city',             5),
  -- ── KZ-39 Костанайская область ────────────────────────────────────────
  ('KZ-39', 'Костанай',          'Қостанай',          'regional_center',  1),
  ('KZ-39', 'Рудный',            'Рудный',            'city',             2),
  ('KZ-39', 'Лисаковск',         'Лисаковск',         'city',             3),
  ('KZ-39', 'Аркалык',           'Арқалық',           'city',             4),
  -- ── KZ-43 Кызылординская область ──────────────────────────────────────
  ('KZ-43', 'Кызылорда',         'Қызылорда',         'regional_center',  1),
  ('KZ-43', 'Арал',              'Арал',              'city',             2),
  -- ── KZ-47 Мангыстауская область ───────────────────────────────────────
  ('KZ-47', 'Актау',             'Ақтау',             'regional_center',  1),
  ('KZ-47', 'Жанаозен',          'Жаңаөзен',          'city',             2),
  ('KZ-47', 'Форт-Шевченко',     'Форт-Шевченко',     'city',             3),
  -- ── KZ-55 Павлодарская область ────────────────────────────────────────
  ('KZ-55', 'Павлодар',          'Павлодар',          'regional_center',  1),
  ('KZ-55', 'Экибастуз',         'Екібастұз',         'city',             2),
  ('KZ-55', 'Аксу',              'Ақсу',              'city',             3),
  -- ── KZ-59 Северо-Казахстанская область ────────────────────────────────
  ('KZ-59', 'Петропавловск',     'Петропавл',         'regional_center',  1),
  -- ── KZ-61 Туркестанская область ───────────────────────────────────────
  ('KZ-61', 'Туркестан',         'Түркістан',         'regional_center',  1),
  ('KZ-61', 'Кентау',            'Кентау',            'city',             2),
  ('KZ-61', 'Сарыагаш',          'Сарыағаш',          'city',             3),
  ('KZ-61', 'Арыс',              'Арыс',              'city',             4),
  ('KZ-61', 'Жетысай',           'Жетісай',           'city',             5),
  -- ── KZ-62 Улытауская область ──────────────────────────────────────────
  ('KZ-62', 'Жезказган',         'Жезқазған',         'regional_center',  1),
  ('KZ-62', 'Сатпаев',           'Сәтбаев',           'city',             2),
  ('KZ-62', 'Каражал',           'Қаражал',           'city',             3),
  -- ── KZ-63 Восточно-Казахстанская область ──────────────────────────────
  ('KZ-63', 'Усть-Каменогорск',  'Өскемен',           'regional_center',  1),
  ('KZ-63', 'Риддер',            'Риддер',            'city',             2),
  ('KZ-63', 'Зыряновск',         'Зыряновск',         'city',             3)
) AS ci(region_code, name_ru, name_kz, city_type, sort_order)
ON r.code = ci.region_code
WHERE c.code = 'KZ';

-- ── Categories ────────────────────────────────────────────────────────────────
INSERT INTO ref_categories (code, name_ru, name_kz, icon_name, sort_order) VALUES
('tamada',        'Тамада',              'Тамада',              '🎤', 1),
('host_show',     'Ведущий / Шоу',       'Жүргізуші / Шоу',     '🎪', 2),
('photographer',  'Фотограф',            'Фотограф',            '📸', 3),
('videographer',  'Видеограф',           'Видеограф',           '🎬', 4),
('dj',            'Диджей',              'Диджей',              '🎧', 5),
('musician',      'Музыкант',            'Музыкант',            '🎵', 6),
('dancer',        'Танцор',              'Биші',                '💃', 7),
('makeup_artist', 'Визажист',            'Визажист',            '💄', 8),
('hairstylist',   'Парикмахер',          'Шаштараз',            '✂️', 9),
('stylist',       'Стилист',             'Стилист',             '👗', 10),
('florist',       'Флорист',             'Флорист',             '🌸', 11),
('decorator',     'Декоратор',           'Безендіруші',         '🎀', 12),
('animator',      'Аниматор',            'Аниматор',            '🎭', 13),
('event_agency',  'Event-агентство',     'Event-агенттік',      '🏢', 14),
('beauty_master', 'Мастер красоты',      'Сұлулық шебері',      '💅', 15),
('other',         'Другое',              'Басқа',               '✨', 99);

-- ── Subcategories ─────────────────────────────────────────────────────────────
INSERT INTO ref_subcategories (category_id, code, name_ru, name_kz, sort_order)
SELECT c.id, s.code, s.name_ru, s.name_kz, s.sort_order
FROM ref_categories c
JOIN (VALUES
  -- tamada
  ('tamada', 'tamada_wedding',    'Свадебный тамада',       'Үйлену тойы тамадасы',    1),
  ('tamada', 'tamada_jubilee',    'Юбилейный тамада',       'Мерейтой тамадасы',       2),
  ('tamada', 'tamada_corporate',  'Корпоратив',             'Корпоратив',              3),
  -- host_show
  ('host_show', 'host_wedding',   'Свадебный ведущий',      'Үйлену тойы жүргізушісі', 1),
  ('host_show', 'host_event',     'Event-ведущий',          'Event-жүргізуші',         2),
  ('host_show', 'host_children',  'Детский ведущий',        'Балалар жүргізушісі',     3),
  -- photographer
  ('photographer', 'photo_wedding',   'Свадебная съёмка',   'Үйлену фотосессиясы',     1),
  ('photographer', 'photo_portrait',  'Портретная съёмка',  'Портреттік фотосессия',   2),
  ('photographer', 'photo_event',     'Event-съёмка',       'Event-фотосессия',        3),
  ('photographer', 'photo_family',    'Семейная съёмка',    'Отбасылық фотосессия',    4),
  ('photographer', 'photo_commercial','Рекламная съёмка',   'Жарнамалық фотосессия',   5),
  -- videographer
  ('videographer', 'video_wedding',   'Свадебное видео',    'Үйлену видеосы',          1),
  ('videographer', 'video_event',     'Event-видео',        'Event-бейне',             2),
  ('videographer', 'video_commercial','Рекламное видео',    'Жарнамалық бейне',        3),
  -- dj
  ('dj', 'dj_wedding',   'Свадебный DJ',        'Үйлену тойы DJ',          1),
  ('dj', 'dj_event',     'Event DJ',            'Event DJ',                2),
  ('dj', 'dj_club',      'Клубный DJ',          'Клубтық DJ',              3),
  -- musician
  ('musician', 'musician_singer',        'Певец / Певица',     'Әнші',                  1),
  ('musician', 'musician_live_band',     'Живая группа',       'Тірі топ',              2),
  ('musician', 'musician_instrumentalist','Инструменталист',   'Аспапшы',               3),
  ('musician', 'musician_cover_band',    'Кавер-группа',       'Кавер-топ',             4),
  -- dancer
  ('dancer', 'dancer_solo',         'Сольный танцор',      'Жеке биші',               1),
  ('dancer', 'dancer_group',        'Танцевальная группа', 'Би тобы',                 2),
  ('dancer', 'dancer_choreographer','Хореограф',           'Хореограф',               3),
  ('dancer', 'dancer_bellydance',   'Восточные танцы',     'Шығыс билері',            4),
  -- makeup_artist
  ('makeup_artist', 'makeup_bridal',  'Свадебный макияж',   'Үйлену макияжы',          1),
  ('makeup_artist', 'makeup_evening', 'Вечерний макияж',    'Кешкі макияж',            2),
  ('makeup_artist', 'makeup_photo',   'Фото-макияж',        'Фото-макияж',             3),
  -- hairstylist
  ('hairstylist', 'hair_bridal',      'Свадебная причёска', 'Үйлену шаш үлгісі',      1),
  ('hairstylist', 'hair_everyday',    'Повседневная стрижка','Күнделікті шаш кесу',    2),
  ('hairstylist', 'hair_coloring',    'Окрашивание волос',  'Шаш бояу',               3),
  -- stylist
  ('stylist', 'stylist_personal',     'Персональный стилист','Жеке стилист',           1),
  ('stylist', 'stylist_image',        'Имиджмейкер',        'Имидж жасаушы',          2),
  -- florist
  ('florist', 'florist_wedding',      'Свадебная флористика','Үйлену гүлдері',         1),
  ('florist', 'florist_event',        'Event-флористика',   'Event-гүлдер',           2),
  ('florist', 'florist_bouquet',      'Букеты',             'Гүл шоқтары',            3),
  -- decorator
  ('decorator', 'decor_wedding',      'Свадебный декор',    'Үйлену безендіру',       1),
  ('decorator', 'decor_event',        'Event-декор',        'Event-безендіру',        2),
  ('decorator', 'decor_photo_zone',   'Фотозона',           'Фотоаймақ',              3),
  ('decorator', 'decor_balloons',     'Воздушные шары',     'Шарлар',                 4),
  -- animator
  ('animator', 'animator_children',   'Детский аниматор',   'Балалар аниматоры',      1),
  ('animator', 'animator_adult',      'Взрослые программы', 'Ересек бағдарламалар',   2),
  ('animator', 'animator_character',  'Ростовые куклы',     'Костюмді кейіпкерлер',   3),
  -- event_agency
  ('event_agency', 'agency_wedding',  'Свадебное агентство','Үйлену агенттігі',       1),
  ('event_agency', 'agency_corporate','Корпоратив-агентство','Корпоративтік агенттік',2),
  ('event_agency', 'agency_fullservice','Полный цикл',      'Толық қызмет',           3),
  -- beauty_master
  ('beauty_master', 'beauty_manicure','Маникюр',            'Маникюр',                1),
  ('beauty_master', 'beauty_pedicure','Педикюр',            'Педикюр',                2),
  ('beauty_master', 'beauty_brows',   'Брови',              'Қас',                    3),
  ('beauty_master', 'beauty_lashes',  'Наращивание ресниц', 'Кірпік ұзарту',          4),
  ('beauty_master', 'beauty_haircut', 'Стрижка',            'Шаш кесу',               5),
  -- other
  ('other', 'other_general', 'Другое', 'Басқа', 1)
) AS s(cat_code, code, name_ru, name_kz, sort_order)
ON c.code = s.cat_code;

-- ── Currencies ────────────────────────────────────────────────────────────────
INSERT INTO ref_currencies (code, name_ru, symbol) VALUES
('KZT', 'Казахстанский тенге', '₸'),
('USD', 'Доллар США',          '$'),
('EUR', 'Евро',                '€'),
('RUB', 'Российский рубль',    '₽');

-- ── Link Types ────────────────────────────────────────────────────────────────
INSERT INTO ref_link_types (code, name_ru, sort_order) VALUES
('instagram',  'Instagram',  1),
('whatsapp',   'WhatsApp',   2),
('telegram',   'Telegram',   3),
('tiktok',     'TikTok',     4),
('youtube',    'YouTube',    5),
('website',    'Сайт',       6),
('two_gis',    '2GIS',       7),
('map',        'Карта',      8),
('other',      'Другое',     9);
