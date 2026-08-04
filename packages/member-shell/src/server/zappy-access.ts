import 'server-only'
import { getEnv } from '../lib/env'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from './clients'
import { hasCreativeAppsLevel, meetsCreativeAppsLevel } from './creative-apps-access'

interface ZappySession {
  role: string
}

interface ZappyPolicy {
  enabled: boolean
}

function policyFromEnv(): ZappyPolicy {
  return { enabled: getEnv().ZAPPY_ENABLED }
}

/**
 * Mesma política autoritativa usada pelo BFF e pelas páginas que ofertam o tutor.
 *
 * Regra (08/2026): equipe interna sempre; senão, `ZAPPY_ENABLED` ligado **e**
 * carreira em Inventor(a) ou acima. Substituiu o piloto fechado por allowlist de
 * contas (`ZAPPY_PILOT_ACCOUNT_IDS`, removida): a allowlist não escala e mantinha
 * o Zappy invisível em produção, que era o sintoma relatado.
 *
 * `ZAPPY_ENABLED` sobrevive como INTERRUPTOR DE EMERGÊNCIA, agora ligado por
 * padrão — o tutor gasta cota de IA por interação, então poder desligar sem
 * deploy tem valor real. A equipe passa ANTES dele de propósito: com o Zappy
 * derrubado, ainda é preciso conseguir reproduzir o problema.
 *
 * A posse do Estúdio NÃO é checada aqui — o tutor só existe DENTRO do Estúdio, e
 * a página/handler que o hospeda já cobra o produto (`hasStudioAccess`). Duplicar
 * seria um 2º portão para a mesma coisa.
 *
 * ⚠️ `levelSlug` chega JÁ RESOLVIDO: `false` significa "não chegou no degrau",
 * nunca "não deu para saber" — quem chama trata a indisponibilidade da
 * gamificação antes (ver `meetsCreativeAppsLevel`).
 */
export function isStudioZappyAllowed(
  session: ZappySession | null | undefined,
  levelSlug: string | null | undefined,
  policy?: ZappyPolicy,
): boolean {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  if (!(policy ?? policyFromEnv()).enabled) return false
  return meetsCreativeAppsLevel(levelSlug, session.role)
}

/**
 * A MESMA regra para os handlers do BFF, que só têm a sessão — o nível não viaja
 * no token, vem do members. Existe para a rota não reimplementar a política (é
 * assim que o portão da UI e o do servidor divergem depois).
 *
 * A ordem economiza uma ida ao members: equipe e interruptor decidem primeiro; o
 * nível só é consultado quando é ele que falta resolver.
 */
export async function isStudioZappyAllowedForRequest(
  members: MembersClient,
  session: ZappySession | null | undefined,
  policy?: ZappyPolicy,
): Promise<boolean> {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  if (!(policy ?? policyFromEnv()).enabled) return false
  return hasCreativeAppsLevel(members, session.role)
}
