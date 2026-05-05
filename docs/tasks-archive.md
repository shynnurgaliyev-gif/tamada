# Tasks 12–48 — архив

> Реконструкция по `git show --stat dd43373..HEAD` (без чтения кода). Точное содержание не сверено с UI/тестами — берите как ориентир, не как спецификацию. Tasks 12, 17, 41, 42 в нумерации пропущены.

## Tasks 13–18 — расширение dashboard

- **Task 13** (`bbe2617`) — UI-редизайн `dashboard/{integrations,subscription}`, `login`, `signup`, `search`, `p/[slug]/ProfileClient`, главной. Добавлено ~560 строк в `globals.css` (стилевая база).
- **Task 14** (`949939b`) — большой редизайн landing `page.tsx` (+474). Добавлены ещё ~700 строк `globals.css` (продолжение UI-системы).
- **Task 15** (`18a9088`) — точечные правки 13 web-файлов (49+/38−), `ARCHITECTURE.md` и `CLAUDE.md`. Похоже на SEO/метаданные/унификацию имени бренда (ещё до Task 19).
- **Task 16** (`7198d00`) — **модуль аналитики**. `apps/api/src/analytics/{repositories,routes}.ts`, `dashboard/analytics/page.tsx` (260 строк), миграция `013_analytics.sql`. ProfileClient получил трекинг просмотров/контактов (+146).
- **Task 18** (`a7c4d63`) — **onboarding**. `apps/api/src/onboarding/{repositories,routes}.ts`, `dashboard/onboarding/page.tsx` (741 строка), миграция `014_onboarding.sql`.

## Task 19 — ребрендинг

- **Task 19** (`787d700`) — `@tamada` → **Octiqa**. Создан `apps/web/src/components/OctiLogo.tsx`, обновлены все web-страницы, `ARCHITECTURE.md`, `CLAUDE.md`.

## Tasks 21–24 — landing

- **Task 21** (`a33825f`) — landing разбит по аудиториям: `for-clients/page.tsx` (258), `for-specialists/page.tsx` (243). AI-блок убран из главной и из `search/page.tsx`.
- **Task 22** (`87d0d68`) — упрощение landing: `for-clients` сокращён в 10 раз, главная и `for-specialists` ужаты.
- **Task 23** (`c7437f9`) — мелкие правки `for-specialists` и главной.
- **Task 24** (`9eeffa9`) — крупный апдейт `for-specialists` (+211 / −51).

## Tasks 25–29 — Mini App (Telegram)

- **Task 25** (`4c1182f`) — **mini-app stub**. `apps/web/src/app/mini/{MiniShell,layout,page}.tsx` (~540 строк), env-переменные.
- **Task 26** (`42b8ad0`) — наращивание `MiniShell.tsx` (+1111 / −385).
- **Task 27** (`f0f4021`) — **декомпозиция mini-app**: из `MiniShell` вынесены `components/{EmptyState, MiniBottomNav, MiniLoader, MiniStyles, MiniTopBar, NavRow}`, `hooks/useMiniApp`, `overlays/{MiniAddSheet, MiniOnboardingGate, MiniSwitchSheet}`, `screens/{Analytics, Calendar, More, Profiles}`, `types.ts`, `lib/telegram.ts`.
- **Task 28** (`80a8a10`) — экраны профиля: `screens/profile/{ProfileView, ProfileEditView, ProfileLinksView, ProfilePhotosView}` + `hooks/useProviderData`.
- **Task 29** (`3731cb9`) — экран календаря: `screens/calendar/{CalendarDayView, CalendarEntryForm, CalendarMonthView}` + `hooks/useCalendar`.

## Tasks 30–34 — публичный календарь и multi-profile

- **Task 30** (`9c25b4e`) — события календаря на API: `apps/api/src/calendar/events.ts`, расширены `routes.ts`. `ProfileClient` (+109) — booking-флоу на публичном профиле.
- **Task 31** (`bee37aa`) — `ProfileClient` (+273) — продолжение booking/календаря на публичном профиле.
- **Task 32** (`d49e08c`) — **multi-profile foundation**, миграция `016`, расширение `schema.sql` (+53), `providers/repositories.ts`, `telegram/repositories.ts`.
- **Task 33** (`67e80ea`) — переключатель профилей: `MiniSwitchSheet`, `MiniProfilesScreen` (+330), `useMiniApp` (+128).
- **Task 34** (`c81b55e`) — **assistant_invites**, миграция `017`, расширение `telegram/{routes,repositories}`, `ProfileView` (+118). Делегирование профиля помощникам.

## Tasks 35–40 — auth / permissions / accounts

- **Task 35** (`25e0324`) — **mini-app auth через Telegram initData**: `apps/api/src/telegram/mini-auth.ts`, миграция `018_mini_app_auth`.
- **Task 36** (`29e6d23`) — `apps/api/src/telegram/permissions.ts`. Роли в mini app.
- **Task 37** (`800fa76`) — `apps/api/src/telegram/mini-session.ts` + `MiniMoreScreen` (+595). Sessions + крупный экран More (настройки/подписка/выход).
- **Task 38** (`1327ea1`) — `providers/routes.ts` (+107), `MiniMoreScreen` (+106). Создание/удаление профилей из mini app.
- **Task 39** (`77e26e1`) — миграция `019_account_subscription_related_profiles`. Подписка распространяется на все профили аккаунта.
- **Task 40** (`c33a09f`) — миграция `020_transfer_accept_flow`, `telegram/repositories.ts` (+164). Перенос профиля между аккаунтами.

## Tasks 43–48 — Telegram bot, gates, picker

- **Task 43** (`670b4bf`) — **Telegram bot**. `apps/api/src/telegram/bot.ts` (238), `speech-to-text.ts`, миграция `021_telegram_bot_quick_booking`, `MiniMoreScreen` (+139).
- **Task 44** (`13cb2d1`) — `apps/web/src/lib/telegramLinks.ts`. Deeplinks из landing в бота.
- **Task 45** (`1b1bac1`) — уточнения переключения профилей (`MiniSwitchSheet`, `MiniTopBar`).
- **Task 46** (`18f703d`) — **MiniGuestGate** + миграция `022_mini_guest_account`. Гостевой режим mini app.
- **Task 47** (`cc1df4d`) — **MiniFirstProfileGate** (292 строки). Гейт создания первого профиля.
  - **Hotfix Unify First Profile Creation Flow** (`dffdef9`) — увязка гейта с `MiniShell`/`MiniCalendarScreen`/`MiniProfilesScreen`.
- **Task 48** (`64ab47a`) — `MiniProfilesScreen` (+139), `ProfileEditView` (+108) — UX улучшения.
- **Tasks 48.2–48.7** (`a2bfcca`…`b5a40a4`) — серия над `MiniPicker.tsx` (создан в 48.2 как универсальный picker), 48.3–48.7 — полировка.

## После Task 48

См. `docs/CLAUDE.md` → раздел **"История после Task 11"** (мобильная UX-полировка, редизайн аналитики, рефакторинги типов/ошибок/onboarding).
