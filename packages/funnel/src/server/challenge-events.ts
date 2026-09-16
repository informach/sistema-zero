import { z } from 'zod'
import type { FunnelRepo } from '../db/repo'
import { json, jsonError, safeJson } from '../lib/http'
import { safeEqual } from '../lib/safe-equal'

const ChallengeEventName = z.enum([
  'account_activated',
  'child_profile_created',
  'challenge_started',
  'challenge_day_completed',
  'challenge_completed',
  'expiry_reminder_sent',
  'challenge_expired',
])

const Body = z.object({
  events: z
    .array(
      z.object({
        buyerUserId: z.string().uuid(),
        eventName: ChallengeEventName,
        occurredAt: z.string().datetime({ offset: true }),
      }),
    )
    .min(1)
    .max(500),
})

export interface ChallengeEventsDeps {
  repo: FunnelRepo
  internalToken: string
}

/** Ingestão S2S sem PII; o repositório resolve e deduplica a jornada pelo buyer id. */
export async function ingestChallengeEvents(
  request: Request,
  deps: ChallengeEventsDeps,
): Promise<Response> {
  const token = request.headers.get('x-internal-token')
  if (!token || !safeEqual(token, deps.internalToken)) {
    return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  }
  const parsed = Body.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Payload inválido.', 400, 'BAD_REQUEST')

  const inserted = await deps.repo.insertBuyerLifecycleEvents(
    parsed.data.events.map((event) => ({ ...event, occurredAt: new Date(event.occurredAt) })),
  )
  return json({ accepted: parsed.data.events.length, inserted }, 202)
}
