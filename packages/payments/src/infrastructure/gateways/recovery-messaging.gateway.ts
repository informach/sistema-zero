import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { z } from 'zod'
import { DomainError, ValidationError } from '../../domain/shared/errors'
import type {
  RecoveryMessageReceipt,
  RecoveryMessagingGateway,
} from '../../domain/subscription-recovery/recovery-messaging.port'

const receiptSchema = z.object({
  id: z.uuid(),
  status: z.enum([
    'QUEUED',
    'SCHEDULED',
    'SENDING',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
    'SUPPRESSED',
  ]),
  createdAt: z.iso.datetime({ offset: true }),
  deliveredAt: z.iso.datetime({ offset: true }).nullable(),
})
const suppressionSchema = z.object({ suppressed: z.boolean(), message: receiptSchema })
export class RecoveryMessagingUnavailableError extends DomainError {
  readonly code = 'RECOVERY_MESSAGING_UNAVAILABLE'
  constructor() {
    super('Não foi possível confirmar a solicitação de comunicação.')
  }
}
function receipt(value: z.infer<typeof receiptSchema>): RecoveryMessageReceipt {
  return {
    id: value.id,
    status: value.status,
    acceptedAt: new Date(value.createdAt),
    deliveredAt: value.deliveredAt ? new Date(value.deliveredAt) : null,
  }
}

/** Payments → gateway HMAC → Messaging. Não chama SendGrid/Evolution diretamente. */
export function createRecoveryMessagingGateway(options: {
  gatewayUrl: string
  hmacSecret: string
  timeoutMs?: number
  fetchImpl?: (input: string, init: RequestInit) => Promise<Response>
}): RecoveryMessagingGateway {
  const url = new URL(options.gatewayUrl)
  const timeoutMs = options.timeoutMs ?? 10_000
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    options.hmacSecret.length < 16 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 30_000
  )
    throw new ValidationError('Configuração de comunicação inválida')
  const doFetch = options.fetchImpl ?? fetch
  const secret = options.hmacSecret

  async function call(
    method: 'GET' | 'POST',
    path: string,
    input?: unknown,
    idempotencyKey?: string,
  ): Promise<unknown> {
    try {
      const raw = input === undefined ? '' : JSON.stringify(input)
      const timestamp = Math.floor(Date.now() / 1000)
      const canonical = canonicalHmacMessage({ method, path, body: raw, idempotencyKey })
      const signal = AbortSignal.timeout(timeoutMs)
      const response = await doFetch(`${url.origin}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-consumer-id': 'payments',
          'x-signature': `t=${timestamp},v1=${signHmac(secret, canonical, timestamp)}`,
          ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
        },
        ...(input === undefined ? {} : { body: raw }),
        signal,
        redirect: 'error',
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new RecoveryMessagingUnavailableError()
      }
      return await readJsonBodyWithLimit(response, 65_536, signal)
    } catch {
      // Corpos e exceções podem conter destinatários/credenciais; não propagá-los.
      throw new RecoveryMessagingUnavailableError()
    }
  }
  function idPath(id: string): string {
    if (!z.uuid().safeParse(id).success)
      throw new ValidationError('Identificador de comunicação inválido')
    return `/messaging/messages/${id}`
  }
  return {
    async send(request) {
      if (!request.idempotencyKey || request.idempotencyKey.length > 200)
        throw new ValidationError('Identidade do aviso inválida')
      const { idempotencyKey, ...body } = request
      try {
        return receipt(
          receiptSchema.parse(await call('POST', '/messaging/send', body, idempotencyKey)),
        )
      } catch {
        throw new RecoveryMessagingUnavailableError()
      }
    },
    async get(id) {
      const path = idPath(id)
      try {
        const current = receiptSchema.parse(await call('GET', path))
        if (current.id !== id) throw new RecoveryMessagingUnavailableError()
        return receipt(current)
      } catch {
        throw new RecoveryMessagingUnavailableError()
      }
    },
    async suppress(id) {
      const path = idPath(id)
      try {
        const result = suppressionSchema.parse(await call('POST', `${path}/suppress`, {}))
        if (
          result.message.id !== id ||
          result.suppressed !== (result.message.status === 'SUPPRESSED')
        )
          throw new RecoveryMessagingUnavailableError()
        return { suppressed: result.suppressed, receipt: receipt(result.message) }
      } catch {
        throw new RecoveryMessagingUnavailableError()
      }
    },
    async suppressIntent(request) {
      if (!request.idempotencyKey || request.idempotencyKey.length > 200)
        throw new ValidationError('Identidade do aviso inválida')
      const { idempotencyKey, ...body } = request
      try {
        const result = suppressionSchema.parse(
          await call('POST', '/messaging/intents/suppress', body, idempotencyKey),
        )
        if (result.suppressed !== (result.message.status === 'SUPPRESSED'))
          throw new RecoveryMessagingUnavailableError()
        return { suppressed: result.suppressed, receipt: receipt(result.message) }
      } catch {
        throw new RecoveryMessagingUnavailableError()
      }
    },
  }
}
