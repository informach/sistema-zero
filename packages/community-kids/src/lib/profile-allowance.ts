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

/**
 * Quantos perfis a assinatura da Comunidade dos Criadores libera (o `maxProfiles: 2` das duas
 * ofertas do catálogo, `packages/catalog/scripts/seed.ts`; `tests/profile-allowance.test.ts` lê
 * o seed para os dois números não se separarem). O teto da conta é o MAIOR entre as matrículas,
 * nunca a soma: assinar de novo não abre vaga para quem já tem esse teto.
 */
export const COMUNIDADE_MAX_PROFILES = 2

/** A Comunidade só resolve o limite de quem tem MENOS perfis do que ela libera. */
export function comunidadeRaisesLimit(maxProfiles: number): boolean {
  return maxProfiles < COMUNIDADE_MAX_PROFILES
}

export function canAddProfile(allowance: ProfileAllowance, profilesCount: number): boolean {
  if (allowance.kind === 'unlimited') return true
  return allowance.kind === 'limited' && profilesCount < allowance.maxProfiles
}
