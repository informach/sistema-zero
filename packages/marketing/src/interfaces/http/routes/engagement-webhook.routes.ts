import { timingSafeEqual } from 'node:crypto'
import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { EngagementEngine } from '../../../domain/ports/engagement-engine.port'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import {
  parseMetaEvents,
  verifyMetaSignature,
} from '../../../infrastructure/gateways/meta/engagement-webhook'
import { assertInternalCaller } from '../auth'
export const ENGAGEMENT_WEBHOOK_PATH = '/marketing/webhooks/instagram'
export type EngagementWebhookDeps = {
  engine: EngagementEngine
  internalToken: string
  appSecret: string
  verifyToken: string
  appId?: string
}
export function engagementWebhookRoutes(deps: EngagementWebhookDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get(ENGAGEMENT_WEBHOOK_PATH, ({ query }) => {
      const actual = Buffer.from(query['hub.verify_token'] ?? ''),
        expected = Buffer.from(deps.verifyToken)
      if (
        query['hub.mode'] !== 'subscribe' ||
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new UnauthorizedError('Challenge inválido')
      const challenge = query['hub.challenge']
      if (!challenge || !/^\d{1,200}$/.test(challenge))
        throw new WorkspaceError('VALIDATION_ERROR', 'Challenge inválido')
      return new Response(challenge, { headers: { 'content-type': 'text/plain' } })
    })
    .post(ENGAGEMENT_WEBHOOK_PATH, async ({ body, request }) => {
      if (!(body instanceof Uint8Array))
        throw new WorkspaceError('VALIDATION_ERROR', 'Corpo original indisponível')
      verifyMetaSignature(body, request.headers.get('x-hub-signature-256'), deps.appSecret)
      const events = parseMetaEvents(body, deps.appId)
      const inserted = await deps.engine.ingest(events)
      return { received: events.length, inserted }
    })
}
