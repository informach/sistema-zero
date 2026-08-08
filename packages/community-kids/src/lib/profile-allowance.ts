/** Mesmo sentinela devolvido pelo members e aplicado pelo auth para a equipe interna. */
const UNLIMITED_PROFILES = Number.MAX_SAFE_INTEGER

/**
 * Estado confirmado do direito de criar perfis. `unavailable` é falha de leitura,
 * não uma vaga otimista: a API do auth continua sendo a trava final, mas a tela só
 * oferece uma ação quando o members confirmou que ela existe.
 */
export type ProfileAllowance =
  | { kind: 'limited'; maxProfiles: number }
  | { kind: 'unlimited' }
  | { kind: 'none' }
  | { kind: 'unavailable' }

export function resolveProfileAllowance({
  status,
  maxProfiles,
}: {
  status: number
  maxProfiles: number | null | undefined
}): ProfileAllowance {
  if (status !== 200 || maxProfiles == null) return { kind: 'unavailable' }
  if (!Number.isSafeInteger(maxProfiles) || maxProfiles < 0) return { kind: 'unavailable' }
  if (maxProfiles === 0) return { kind: 'none' }
  if (maxProfiles === UNLIMITED_PROFILES) return { kind: 'unlimited' }
  return { kind: 'limited', maxProfiles }
}

export function canAddProfile(allowance: ProfileAllowance, profilesCount: number): boolean {
  if (allowance.kind === 'unlimited') return true
  return allowance.kind === 'limited' && profilesCount < allowance.maxProfiles
}
