import 'server-only'
import { careerLevelAtLeast } from '@sistemazero/core/career'
import { CREATIVE_APPS_MIN_LEVEL, isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from './clients'

export { CREATIVE_APPS_MIN_LEVEL }

/**
 * Portão de CARREIRA dos apps criativos (Zappy do Estúdio, Pensa, Pinta).
 *
 * A posse do produto continua sendo um portão SEPARADO e anterior — este módulo
 * só responde "o aluno já chegou no degrau?". Os dois se somam: Pensa/Pinta
 * exigem comprar E chegar; o Zappy vive dentro do Estúdio, então a posse já foi
 * cobrada pela página que o hospeda.
 *
 * ⚠️ A barra vive AQUI, num lugar só. Repetir `'hacker'` em cada página é como os
 * três portões divergem depois de um pedido de "muda só no Pensa".
 */

/**
 * Decisão SÍNCRONA, para quem já tem o slug em mãos (Server Components das
 * páginas, que resolvem a gamificação junto do gate de posse).
 *
 * Equipe interna passa sem degrau — mesmo passe-livre que o Estúdio, as moedas e
 * os exemplos já concedem (`isPrivilegedRole`), pelo `role` da CONTA, que
 * sobrevive na sessão de perfil.
 *
 * ⚠️ Recebe o slug JÁ RESOLVIDO de propósito: `false` aqui significa "não chegou
 * no degrau", NUNCA "não consegui saber". Quem chama precisa tratar a
 * indisponibilidade da gamificação ANTES — rebaixar para Faísca quem já conquistou
 * o degrau, por causa de um 502 do gateway, tira a ferramenta de quem tem direito
 * a ela (é a razão registrada em `(app)/estudio/page.tsx`).
 */
export function meetsCreativeAppsLevel(
  levelSlug: string | null | undefined,
  role: string | undefined,
): boolean {
  if (isPrivilegedRole(role)) return true
  return careerLevelAtLeast(levelSlug, CREATIVE_APPS_MIN_LEVEL)
}

/**
 * Variante ASSÍNCRONA para os handlers do BFF, que só têm a sessão (o nível não
 * viaja no token — vem do members). Espelha o `hasStudioAccess` de
 * `routes/studio-zappy.ts`: mesma forma, mesmo custo de uma ida ao members.
 *
 * Falha de rede/gateway → `false` (fail-closed). Aqui isso é o certo, ao
 * contrário das páginas: um handler não tem tela de "tente de novo" para mostrar,
 * e liberar escrita por causa de um soluço seria pior que recusar.
 */
export async function hasCreativeAppsLevel(
  members: MembersClient,
  role: string | undefined,
): Promise<boolean> {
  if (isPrivilegedRole(role)) return true
  try {
    const result = await members.getGamificationReadonly()
    if (result.status !== 200) return false
    return careerLevelAtLeast(result.body?.level?.slug, CREATIVE_APPS_MIN_LEVEL)
  } catch {
    return false
  }
}
