import type { ActClaim, ProfileClaim } from './types'

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
  const act: ActClaim = { sub, mode: candidate.mode === 'write' ? 'write' : 'readonly' }
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

/** Só bloqueia mutações quando a sessão de suporte não foi elevada explicitamente. */
export function isReadonlyImpersonation(user: { act?: ActClaim } | null | undefined): boolean {
  return Boolean(user?.act && user.act.mode !== 'write')
}

/**
 * Valida a claim `pfl` (sessão de perfil estilo Netflix) do JWT. PURA/testável.
 * Shape inválido → `undefined` (sessão tratada como da conta — a autorização real
 * é do gateway/auth; a claim é informativa para a UI/proxy).
 */
export function parseProfileClaim(value: unknown): ProfileClaim | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const c = value as Record<string, unknown>
  const accountId = typeof c.accountId === 'string' && c.accountId.length > 0 ? c.accountId : null
  if (!accountId) return undefined
  const pfl: ProfileClaim = { accountId }
  if (typeof c.name === 'string' && c.name.length > 0) pfl.name = c.name
  return pfl
}
