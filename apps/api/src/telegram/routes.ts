import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { getAuthAccount } from '../auth/middleware';
import * as authRepo from '../auth/repositories';
import { countActiveProvidersByAccountId, findProviderById, transferProviderToAccount, type Provider } from '../providers/repositories';
import { findEntriesByRange, createEntry, checkOverlap, upsertClient, CalendarEntryStatus } from '../calendar/repositories';
import { publishCalendarChange } from '../calendar/events';
import { getSubscriptionStatus } from '../subscription/routes';
import * as repo from './repositories';
import * as bot from './bot';
import { verifyTelegramInitData } from './mini-auth';
import { permissionsForTelegramRole } from './permissions';
import { getMiniSessionContext } from './mini-session';
import { createSpeechToTextProvider } from './speech-to-text';
import { badRequest, unauthorized, forbidden, notFound, conflict, serverError } from '../replies';

export function createTelegramRoutes(db: Db, env: AppEnv) {
  const plugin: FastifyPluginAsync = async (app) => {
    const speechToText = createSpeechToTextProvider(env);

    // POST /telegram/link-token  (auth required)
    app.post('/telegram/link-token', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_integrations');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return unauthorized(reply);

      const body = req.body as Record<string, unknown>;
      const providerId = typeof body['provider_id'] === 'string' ? body['provider_id'] : null;
      if (!providerId) return badRequest(reply, 'Необходимо указать provider_id');

      const provider = await findProviderById(db, providerId);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== accountId) return forbidden(reply);

      const count = await repo.countLinkedAccounts(db, providerId);
      if (count >= 3) return badRequest(reply, 'Максимум 3 Telegram-аккаунта на профиль');

      const tokenRow = await repo.createLinkToken(db, providerId, 'owner', accountId);
      const rawToken = tokenRow.id; // raw token returned in id field
      const botUsername = env.TELEGRAM_BOT_USERNAME ?? 'octiqa_mini_bot';
      const deepLink = `https://t.me/${botUsername}?start=link_${rawToken}`;

      return reply.send({ ok: true, deep_link: deepLink, expires_in_minutes: 15 });
    });

    // POST /providers/:id/assistant-invite
    app.post('/providers/:id/assistant-invite', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return unauthorized(reply);

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== accountId) return forbidden(reply);

      const tokenRow = await repo.createLinkToken(db, id, 'assistant', accountId);
      const rawToken = tokenRow.id;
      const botUsername = env.TELEGRAM_BOT_USERNAME ?? 'octiqa_mini_bot';
      const deepLink = `https://t.me/${botUsername}?start=link_${rawToken}`;
      await repo.logActivity(db, {
        providerId: id,
        actorType: mini ? 'telegram' : 'web',
        actorAccountId: accountId,
        telegramAccountId: mini?.telegramAccount.id,
        actionType: 'assistant_invited',
        targetType: 'telegram_link_token',
        targetId: tokenRow.token_hash,
        payloadJson: { expires_at: tokenRow.expires_at.toISOString() },
      });
      return reply.send({ ok: true, deep_link: deepLink, expires_in_minutes: 15 });
    });

    // POST /telegram/mini/auth
    app.post('/telegram/mini/auth', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const initData = typeof body['init_data'] === 'string'
        ? body['init_data']
        : typeof body['initData'] === 'string' ? body['initData'] : '';
      if (!initData) return badRequest(reply, 'Необходимо передать init_data');

      const token = env.TELEGRAM_BOT_TOKEN ?? '';
      if (!token) return reply.code(503).send({ ok: false, error: 'Авторизация через Telegram Mini App не настроена' });

      const verified = verifyTelegramInitData(initData, token);
      if (!verified) return reply.code(401).send({ ok: false, error: 'Неверные данные авторизации Telegram Mini App' });

      const tgAccount = await repo.findLinkedAccountByTelegramUserId(db, verified.user.id);
      if (!tgAccount) {
        return reply.send({
          ok: true,
          state: 'guest',
          providers: [],
          role: null,
          permissions: permissionsForTelegramRole(null),
          mini_token: null,
          expires_at: null,
        });
      }

      const providers = await listMiniAccessibleProviders(db, tgAccount);
      const incomingTransfers = tgAccount.account_id
        ? await repo.findIncomingOwnershipTransferRequests(db, tgAccount.account_id)
        : [];
      const hasPendingIncomingTransfer = incomingTransfers.some(r => r.status === 'pending');
      const isOwnerWithoutFirstProfile = tgAccount.is_primary && tgAccount.telegram_role === 'owner' && !!tgAccount.account_id;
      if (providers.length === 0 && !hasPendingIncomingTransfer && !isOwnerWithoutFirstProfile) {
        return reply.send({
          ok: true,
          state: 'guest',
          providers: [],
          role: tgAccount.telegram_role,
          permissions: permissionsForTelegramRole(tgAccount.telegram_role),
          mini_token: null,
          expires_at: null,
        });
      }

      const rawSessionToken = repo.generateMiniSessionToken();
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      await repo.createMiniSession(db, {
        telegramAccountId: tgAccount.id,
        telegramUserId: verified.user.id,
        role: tgAccount.telegram_role,
        tokenHash: repo.hashToken(rawSessionToken),
        expiresAt,
      });

      return reply.send({
        ok: true,
        state: 'authenticated',
        providers,
        role: tgAccount.telegram_role,
        permissions: permissionsForTelegramRole(tgAccount.telegram_role),
        mini_token: rawSessionToken,
        expires_at: expiresAt.toISOString(),
      });
    });

    // POST /telegram/mini/account
    app.post('/telegram/mini/account', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const initData = typeof body['init_data'] === 'string'
        ? body['init_data']
        : typeof body['initData'] === 'string' ? body['initData'] : '';
      const fullName = typeof body['full_name'] === 'string' ? body['full_name'].trim() : '';
      if (!initData) return badRequest(reply, 'Необходимо передать init_data');
      if (fullName.length < 2) return badRequest(reply, 'Необходимо указать ФИО');

      const token = env.TELEGRAM_BOT_TOKEN ?? '';
      if (!token) return reply.code(503).send({ ok: false, error: 'Авторизация через Telegram Mini App не настроена' });

      const verified = verifyTelegramInitData(initData, token);
      if (!verified) return reply.code(401).send({ ok: false, error: 'Неверные данные авторизации Telegram Mini App' });

      const linked = await repo.findLinkedAccountByTelegramUserId(db, verified.user.id);
      if (linked) return conflict(reply, 'Этот Telegram-аккаунт уже привязан к системе');

      await ensureMiniGuestAccountSchema(db);

      const existingTelegram = await repo.findAccountByTelegramUserId(db, verified.user.id);
      const username = await uniqueMiniAccountUsername(db, fullName, verified.user.username, verified.user.id);
      const passwordHash = await bcrypt.hash(authRepo.generateToken(), 12);
      const telegramPhone = `tg:${verified.user.id}`;
      const existingAccount = await authRepo.findAccountByPhone(db, telegramPhone);
      const account = existingAccount ?? await authRepo.createAccount(db, {
        username,
        phone: telegramPhone,
        passwordHash,
      });

      const tgAccount = existingTelegram
        ? await repo.relinkOwnerTelegramAccountWithoutProvider(db, existingTelegram.id, {
            accountId: account.id,
            telegramUsername: verified.user.username,
            telegramFirstName: verified.user.first_name ?? fullName,
            telegramLastName: verified.user.last_name,
          })
        : await repo.createOwnerTelegramAccountWithoutProvider(db, {
            accountId: account.id,
            telegramUserId: verified.user.id,
            telegramUsername: verified.user.username,
            telegramFirstName: verified.user.first_name ?? fullName,
            telegramLastName: verified.user.last_name,
          });
      if (!tgAccount) return serverError(reply, 'Не удалось привязать Telegram-аккаунт');

      const rawSessionToken = repo.generateMiniSessionToken();
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      await repo.createMiniSession(db, {
        telegramAccountId: tgAccount.id,
        telegramUserId: verified.user.id,
        role: 'owner',
        tokenHash: repo.hashToken(rawSessionToken),
        expiresAt,
      });

      return reply.send({
        ok: true,
        state: 'authenticated',
        providers: [],
        role: 'owner',
        permissions: permissionsForTelegramRole('owner'),
        mini_token: rawSessionToken,
        expires_at: expiresAt.toISOString(),
        account,
      });
    });

    // GET /telegram/mini/transfers/incoming
    app.get('/telegram/mini/transfers/incoming', async (req, reply) => {
      const mini = await getMiniSessionContext(db, req);
      if (!mini) return unauthorized(reply);

      const requests = await repo.findIncomingOwnershipTransferRequests(db, mini.accountId);
      return reply.send({ ok: true, transfer_requests: requests });
    });

    // GET /telegram/mini/transfers/outgoing
    app.get('/telegram/mini/transfers/outgoing', async (req, reply) => {
      const mini = await getMiniSessionContext(db, req, 'can_archive_profile');
      if (!mini) return unauthorized(reply);

      const query = req.query as Record<string, string | undefined>;
      const providerId = typeof query['provider_id'] === 'string' ? query['provider_id'] : undefined;
      const requests = await repo.findOutgoingOwnershipTransferRequests(db, mini.accountId, providerId);
      return reply.send({ ok: true, transfer_requests: requests });
    });

    // GET /providers/:id/activity
    app.get('/providers/:id/activity', async (req, reply) => {
      const mini = await getMiniSessionContext(db, req, 'can_manage_team');
      if (!mini) return unauthorized(reply);

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== mini.accountId) return forbidden(reply);

      const query = req.query as Record<string, string | undefined>;
      const categoryRaw = query['category'];
      const category = categoryRaw === 'calendar' || categoryRaw === 'team' || categoryRaw === 'profile'
        ? categoryRaw
        : undefined;
      const limitRaw = Number(query['limit'] ?? 50);
      const logs = await repo.findActivityLogsByProvider(db, id, category, Number.isFinite(limitRaw) ? limitRaw : 50);
      return reply.send({ ok: true, activity: logs });
    });

    // POST /telegram/mini/active-provider
    app.post('/telegram/mini/active-provider', async (req, reply) => {
      const mini = await getMiniSessionContext(db, req);
      if (!mini) return unauthorized(reply);

      const body = req.body as Record<string, unknown>;
      const providerId = typeof body['provider_id'] === 'string' ? body['provider_id'] : null;
      if (!providerId) return badRequest(reply, 'Необходимо указать provider_id');

      const accessibleIds = await repo.findAccessibleProviderIdsForTelegramAccount(db, mini.telegramAccount);
      if (!accessibleIds.includes(providerId)) return forbidden(reply);

      const provider = await findProviderById(db, providerId);
      if (!provider || provider.archived_at || provider.pending_delete_at) {
        return notFound(reply, 'Профиль не найден');
      }

      const session = await repo.findBotSession(db, mini.telegramAccount.id);
      const pending_cancelled = await cancelPendingDraftOnProfileSwitch(db, mini.telegramAccount.id, session, providerId);
      await repo.setBotActiveProvider(db, mini.telegramAccount.id, providerId);
      return reply.send({ ok: true, active_provider_id: providerId, pending_cancelled });
    });

    // POST /telegram/mini/transfers/:requestId/accept
    app.post('/telegram/mini/transfers/:requestId/accept', async (req, reply) => {
      const mini = await getMiniSessionContext(db, req, 'can_create_profile');
      if (!mini) return unauthorized(reply);

      const { requestId } = req.params as { requestId: string };
      const request = await repo.findAcceptableOwnershipTransferRequest(db, requestId, mini.accountId);
      if (!request) return reply.code(404).send({ ok: false, error: 'Запрос на передачу не найден' });
      if (request.status !== 'pending') return reply.code(400).send({ ok: false, error: `Запрос на передачу профиля имеет статус: ${request.status}` });
      if (new Date(request.expires_at).getTime() <= Date.now()) return badRequest(reply, 'Срок действия запроса на передачу истёк');
      if (request.from_account_id === mini.accountId) return badRequest(reply, 'Нельзя принять собственный запрос на передачу');

      const provider = await findProviderById(db, request.provider_id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== request.from_account_id) {
        return conflict(reply, 'Владелец профиля уже изменён');
      }
      if (provider.pending_delete_at) return badRequest(reply, 'Профиль ожидает удаления');

      const activeCount = await countActiveProvidersByAccountId(db, mini.accountId);
      if (!provider.archived_at && activeCount >= 3) {
        return badRequest(reply, 'У получателя достигнут лимит активных профилей');
      }

      const accepted = await repo.acceptOwnershipTransferRequest(db, requestId, mini.accountId);
      if (!accepted) return conflict(reply, 'Запрос на передачу профиля больше не активен');

      await repo.revokeAllProfileAccessForProvider(db, provider.id);
      await repo.revokeLinkTokensForProvider(db, provider.id);
      const transferred = await transferProviderToAccount(db, provider.id, mini.accountId);
      if (!transferred) return serverError(reply, 'Не удалось передать профиль');
      await repo.upsertProfileAccess(db, {
        telegramAccountId: mini.telegramAccount.id,
        providerId: provider.id,
        role: 'owner',
        grantedByAccountId: mini.accountId,
      });
      await repo.revokeMiniSessionsForAccount(db, request.from_account_id);
      await repo.logActivity(db, {
        providerId: provider.id,
        actorType: 'telegram',
        actorAccountId: mini.accountId,
        telegramAccountId: mini.telegramAccount.id,
        actionType: 'ownership_transfer_accepted',
        targetType: 'provider',
        targetId: provider.id,
        payloadJson: { transfer_request_id: requestId, from_account_id: request.from_account_id },
      });

      return reply.send({ ok: true, transfer_request: accepted, provider: transferred });
    });

    // POST /telegram/mini/transfers/:requestId/reject
    app.post('/telegram/mini/transfers/:requestId/reject', async (req, reply) => {
      const mini = await getMiniSessionContext(db, req);
      if (!mini) return unauthorized(reply);

      const { requestId } = req.params as { requestId: string };
      const request = await repo.findAcceptableOwnershipTransferRequest(db, requestId, mini.accountId);
      if (!request) return reply.code(404).send({ ok: false, error: 'Запрос на передачу не найден' });
      if (request.status !== 'pending') return reply.code(400).send({ ok: false, error: `Запрос на передачу профиля имеет статус: ${request.status}` });
      if (request.from_account_id === mini.accountId) return badRequest(reply, 'Нельзя отклонить собственный запрос на передачу');

      const rejected = await repo.rejectOwnershipTransferRequest(db, requestId, mini.accountId);
      if (!rejected) return conflict(reply, 'Запрос на передачу профиля больше не активен');
      await repo.logActivity(db, {
        providerId: request.provider_id,
        actorType: 'telegram',
        actorAccountId: mini.accountId,
        telegramAccountId: mini.telegramAccount.id,
        actionType: 'ownership_transfer_rejected',
        targetType: 'ownership_transfer_request',
        targetId: requestId,
        payloadJson: { from_account_id: request.from_account_id },
      });
      return reply.send({ ok: true, transfer_request: rejected });
    });

    // POST /telegram/webhook  (called by Telegram)
    app.post('/telegram/webhook', async (req, reply) => {
      const update = req.body as bot.TelegramUpdate;
      const msg = update.message;
      if (!msg?.from) return reply.send({ ok: true });

      const chatId = msg.chat.id;
      const telegramUserId = msg.from.id;
      const text = msg.text?.trim() ?? '';
      const lower = text.toLowerCase();
      const token = env.TELEGRAM_BOT_TOKEN ?? '';
      const guestOptions = { replyMarkup: bot.miniAppKeyboard(telegramMiniAppUrl(env)) };
      req.log.info({
        update_id: update.update_id,
        chat_id: chatId,
        telegram_user_id: telegramUserId,
        has_text: !!text,
        command: lower.startsWith('/') ? lower.split(/\s+/)[0] : undefined,
      }, 'telegram webhook update');

      // /start link_<token>
      if (lower.startsWith('/start')) {
        const parts = text.split(' ');
        const param = parts[1];
        if (!param) {
          // Check if user is already linked — show contextual greeting
          const existingForStart = await repo.findLinkedAccountByTelegramUserId(db, telegramUserId);
          if (existingForStart) {
            const startProviders = await listBotAccessibleProviders(db, existingForStart);
            if (startProviders.length > 0) {
              const activeProvider = resolveBotActiveProvider(
                startProviders,
                (await repo.findBotSession(db, existingForStart.id))?.active_provider_id ?? existingForStart.provider_id,
              );
              await bot.sendMessage(
                token, chatId,
                bot.helpText(activeProvider?.display_name ?? null, startProviders.length > 1),
              );
              return reply.send({ ok: true });
            }
            // Linked but no profiles yet
            const miniUrlForStart = telegramMiniAppUrl(env).replace('?startapp=onboarding', '');
            await bot.sendMessage(token, chatId,
              '<b>Аккаунт подключён.</b>\n\nПрофиль ещё не создан. Откройте Mini App и добавьте первый профиль.',
              { replyMarkup: bot.miniAppKeyboard(miniUrlForStart) },
            );
            return reply.send({ ok: true });
          }
          await bot.sendMessage(token, chatId, bot.startText(), guestOptions);
          return reply.send({ ok: true });
        }
        if (param?.startsWith('link_')) {
          const rawToken = param.slice(5);
          const tokenRow = await repo.findValidLinkToken(db, rawToken);
          if (!tokenRow) {
            await bot.sendMessage(token, chatId, '❌ Ссылка недействительна или истекла. Запросите новую в кабинете.' + bot.FOOTER);
            return reply.send({ ok: true });
          }

          const tokenProvider = await findProviderById(db, tokenRow.provider_id);
          if (!tokenProvider) {
            await bot.sendMessage(token, chatId, 'Профиль для этой ссылки не найден.' + bot.FOOTER);
            return reply.send({ ok: true });
          }

          // Check if already linked to another provider
          const existing = await repo.findAccountByTelegramUserId(db, telegramUserId);
          const existingProvider = existing?.provider_id ? await findProviderById(db, existing.provider_id) : null;
          if (
            existing &&
            existing.status === 'linked' &&
            existing.provider_id !== tokenRow.provider_id &&
            existingProvider?.account_id !== tokenProvider.account_id
          ) {
            await bot.sendMessage(token, chatId,
              '⚠️ Этот Telegram уже привязан к другому исполнителю.\n\nСначала отвяжитесь командой <b>отвязать</b>, потом используйте новую ссылку.' + bot.FOOTER
            );
            return reply.send({ ok: true });
          }

          const count = await repo.countLinkedAccounts(db, tokenRow.provider_id);
          if (count >= 3) {
            await bot.sendMessage(token, chatId, '❌ Максимум 3 Telegram-аккаунта уже привязано.' + bot.FOOTER);
            return reply.send({ ok: true });
          }

          await repo.markTokenUsed(db, repo.hashToken(rawToken));

          const inviteRole = tokenRow.invite_role ?? 'owner';
          const hasPrimary = await repo.hasPrimaryTelegramOwner(db, tokenProvider.account_id);
          const isPrimary = inviteRole === 'owner' && (existing?.is_primary === true || !hasPrimary);
          const role: repo.TelegramRole = inviteRole === 'assistant'
            ? 'assistant'
            : isPrimary ? 'owner' : (existing?.telegram_role ?? 'other');

          let tgAccount: repo.TelegramAccount;
          if (existing) {
            tgAccount = (await repo.relinkTelegramAccount(db, existing.id, {
              providerId: tokenRow.provider_id,
              accountId: tokenProvider.account_id,
              telegramUsername: msg.from.username,
              telegramFirstName: msg.from.first_name,
              telegramLastName: msg.from.last_name,
              role,
              isPrimary,
            })) ?? existing;
          } else {
            tgAccount = await repo.createTelegramAccount(db, {
              providerId: tokenRow.provider_id,
              accountId: tokenProvider.account_id,
              telegramUserId,
              telegramUsername: msg.from.username,
              telegramFirstName: msg.from.first_name,
              telegramLastName: msg.from.last_name,
              role,
              isPrimary,
            });
          }

          await repo.upsertProfileAccess(db, {
            telegramAccountId: tgAccount.id,
            providerId: tokenRow.provider_id,
            role,
            grantedByAccountId: tokenProvider.account_id,
          });

          await repo.logActivity(db, {
            providerId: tokenRow.provider_id,
            actorType: 'telegram',
            telegramAccountId: tgAccount.id,
            actionType: 'telegram_linked',
          });

          const name = msg.from.first_name ?? msg.from.username ?? 'вы';
          await bot.sendMessage(token, chatId, `✅ <b>${name}</b>, Telegram успешно привязан!` + bot.FOOTER);

          // Notify all other linked accounts
          await notifyAll(db, token, tokenRow.provider_id, tgAccount.id,
            `🔗 К профилю привязан новый Telegram: ${msg.from.first_name ?? ''} ${msg.from.username ? '@' + msg.from.username : ''}`
          );

          return reply.send({ ok: true });
        }

        await bot.sendMessage(token, chatId, bot.startText(), guestOptions);
        return reply.send({ ok: true });
      }

      // All other commands — need linked account
      const tgAccount = await repo.findLinkedAccountByTelegramUserId(db, telegramUserId);
      if (!tgAccount) {
        const message = lower === 'помощь' || lower === '/help' || lower === 'help'
          ? bot.guestHelpText()
          : bot.guestText();
        await bot.sendMessage(token, chatId, message, guestOptions);
        return reply.send({ ok: true });
      }

      const accessibleProviders = await listBotAccessibleProviders(db, tgAccount);
      if (accessibleProviders.length === 0) {
        // Owner has account but no profiles yet — direct them to Mini App to create first profile.
        // This happens when user registered via Mini App guest gate but hasn't created a profile.
        const miniUrl = telegramMiniAppUrl(env).replace('?startapp=onboarding', '') || telegramMiniAppUrl(env);
        const noProfileOptions = { replyMarkup: bot.miniAppKeyboard(miniUrl) };
        const isPrimaryOwner = tgAccount.is_primary && tgAccount.telegram_role === 'owner';
        const noProfileMsg = isPrimaryOwner
          ? [
              '<b>Профиль ещё не создан.</b>',
              '',
              'Откройте Mini App и создайте первый профиль специалиста.',
              'После этого бот сможет добавлять записи в календарь.',
            ].join('\n')
          : 'Нет доступных активных профилей. Обратитесь к владельцу профиля для получения доступа.';
        await bot.sendMessage(token, chatId, noProfileMsg, isPrimaryOwner ? noProfileOptions : {});
        return reply.send({ ok: true });
      }

      const botSession = await repo.findBotSession(db, tgAccount.id);
      const selectedProvider = resolveBotActiveProvider(accessibleProviders, botSession?.active_provider_id ?? tgAccount.provider_id);

      const profileMatch = /^(?:профиль|profile)\s+(\d+)$/i.exec(lower) ?? /^(\d+)$/.exec(lower);
      if (profileMatch && accessibleProviders.length > 1) {
        const idx = Number(profileMatch[1]) - 1;
        const nextProvider = accessibleProviders[idx];
        if (!nextProvider) {
          await bot.sendMessage(token, chatId, profileListMessage(accessibleProviders, selectedProvider?.id));
          return reply.send({ ok: true });
        }
        const pendingWasCancelled = await cancelPendingDraftOnProfileSwitch(db, tgAccount.id, botSession, nextProvider.id);
        await repo.setBotActiveProvider(db, tgAccount.id, nextProvider.id);
        await bot.sendMessage(token, chatId, profileSwitchedMessage(nextProvider.display_name, pendingWasCancelled));
        return reply.send({ ok: true });
      }

      const profileNameMatch = /^(?:профиль|profile)\s+(.+)$/i.exec(text.trim());
      if (profileNameMatch && accessibleProviders.length > 1) {
        const query = profileNameMatch[1]?.trim() ?? '';
        const nextProvider = findProviderByName(accessibleProviders, query);
        if (!nextProvider) {
          await bot.sendMessage(token, chatId, [
            `Профиль <b>${escapeHtml(query)}</b> не найден.`,
            '',
            profileListMessage(accessibleProviders, selectedProvider?.id),
          ].join('\n'));
          return reply.send({ ok: true });
        }
        const pendingWasCancelled = await cancelPendingDraftOnProfileSwitch(db, tgAccount.id, botSession, nextProvider.id);
        await repo.setBotActiveProvider(db, tgAccount.id, nextProvider.id);
        await bot.sendMessage(token, chatId, profileSwitchedMessage(nextProvider.display_name, pendingWasCancelled));
        return reply.send({ ok: true });
      }

      if (lower === 'профили' || lower === 'профиль' || lower === 'profiles' || lower === 'сменить профиль') {
        await bot.sendMessage(token, chatId, profileListMessage(accessibleProviders, selectedProvider?.id));
        return reply.send({ ok: true });
      }

      if (!selectedProvider && accessibleProviders.length > 1) {
        await bot.sendMessage(token, chatId, profileListMessage(accessibleProviders));
        return reply.send({ ok: true });
      }
      if (!selectedProvider) {
        await repo.setBotActiveProvider(db, tgAccount.id, accessibleProviders[0]!.id);
      }

      const provider = selectedProvider ?? accessibleProviders[0]!;
      const providerId = provider.id;
      const tz = provider.timezone ?? 'Asia/Almaty';
      const actorAccountId = provider.account_id ?? tgAccount.id;

      if (lower === 'отмена' || lower === 'cancel') {
        await repo.clearBotPendingBooking(db, tgAccount.id);
        await bot.sendMessage(token, chatId, 'Ок, черновик записи отменен.');
        return reply.send({ ok: true });
      }

      if (lower === 'изменить') {
        await bot.sendMessage(token, chatId, 'Пришлите запись заново одним сообщением. Например: 14 апреля с 10 до 20 кыз узату');
        return reply.send({ ok: true });
      }

      if (lower === 'подтвердить' || lower === 'confirm') {
        const pending = botSession?.pending_booking as bot.QuickBookingDraft | null | undefined;
        if (!pending || !botSession?.pending_expires_at || new Date(botSession.pending_expires_at).getTime() <= Date.now()) {
          await repo.clearBotPendingBooking(db, tgAccount.id);
          await bot.sendMessage(token, chatId, 'Нет активного черновика. Пришлите запись заново.');
          return reply.send({ ok: true });
        }

        const pendingProviderId = typeof (pending as unknown as { provider_id?: unknown }).provider_id === 'string'
          ? (pending as unknown as { provider_id: string }).provider_id
          : providerId;
        const pendingProvider = accessibleProviders.find(p => p.id === pendingProviderId) ?? provider;
        const { startsAt, endsAt } = bot.draftToDates(pending);
        if (startsAt >= endsAt) {
          await bot.sendMessage(token, chatId, 'Время начала должно быть раньше времени конца. Пришлите запись заново.');
          return reply.send({ ok: true });
        }
        if (['busy', 'blocked', 'tentative'].includes(pending.status)) {
          const overlap = await checkOverlap(db, pendingProvider.id, startsAt, endsAt);
          if (overlap) {
            await bot.sendMessage(token, chatId, 'Это время пересекается с другой записью. Пришлите другой интервал.');
            return reply.send({ ok: true });
          }
        }

        const entry = await createEntry(db, {
          providerId: pendingProvider.id,
          startsAt,
          endsAt,
          status: pending.status,
          title: pending.event_type ?? undefined,
          notes: pending.note ?? undefined,
          createdByAccountId: actorAccountId,
        });
        if (pending.client_name || pending.event_type || pending.note) {
          await upsertClient(db, entry.id, {
            clientName: pending.client_name ?? undefined,
            eventType: pending.event_type ?? undefined,
            notes: pending.note ?? undefined,
          });
        }
        publishCalendarChange({
          provider_id: pendingProvider.id,
          action: 'create',
          entry_id: entry.id,
          ranges: [{ starts_at: entry.starts_at.toISOString(), ends_at: entry.ends_at.toISOString() }],
        });
        await repo.logActivity(db, {
          providerId: pendingProvider.id,
          actorType: 'telegram',
          actorAccountId,
          telegramAccountId: tgAccount.id,
          actionType: 'calendar_created',
          targetType: 'calendar_entry',
          targetId: entry.id,
          payloadJson: {
            source: typeof (pending as unknown as { source?: unknown }).source === 'string'
              ? (pending as unknown as { source: string }).source
              : 'telegram_quick_booking',
            status: entry.status,
            starts_at: entry.starts_at.toISOString(),
            ends_at: entry.ends_at.toISOString(),
          },
        });
        await repo.clearBotPendingBooking(db, tgAccount.id);
        await bot.sendMessage(token, chatId, `Запись сохранена.\nАктивный профиль: <b>${pendingProvider.display_name}</b>`);
        await notifyAll(db, token, pendingProvider.id, tgAccount.id,
          `${msg.from.first_name ?? 'Помощник'} добавил запись через Telegram bot: ${pending.date} ${pending.all_day ? 'весь день' : `${pending.time_from}-${pending.time_to}`}.`
        );
        return reply.send({ ok: true });
      }

      const audioMessage = msg.voice ?? msg.audio ?? null;
      if (audioMessage) {
        if (!token) {
          await bot.sendMessage(token, chatId, 'Голосовое распознавание сейчас недоступно. Напишите запись текстом.');
          return reply.send({ ok: true });
        }

        const tgFile = await bot.getFile(token, audioMessage.file_id);
        if (!tgFile) {
          await bot.sendMessage(token, chatId, 'Не удалось получить голосовое сообщение. Отправьте голос еще раз или напишите текстом.');
          return reply.send({ ok: true });
        }

        const data = await bot.downloadFile(token, tgFile.file_path);
        if (!data) {
          await bot.sendMessage(token, chatId, 'Не удалось скачать голосовое сообщение. Отправьте голос еще раз или напишите текстом.');
          return reply.send({ ok: true });
        }

        let transcript = '';
        try {
          transcript = await speechToText.transcribeAudio({
            data,
            filename: audioFilename(msg.audio?.file_name, tgFile.file_path),
            mimeType: audioMessage.mime_type ?? 'audio/ogg',
          });
        } catch {
          await bot.sendMessage(token, chatId, 'Не удалось распознать голос. Отправьте голос еще раз или напишите запись текстом.');
          return reply.send({ ok: true });
        }

        const voiceDraft = bot.parseQuickBookingText(transcript);
        if (!voiceDraft) {
          await bot.sendMessage(token, chatId, [
            '<b>Не удалось разобрать запись.</b>',
            `Распознанный текст: <b>${escapeHtml(transcript)}</b>`,
            '',
            'Попробуйте отправить голос короче или напишите текстом: 14 апреля с 10 до 20 кыз узату',
          ].join('\n'));
          return reply.send({ ok: true });
        }

        const pending = { ...voiceDraft, provider_id: providerId, source: 'telegram_voice_booking' };
        await repo.setBotPendingBooking(db, tgAccount.id, pending, new Date(Date.now() + 10 * 60 * 1000));
        await bot.sendMessage(token, chatId, [
          `Распознанный текст: <b>${escapeHtml(transcript)}</b>`,
          '',
          bot.bookingPreview(provider.display_name, voiceDraft),
        ].join('\n'));
        return reply.send({ ok: true });
      }

      const quickDraft = bot.parseQuickBookingText(text);
      if (quickDraft) {
        const pending = { ...quickDraft, provider_id: providerId };
        await repo.setBotPendingBooking(db, tgAccount.id, pending, new Date(Date.now() + 10 * 60 * 1000));
        await bot.sendMessage(token, chatId, bot.bookingPreview(provider.display_name, quickDraft));
        return reply.send({ ok: true });
      }

      // помощь
      if (lower === 'помощь' || lower === '/help') {
        await bot.sendMessage(token, chatId, bot.helpText(provider.display_name, accessibleProviders.length > 1));
        return reply.send({ ok: true });
      }

      // отвязать
      if (lower === 'отвязать') {
        await repo.unlinkTelegramAccount(db, tgAccount.id);
        await repo.revokeMiniSessionsForTelegramAccount(db, tgAccount.id);
        await repo.logActivity(db, { providerId, actorType: 'telegram', telegramAccountId: tgAccount.id, actionType: 'telegram_unlinked' });
        await bot.sendMessage(token, chatId, '🔓 Telegram отвязан от профиля.' + bot.FOOTER);
        await notifyAll(db, token, providerId, tgAccount.id,
          `🔓 Telegram ${msg.from.first_name ?? ''} ${msg.from.username ? '@' + msg.from.username : ''} был отвязан от профиля.`
        );
        return reply.send({ ok: true });
      }

      // календарь
      if (lower === 'календарь' || lower === '/calendar') {
        const from = new Date();
        const to = new Date(Date.now() + 7 * 86400000);
        const entries = await findEntriesByRange(db, providerId, from, to);
        if (entries.length === 0) {
          await bot.sendMessage(token, chatId, '📅 На ближайшие 7 дней записей нет.' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const lines = entries.map(e => {
          const start = new Date(e.starts_at).toLocaleString('ru-RU', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const end = new Date(e.ends_at).toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
          const emoji = e.status === 'busy' ? '🔴' : e.status === 'tentative' ? '🟡' : e.status === 'blocked' ? '⚫' : '🟢';
          return `${emoji} ${start}–${end}${e.title ? ' · ' + e.title : ''}`;
        });
        await bot.sendMessage(token, chatId, `📅 <b>Ближайшие 7 дней:</b>\n\n${lines.join('\n')}` + bot.FOOTER);
        return reply.send({ ok: true });
      }

      // свободно <дата>
      if (lower.startsWith('свободно ')) {
        const parts = text.split(/\s+/);
        const dateStr = parts[1];
        if (!dateStr) { await bot.sendMessage(token, chatId, '❌ Укажите дату: свободно 12.04' + bot.FOOTER); return reply.send({ ok: true }); }
        const date = bot.parseDate(dateStr);
        if (!date) { await bot.sendMessage(token, chatId, '❌ Неверный формат даты. Пример: свободно 12.04' + bot.FOOTER); return reply.send({ ok: true }); }
        const startsAt = new Date(date); startsAt.setHours(0, 0, 0, 0);
        const endsAt = new Date(date); endsAt.setHours(23, 59, 0, 0);
        const entry = await createEntry(db, { providerId, startsAt, endsAt, status: 'free', createdByAccountId: actorAccountId });
        publishCalendarChange({ provider_id: providerId, action: 'create', entry_id: entry.id, ranges: [{ starts_at: entry.starts_at.toISOString(), ends_at: entry.ends_at.toISOString() }] });
        await repo.logActivity(db, { providerId, actorType: 'telegram', telegramAccountId: tgAccount.id, actionType: 'calendar_created', targetType: 'calendar_entry', targetId: entry.id });
        await bot.sendMessage(token, chatId, `🟢 ${dateStr} отмечен как свободный.` + bot.FOOTER);
        await notifyAll(db, token, providerId, tgAccount.id, `🟢 ${msg.from.first_name ?? 'Помощник'} отметил ${dateStr} свободным.`);
        return reply.send({ ok: true });
      }

      // занято <дата> <время_начала> <время_конца>
      // подвопросом <дата> <время_начала> <время_конца>
      const isBusy = lower.startsWith('занято ');
      const isTentative = lower.startsWith('подвопросом ');
      if (isBusy || isTentative) {
        const status: CalendarEntryStatus = isBusy ? 'busy' : 'tentative';
        const parts = text.split(/\s+/);
        if (parts.length < 4) {
          await bot.sendMessage(token, chatId, `❌ Формат: ${isBusy ? 'занято' : 'подвопросом'} 12.04 13:00 18:00` + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const dateStr = parts[1]!;
        const date = bot.parseDate(dateStr);
        const startTime = bot.parseTime(parts[2]!);
        const endTime = bot.parseTime(parts[3]!);
        if (!date || !startTime || !endTime) {
          await bot.sendMessage(token, chatId, '❌ Неверный формат. Пример: занято 12.04 13:00 18:00' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const startsAt = new Date(date); startsAt.setHours(startTime.h, startTime.m, 0, 0);
        const endsAt = new Date(date); endsAt.setHours(endTime.h, endTime.m, 0, 0);
        if (startsAt >= endsAt) {
          await bot.sendMessage(token, chatId, '❌ Время начала должно быть раньше конца.' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const entry = await createEntry(db, { providerId, startsAt, endsAt, status, createdByAccountId: actorAccountId });
        publishCalendarChange({ provider_id: providerId, action: 'create', entry_id: entry.id, ranges: [{ starts_at: entry.starts_at.toISOString(), ends_at: entry.ends_at.toISOString() }] });
        await repo.logActivity(db, { providerId, actorType: 'telegram', telegramAccountId: tgAccount.id, actionType: 'calendar_created', targetType: 'calendar_entry', targetId: entry.id });
        const emoji = status === 'busy' ? '🔴' : '🟡';
        const label = status === 'busy' ? 'занятым' : 'под вопросом';
        await bot.sendMessage(token, chatId, `${emoji} ${dateStr} ${parts[2]}–${parts[3]} отмечен как ${label}.` + bot.FOOTER);
        await notifyAll(db, token, providerId, tgAccount.id,
          `${emoji} ${msg.from.first_name ?? 'Помощник'} добавил запись: ${dateStr} ${parts[2]}–${parts[3]} (${label}).`
        );
        return reply.send({ ok: true });
      }

      // клиент <дата>
      if (lower.startsWith('клиент ')) {
        const parts = text.split(/\s+/);
        const dateStr = parts[1];
        if (!dateStr) { await bot.sendMessage(token, chatId, '❌ Укажите дату: клиент 12.04' + bot.FOOTER); return reply.send({ ok: true }); }
        const date = bot.parseDate(dateStr);
        if (!date) { await bot.sendMessage(token, chatId, '❌ Неверный формат даты.' + bot.FOOTER); return reply.send({ ok: true }); }
        const from = new Date(date); from.setHours(0, 0, 0, 0);
        const to = new Date(date); to.setHours(23, 59, 59, 999);
        const entries = await findEntriesByRange(db, providerId, from, to);
        if (entries.length === 0) {
          await bot.sendMessage(token, chatId, `📭 На ${dateStr} записей нет.` + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const { findClientByEntryId } = await import('../calendar/repositories');
        const lines: string[] = [];
        for (const e of entries) {
          const client = await findClientByEntryId(db, e.id);
          const start = new Date(e.starts_at).toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
          const end = new Date(e.ends_at).toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
          lines.push(`🕐 ${start}–${end}${e.title ? ' · ' + e.title : ''}`);
          if (client?.client_name) lines.push(`  👤 ${client.client_name}${client.client_phone ? ' · ' + client.client_phone : ''}`);
          if (client?.event_type) lines.push(`  🎉 ${client.event_type}`);
          if (client?.location_text) lines.push(`  📍 ${client.location_text}`);
          if (client?.price_amount) lines.push(`  💰 ${client.price_amount} ${client.currency}`);
        }
        await bot.sendMessage(token, chatId, `👤 <b>Клиенты на ${dateStr}:</b>\n\n${lines.join('\n')}` + bot.FOOTER);
        return reply.send({ ok: true });
      }

      // подписка / сколько дней осталось
      if (lower === 'подписка' || lower === 'сколько дней осталось') {
        const subInfo = await getSubscriptionStatus(db, providerId);
        if (!subInfo.status) {
          await bot.sendMessage(token, chatId, '📋 Подписка не найдена. Зайдите в кабинет на сайте.' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const statusLabel: Record<string, string> = {
          trial: '🟡 Пробный период', active: '🟢 Активна', expiring: '🟠 Скоро истекает',
          expired: '🔴 Истекла', blocked: '⛔ Заблокирована', cancelled: '❌ Отменена',
        };
        const expires = subInfo.expires_at ? new Date(subInfo.expires_at).toLocaleDateString('ru-RU', { timeZone: tz }) : '—';
        let text = `📋 <b>Подписка:</b> ${statusLabel[subInfo.status] ?? subInfo.status}\n`;
        text += `📅 Действует до: ${expires}\n`;
        text += `⏳ Осталось: ${subInfo.days_left} дн.\n`;
        if (!subInfo.is_visible) {
          text += `\n⚠️ Профиль скрыт. Зайдите в кабинет и оплатите подписку.`;
        }
        await bot.sendMessage(token, chatId, text + bot.FOOTER);
        return reply.send({ ok: true });
      }

      // Unknown
      await bot.sendMessage(token, chatId, '🤔 Не понял команду.' + bot.FOOTER);
      return reply.send({ ok: true });
    });

    // POST /telegram/unlink  (auth required)
    app.post('/telegram/unlink', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_integrations');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return unauthorized(reply);

      const body = req.body as Record<string, unknown>;
      const telegramAccountId = typeof body['telegram_account_id'] === 'string' ? body['telegram_account_id'] : null;
      if (!telegramAccountId) return badRequest(reply, 'Необходимо указать telegram_account_id');

      const tgAccount = await db<repo.TelegramAccount[]>`SELECT * FROM telegram_accounts WHERE id = ${telegramAccountId} LIMIT 1`;
      const ta = tgAccount[0];
      if (!ta) return notFound(reply);

      // Ownership check: either the account's primary provider belongs to accountId,
      // or the account itself belongs to accountId (guest-gate accounts have provider_id = NULL).
      let logProviderId: string | null = null;
      if (ta.provider_id) {
        const provider = await findProviderById(db, ta.provider_id);
        if (!provider || provider.account_id !== accountId) return forbidden(reply);
        logProviderId = provider.id;
      } else if (ta.account_id !== accountId) {
        // No direct provider link — verify via profile access table
        const accessRows = await db<Array<{ provider_id: string }>>`
          SELECT tpa.provider_id FROM telegram_profile_access tpa
          JOIN providers p ON p.id = tpa.provider_id
          WHERE tpa.telegram_account_id = ${telegramAccountId}
            AND p.account_id = ${accountId}
          LIMIT 1
        `;
        if (!accessRows[0]) return forbidden(reply);
        logProviderId = accessRows[0].provider_id;
      }

      await repo.unlinkTelegramAccount(db, telegramAccountId);
      await repo.revokeMiniSessionsForTelegramAccount(db, telegramAccountId);
      if (logProviderId) {
        await repo.logActivity(db, { providerId: logProviderId, actorType: 'web', actorAccountId: accountId, telegramAccountId, actionType: 'telegram_unlinked' });
      }

      const token = env.TELEGRAM_BOT_TOKEN ?? '';
      if (token) {
        await bot.sendMessage(token, ta.telegram_user_id, '🔓 Ваш Telegram был отвязан от профиля через веб-кабинет.' + bot.FOOTER);
      }

      return reply.send({ ok: true });
    });

    // GET /providers/:id/telegram-accounts  (auth required)
    app.get('/providers/:id/telegram-accounts', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_integrations');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return unauthorized(reply);

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== accountId) return forbidden(reply);

      const accounts = await repo.findAllAccountsByProvider(db, id);
      return reply.send({ ok: true, accounts });
    });

    // GET /providers/:id/team  (auth required)
    app.get('/providers/:id/team', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return unauthorized(reply);

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== accountId) return forbidden(reply);

      const rows = await db<Array<repo.TelegramAccount & { access_role: repo.TelegramRole | null; access_status: string | null; access_granted_at: Date | null }>>`
        SELECT ta.*, tpa.role AS access_role, tpa.status AS access_status, tpa.granted_at AS access_granted_at
        FROM telegram_accounts ta
        LEFT JOIN telegram_profile_access tpa
          ON tpa.telegram_account_id = ta.id
          AND tpa.provider_id = ${id}
          AND tpa.status = 'active'
        WHERE ta.status = 'linked'
          AND (
            tpa.id IS NOT NULL
            OR (ta.account_id = ${provider.account_id} AND ta.is_primary = TRUE AND ta.telegram_role = 'owner')
          )
        ORDER BY ta.is_primary DESC, tpa.granted_at ASC NULLS FIRST, ta.created_at ASC
      `;

      return reply.send({ ok: true, team: rows });
    });

    // POST /providers/:id/team/:telegramAccountId/revoke
    app.post('/providers/:id/team/:telegramAccountId/revoke', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return unauthorized(reply);

      const { id, telegramAccountId } = req.params as { id: string; telegramAccountId: string };
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== accountId) return forbidden(reply);

      const rows = await db<repo.TelegramAccount[]>`SELECT * FROM telegram_accounts WHERE id = ${telegramAccountId} LIMIT 1`;
      const tgAccount = rows[0];
      if (!tgAccount) return reply.code(404).send({ ok: false, error: 'Telegram-аккаунт не найден' });
      if (tgAccount.is_primary) return badRequest(reply, 'Нельзя отозвать доступ у основного владельца');

      await repo.revokeProfileAccess(db, telegramAccountId, id);
      await repo.revokeMiniSessionsForTelegramAccount(db, telegramAccountId);
      await repo.logActivity(db, {
        providerId: id,
        actorType: mini ? 'telegram' : 'web',
        actorAccountId: accountId,
        telegramAccountId: mini?.telegramAccount.id,
        actionType: 'assistant_revoked',
        targetType: 'telegram_account',
        targetId: telegramAccountId,
        payloadJson: { revoked_telegram_user_id: tgAccount.telegram_user_id },
      });
      return reply.send({ ok: true });
    });

    // POST /providers/:id/team/:telegramAccountId/make-primary
    app.post('/providers/:id/team/:telegramAccountId/make-primary', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return unauthorized(reply);

      const { id, telegramAccountId } = req.params as { id: string; telegramAccountId: string };
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== accountId) return forbidden(reply);

      const rows = await db<repo.TelegramAccount[]>`
        SELECT ta.* FROM telegram_accounts ta
        LEFT JOIN telegram_profile_access tpa
          ON tpa.telegram_account_id = ta.id
          AND tpa.provider_id = ${id}
          AND tpa.status = 'active'
        WHERE ta.id = ${telegramAccountId}
          AND ta.account_id = ${accountId}
          AND ta.status = 'linked'
          AND (ta.telegram_role = 'owner' OR tpa.id IS NOT NULL)
        LIMIT 1
      `;
      const target = rows[0];
      if (!target) return reply.code(404).send({ ok: false, error: 'Telegram-аккаунт не найден' });

      const updated = await repo.replacePrimaryTelegramOwner(db, accountId, telegramAccountId);
      if (!updated) return badRequest(reply, 'Нельзя заменить основного владельца');
      await repo.upsertProfileAccess(db, { telegramAccountId, providerId: id, role: 'owner', grantedByAccountId: accountId });
      await repo.logActivity(db, {
        providerId: id,
        actorType: mini ? 'telegram' : 'web',
        actorAccountId: accountId,
        telegramAccountId: mini?.telegramAccount.id,
        actionType: 'primary_telegram_changed',
        targetType: 'telegram_account',
        targetId: telegramAccountId,
        payloadJson: { primary_telegram_user_id: updated.telegram_user_id },
      });
      return reply.send({ ok: true, telegram_account: updated });
    });
  };

  return plugin;
}

async function notifyAll(db: Db, token: string, providerId: string, excludeId: string, text: string): Promise<void> {
  if (!token) return;
  const accounts = await repo.findLinkedAccountsByProvider(db, providerId);
  for (const a of accounts) {
    if (a.id === excludeId) continue;
    await bot.sendMessage(token, a.telegram_user_id, text);
  }
}

async function listBotAccessibleProviders(db: Db, tgAccount: repo.TelegramAccount): Promise<Provider[]> {
  const ids = await repo.findAccessibleProviderIdsForTelegramAccount(db, tgAccount);
  const providers: Provider[] = [];
  for (const id of ids) {
    const provider = await findProviderById(db, id);
    if (provider && !provider.archived_at && !provider.pending_delete_at) providers.push(provider);
  }
  return providers;
}

function resolveBotActiveProvider(providers: Provider[], activeProviderId: string | null | undefined): Provider | null {
  if (!activeProviderId) return providers.length === 1 ? providers[0]! : null;
  return providers.find(provider => provider.id === activeProviderId) ?? (providers.length === 1 ? providers[0]! : null);
}

function profileListMessage(providers: Provider[], activeProviderId?: string): string {
  const lines = providers.map((provider, index) => {
    const active = provider.id === activeProviderId ? ' · активный' : '';
    const city = provider.city ? ` · ${provider.city}` : '';
    return `${index + 1}. <b>${provider.display_name}</b>${city}${active}`;
  });
  return [
    '<b>Выберите профиль для Telegram bot</b>',
    ...lines,
    '',
    'Напишите номер, <b>Профиль 1</b> или <b>Профиль Название</b>.',
  ].join('\n');
}

async function cancelPendingDraftOnProfileSwitch(
  db: Db,
  telegramAccountId: string,
  session: repo.TelegramBotSession | null,
  nextProviderId: string,
): Promise<boolean> {
  const pending = session?.pending_booking as { provider_id?: unknown } | null | undefined;
  const expiresAt = session?.pending_expires_at ? new Date(session.pending_expires_at).getTime() : 0;
  if (!pending || expiresAt <= Date.now()) return false;
  if (pending.provider_id === nextProviderId) return false;
  await repo.clearBotPendingBooking(db, telegramAccountId);
  return true;
}

function profileSwitchedMessage(profileName: string, pendingWasCancelled: boolean): string {
  return [
    `Активный профиль: <b>${escapeHtml(profileName)}</b>`,
    pendingWasCancelled ? 'Черновик записи отменен, чтобы не сохранить его в другой профиль.' : null,
  ].filter(Boolean).join('\n');
}

function findProviderByName(providers: Provider[], query: string): Provider | null {
  const needle = normalizeProfileName(query);
  if (!needle) return null;
  return providers.find(provider => normalizeProfileName(provider.display_name) === needle)
    ?? providers.find(provider => normalizeProfileName(provider.display_name).includes(needle))
    ?? null;
}

function normalizeProfileName(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function audioFilename(fileName: string | undefined, filePath: string): string {
  if (fileName) return fileName;
  const fromPath = filePath.split('/').pop();
  return fromPath || 'telegram-voice.ogg';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function telegramMiniAppUrl(env: AppEnv): string {
  const username = (env.TELEGRAM_BOT_USERNAME ?? 'octiqa_mini_bot').trim().replace(/^@+/, '') || 'octiqa_mini_bot';
  const shortName = (env.TELEGRAM_MINIAPP_SHORT_NAME ?? 'octiqa').trim().replace(/^\/+/, '');
  const base = shortName ? `https://t.me/${username}/${shortName}` : `https://t.me/${username}`;
  return `${base}?startapp=onboarding`;
}

async function ensureMiniGuestAccountSchema(db: Db): Promise<void> {
  const rows = await db<Array<{ is_nullable: string }>>`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'telegram_accounts'
      AND column_name = 'provider_id'
    LIMIT 1
  `;
  if (rows[0]?.is_nullable === 'YES') return;
  await db`ALTER TABLE telegram_accounts ALTER COLUMN provider_id DROP NOT NULL`;
  await db`ALTER TABLE telegram_accounts DROP CONSTRAINT IF EXISTS telegram_accounts_provider_id_fkey`;
  await db`
    ALTER TABLE telegram_accounts
    ADD CONSTRAINT telegram_accounts_provider_id_fkey
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
  `;
}

async function listMiniAccessibleProviders(db: Db, tgAccount: repo.TelegramAccount): Promise<readonly unknown[]> {
  if (tgAccount.is_primary && tgAccount.account_id) {
    // Owners see all their providers including archived/pending-delete
    // so that the Mini App profile tab can show the archive section.
    return db`
      SELECT p.*, ps.category AS primary_category, ps.subcategory AS primary_subcategory
      FROM providers p
      LEFT JOIN LATERAL (
        SELECT category, subcategory FROM provider_services
        WHERE provider_id = p.id AND is_active = TRUE
        ORDER BY created_at ASC LIMIT 1
      ) ps ON TRUE
      WHERE p.account_id = ${tgAccount.account_id}
      ORDER BY p.created_at ASC
    `;
  }

  // Assistants only see active (non-archived) profiles they have explicit access to
  return db`
    SELECT p.* FROM providers p
    JOIN telegram_profile_access tpa ON tpa.provider_id = p.id
    WHERE tpa.telegram_account_id = ${tgAccount.id}
      AND tpa.status = 'active'
      AND p.archived_at IS NULL
      AND p.pending_delete_at IS NULL
    ORDER BY p.created_at ASC
  `;
}

async function uniqueMiniAccountUsername(
  db: Db,
  fullName: string,
  telegramUsername: string | undefined,
  telegramUserId: number,
): Promise<string> {
  const base = slugAccountName(telegramUsername || fullName) || 'telegram';
  const candidates = [
    `${base}_${telegramUserId}`,
    `telegram_${telegramUserId}`,
  ];
  for (const candidate of candidates) {
    if (!await authRepo.findAccountByUsername(db, candidate)) return candidate;
  }
  return `telegram_${telegramUserId}_${Date.now().toString(36)}`;
}

function slugAccountName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);
}
