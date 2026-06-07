import type { ActClaim } from './types'

/**
 * Valida a claim `act` (impersonação) vinda do JWT. PURA e testável (a
 * `session.ts` é server-only). Shape inválido → `undefined` (sessão tratada
 * como normal — a claim é informativa; a autorização real é do gateway/auth).
 */
export function parseActClaim(value: unknown): ActClaim | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Record<string, unknown>
  const sub = typeof candidate.sub === 'string' && candidate.sub.length > 0 ? candidate.sub : null
  if (!sub) return undefined
  const act: ActClaim = { sub }
  if (typeof candidate.email === 'string' && candidate.email.length > 0) {
    act.email = candidate.email
  }
  if (typeof candidate.name === 'string' && candidate.name.length > 0) act.name = candidate.name
  return act
}

/** Nome exibível do ATOR no banner de impersonação (nome → e-mail → genérico). */
export function actorLabel(act: ActClaim): string {
  return act.name ?? act.email ?? 'um administrador'
}
