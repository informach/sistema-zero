/**
 * Ligas/divisões semanais (domínio PURO). Métrica = XP GANHO na semana (derivado do
 * ledger, como as missões — sem coluna acumulada nem hook no award). O tier de cada
 * semana é resolvido LAZY (sem cron) na 1ª leitura/atividade: fecha a semana anterior,
 * calcula a colocação na coorte (mesmo tier+semana+vitrine) e promove/rebaixa 1 nível.
 *
 * Ética/baixa massa: abaixo de `LEAGUE_MIN_PLAYERS` a semana é AMISTOSA (ninguém cai),
 * e a coorte é por PARES (a mesma da coorte do ranking — conta com matrícula na vitrine).
 */

/** Tiers em ordem crescente. Reusa a semana civil SP das missões (`weeklyPeriodKey`). */
export const LEAGUE_TIERS = ['bronze', 'prata', 'ouro', 'platina', 'diamante'] as const
export type LeagueTier = (typeof LEAGUE_TIERS)[number]

export const DEFAULT_LEAGUE_TIER: LeagueTier = 'bronze'

/** Coorte mínima p/ valer promoção/rebaixamento — abaixo disso a semana é amistosa. */
export const LEAGUE_MIN_PLAYERS = 5

export function tierUp(tier: LeagueTier): LeagueTier {
  const i = LEAGUE_TIERS.indexOf(tier)
  return LEAGUE_TIERS[Math.min(LEAGUE_TIERS.length - 1, i + 1)] ?? tier
}
export function tierDown(tier: LeagueTier): LeagueTier {
  const i = LEAGUE_TIERS.indexOf(tier)
  return LEAGUE_TIERS[Math.max(0, i - 1)] ?? tier
}

/** Quantos sobem (topo) numa coorte deste tamanho. 0 se massa insuficiente. */
export function promotionCount(cohortSize: number): number {
  return cohortSize >= LEAGUE_MIN_PLAYERS ? Math.max(1, Math.round(cohortSize * 0.2)) : 0
}
/** Quantos caem (base) numa coorte deste tamanho. 0 se massa insuficiente. */
export function relegationCount(cohortSize: number): number {
  return cohortSize >= LEAGUE_MIN_PLAYERS ? Math.max(1, Math.round(cohortSize * 0.2)) : 0
}

/**
 * Tier resultante ao fechar uma semana: `rank` (1 = 1º) na coorte de `cohortSize`.
 * Topo sobe, base cai (clamp 1 nível), meio fica. Massa insuficiente → mantém.
 */
export function resolveTier(prevTier: LeagueTier, rank: number, cohortSize: number): LeagueTier {
  if (cohortSize < LEAGUE_MIN_PLAYERS) return prevTier
  if (rank <= promotionCount(cohortSize)) return tierUp(prevTier)
  if (rank > cohortSize - relegationCount(cohortSize)) return tierDown(prevTier)
  return prevTier
}

export function isLeagueTier(value: string): value is LeagueTier {
  return (LEAGUE_TIERS as readonly string[]).includes(value)
}
