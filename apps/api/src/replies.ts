/* ── replies ──────────────────────────────────────────────────────────────────
   Standard `{ ok: false, error }` JSON responses.

   Why: 100+ inline `reply.code(N).send({ ok: false, error: '...' })` calls
   were drifting in wording — 'Нет доступа' / 'Доступ запрещён' / 'Не найдено'
   appearing in slightly different forms. These helpers give one canonical
   default per HTTP status and one chokepoint to evolve the response shape.
────────────────────────────────────────────────────────────────────────────── */

import type { FastifyReply } from 'fastify';

export function badRequest(reply: FastifyReply, error: string): FastifyReply {
  return reply.code(400).send({ ok: false, error });
}

export function unauthorized(reply: FastifyReply, error = 'Нет доступа'): FastifyReply {
  return reply.code(401).send({ ok: false, error });
}

export function forbidden(reply: FastifyReply, error = 'Доступ запрещён'): FastifyReply {
  return reply.code(403).send({ ok: false, error });
}

export function notFound(reply: FastifyReply, error = 'Не найдено'): FastifyReply {
  return reply.code(404).send({ ok: false, error });
}

export function conflict(reply: FastifyReply, error: string): FastifyReply {
  return reply.code(409).send({ ok: false, error });
}

export function serverError(reply: FastifyReply, error = 'Внутренняя ошибка сервера'): FastifyReply {
  return reply.code(500).send({ ok: false, error });
}
