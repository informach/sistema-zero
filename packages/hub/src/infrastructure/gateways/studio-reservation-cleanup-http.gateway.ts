import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { StudioReservationRetirementSchema } from '@sistemazero/core/studio/publication-reservation'
import type { StudioReservationCleanupGateway } from '../../domain/ports/studio-reservation-cleanup.port'
import type { StudioArtifactHttpGatewayOptions } from './studio-artifact-http.gateway'

const PATH = '/api/studio/reservation-cleanup'
export function createStudioReservationCleanupHttpGateway(
  options: StudioArtifactHttpGatewayOptions,
): StudioReservationCleanupGateway {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => new Date())
  return {
    async cleanupReservation(input) {
      // Capture/validate before the first await. No caller fields may change between retries.
      const parsed = StudioReservationRetirementSchema.safeParse(input)
      if (!parsed.success || !options.hmacSecret) return false
      const payload = parsed.data
      const base = (payload.audience === 'adult' ? options.adultBaseUrl : options.baseUrl)?.replace(
        /\/$/,
        '',
      )
      if (!base) return false
      const body = JSON.stringify(payload)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const timestamp = Math.floor(now().getTime() / 1000)
          const signature = signHmac(
            options.hmacSecret,
            canonicalHmacMessage({
              method: 'POST',
              path: PATH,
              deliveryId: payload.deliveryId,
              body,
            }),
            timestamp,
          )
          const response = await fetchImpl(`${base}${PATH}`, {
            method: 'POST',
            redirect: 'error',
            headers: {
              'content-type': 'application/json',
              'x-signature': `t=${timestamp},v1=${signature}`,
              'x-delivery-id': payload.deliveryId,
            },
            body,
            signal: AbortSignal.timeout(options.timeoutMs ?? 4000),
          })
          await response.body?.cancel()
          if (response.ok) return true
          if (!(response.status === 408 || response.status === 429 || response.status >= 500))
            return false
        } catch (error) {
          options.logger?.warn('studio.reservation_cleanup_failed', {
            reservationId: payload.reservationId,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          })
        }
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 100))
      }
      return false
    },
  }
}
