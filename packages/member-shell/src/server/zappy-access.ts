import 'server-only'
import { CAREER_LEVEL_SLUGS, type CareerLevelSlug } from '@sistemazero/core/career'
import { getEnv } from '../lib/env'
import { careerLevelAtLeast, isPrivilegedRole } from '../lib/studio-tier'

interface ZappyPilotSession {
  id: string
  role: string
  activeProfile?: { accountId: string }
}

interface ZappyPilotPolicy {
  enabled: boolean
  /** Contas liberadas ABAIXO do degrau (escotilha de saída — beta-testers). */
  accountIds: readonly string[]
  /** Degrau da carreira que libera o tutor. Default `hacker` = "Inventor(a)". */
  minLevel: CareerLevelSlug
}

/** "Inventor(a)" — o 3º degrau (Faísca → Construtor → **Inventor**). */
const DEFAULT_MIN_LEVEL: CareerLevelSlug = 'hacker'

function policyFromEnv(): ZappyPilotPolicy {
  const env = getEnv()
  const configured = env.ZAPPY_MIN_LEVEL.trim() as CareerLevelSlug
  return {
    enabled: env.ZAPPY_ENABLED,
    accountIds: env.ZAPPY_PILOT_ACCOUNT_IDS.split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    // Slug fora do catálogo NÃO abre o gate por engano: cai no default.
    minLevel: CAREER_LEVEL_SLUGS.includes(configured) ? configured : DEFAULT_MIN_LEVEL,
  }
}

/**
 * Checagem BARATA, sem o nível: a equipe entra sempre (QA) e, fora dela, tudo
 * depende da flag. Serve para recusar CEDO, antes de gastar uma ida ao members
 * atrás do rank. **Não é autoritativa** — quem decide o aluno é
 * `isStudioZappyAllowed`, que precisa do degrau da carreira.
 */
export function isStudioZappyRolloutOpen(
  session: ZappyPilotSession | null | undefined,
  policy?: ZappyPilotPolicy,
): boolean {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  return (policy ?? policyFromEnv()).enabled
}

/**
 * Política AUTORITATIVA do Zappy, usada pelo BFF e pelas páginas que ofertam o
 * tutor. A equipe entra sempre (QA); o aluno precisa da flag ligada E de estar
 * na allowlist OU ter chegado ao degrau mínimo da carreira (08/2026 — antes era
 * só a allowlist fechada).
 *
 * `levelSlug` ausente/desconhecido reprova o aluno: sem PROVAR o nível não se
 * libera (ver `careerLevelAtLeast`). Passar `undefined` de propósito é o jeito
 * de perguntar "dá para decidir SEM o rank?" — equipe e allowlist respondem
 * antes da carreira, e só quem sobra custa uma ida ao members.
 */
export function isStudioZappyAllowed(
  session: ZappyPilotSession | null | undefined,
  levelSlug: string | null | undefined,
  policy?: ZappyPilotPolicy,
): boolean {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  const effectivePolicy = policy ?? policyFromEnv()
  if (!effectivePolicy.enabled) return false
  const accountId = session.activeProfile?.accountId ?? session.id
  if (effectivePolicy.accountIds.includes(accountId)) return true
  return careerLevelAtLeast(levelSlug, effectivePolicy.minLevel)
}
