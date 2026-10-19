import 'server-only'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { type GatewayResponse, gatewayFetch } from './gateway'

const base = '/members/admin/journey/kids'

const invalidPreparation = (): Promise<GatewayResponse> =>
  Promise.resolve({
    status: 400,
    body: { error: { code: 'INVALID_INPUT', message: 'Preparação da jornada inválida.' } },
  })

function preparationPath(id: string): string | null {
  const parsed = IdentityUuidSchema.safeParse(id)
  return parsed.success ? `${base}/preparations/${parsed.data}` : null
}

/** The gateway owns session/RBAC; Members derives the actor and validates the complete draft. */
export function getKidsJourneyPolicy() {
  return gatewayFetch(base)
}

export function getKidsJourneyHistory(query: URLSearchParams) {
  return gatewayFetch(`${base}/history`, {
    query: {
      beforeVersion: query.get('beforeVersion'),
      limit: query.get('limit'),
    },
  })
}

export function previewKidsJourney(body: unknown) {
  return gatewayFetch(`${base}/preview`, { method: 'POST', body })
}

export function prepareKidsJourney(body: unknown) {
  return gatewayFetch(`${base}/preparations`, { method: 'POST', body })
}

export function getKidsJourneyPreparation(id: string) {
  const path = preparationPath(id)
  return path ? gatewayFetch(path) : invalidPreparation()
}

export function advanceKidsJourneyPreparation(id: string) {
  const path = preparationPath(id)
  return path ? gatewayFetch(`${path}/advance`, { method: 'POST' }) : invalidPreparation()
}

export function publishKidsJourneyPreparation(id: string, body: unknown) {
  const path = preparationPath(id)
  return path ? gatewayFetch(`${path}/publish`, { method: 'POST', body }) : invalidPreparation()
}
