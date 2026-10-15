import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type { StaffOperation } from '@sistemazero/core/staff'
import { parseBuildRequest } from '@sistemazero/core/studio'
import { z } from 'zod'
import type { StaffGateway } from '../../application/staff/staff-operations.service'

export function createStaffGateway(options: {
  gatewayUrl?: string
  consumerId: string
  hmacSecret?: string
  studioUrl?: string
  studioToken?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}): StaffGateway {
  return {
    async execute(operation, actorId, accessToken) {
      if (!options.gatewayUrl) throw new Error('Staff gateway is not configured')
      const route =
        operation.action === 'studio.build'
          ? { method: 'POST' as const, path: '/v1/build', body: parseBuildRequest(operation.build) }
          : staffRoute(operation, actorId)
      const body = route.body ? JSON.stringify(route.body) : undefined
      const headers = new Headers({ accept: 'application/json' })
      if (body) headers.set('content-type', 'application/json')
      if (operation.action === 'studio.build') {
        if (!options.studioUrl || !options.studioToken)
          throw new Error('Staff Studio build service is not configured')
        headers.set('authorization', `Bearer ${options.studioToken}`)
      } else if (operation.action === 'messages.send' || operation.action === 'messages.status') {
        if (!options.hmacSecret) throw new Error('Staff messaging is not configured')
        const ts = Math.floor(Date.now() / 1000)
        const intent =
          operation.action === 'messages.send' ? operation.message.intentId : operation.intentId
        headers.set('idempotency-key', intent)
        headers.set('x-consumer-id', options.consumerId)
        headers.set(
          'x-signature',
          `t=${ts},v1=${signHmac(options.hmacSecret, canonicalHmacMessage({ method: route.method, path: route.path, idempotencyKey: intent, body: body ?? '' }), ts)}`,
        )
      } else headers.set('authorization', `Bearer ${accessToken}`)
      const response = await (options.fetchImpl ?? fetch)(
        new URL(
          route.path,
          operation.action === 'studio.build' ? options.studioUrl : options.gatewayUrl,
        ),
        {
          method: route.method,
          body,
          headers,
          redirect: 'error',
          signal: AbortSignal.timeout(
            operation.action === 'studio.build' ? 60000 : (options.timeoutMs ?? 15000),
          ),
        },
      )
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Staff upstream response missing')
      const chunks: Uint8Array[] = []
      let size = 0
      try {
        for (;;) {
          const part = await reader.read()
          if (part.done) break
          size += part.value.byteLength
          if (size > 4_000_000) throw new Error('Staff response exceeds limit')
          chunks.push(part.value)
        }
      } finally {
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (operation.action === 'studio.build' && [413, 422].includes(response.status)) {
        const failure = z
          .object({
            ok: z.literal(false),
            code: z.enum(['BUILD_FAILED', 'OUTPUT_TOO_LARGE']),
            message: z.string(),
            output: z.string().optional(),
          })
          .safeParse(value)
        if (failure.success)
          return { status: 200, value: { ...failure.data, upstreamStatus: response.status } }
      }
      return { status: response.status, value }
    },
  }
}
function staffRoute(
  operation: StaffOperation,
  actorId: string,
): { method: 'POST' | 'GET'; path: string; body?: unknown } {
  switch (operation.action) {
    case 'identity':
      throw new Error('Identity must be resolved by the auth service')
    case 'studio.build':
      throw new Error('Build must use the configured Studio runtime')
    case 'messages.send':
      return {
        method: 'POST',
        path: '/messaging/staff/send',
        body: { actorId, message: operation.message },
      }
    case 'messages.status':
      return {
        method: 'POST',
        path: '/messaging/staff/status',
        body: { actorId, intentId: operation.intentId },
      }
    case 'messages.templates':
      return {
        method: 'GET',
        path: `/messaging/admin/templates?limit=${operation.limit}&offset=${operation.offset}`,
      }
    case 'helpdesk.list': {
      const query = new URLSearchParams({ limit: String(operation.limit) })
      if (operation.q) query.set('q', operation.q)
      if (operation.cursor) query.set('cursor', operation.cursor)
      return { method: 'GET', path: `/helpdesk/tickets?${query}` }
    }
    case 'helpdesk.ticket':
      return { method: 'GET', path: `/helpdesk/tickets/${operation.id}` }
    case 'helpdesk.kb.list':
      return {
        method: 'GET',
        path: `/helpdesk/kb?limit=${operation.limit}&offset=${operation.offset}`,
      }
    case 'helpdesk.kb.get':
      return { method: 'GET', path: `/helpdesk/kb/${operation.id}` }
    case 'helpdesk.reply':
      return {
        method: 'POST',
        path: `/helpdesk/tickets/${operation.id}/reply`,
        body: { body: operation.body, version: operation.version },
      }
    case 'studio.submissions':
      return {
        method: 'GET',
        path: `/members/admin/studio-submissions?limit=${operation.limit}&offset=${operation.offset}`,
      }
    case 'studio.submission':
      return {
        method: 'GET',
        path: `/members/admin/blocks/${operation.blockId}/studio-submissions/${operation.userId}`,
      }
  }
}
