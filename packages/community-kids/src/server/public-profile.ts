import 'server-only'
import type { PublicProfileDTO } from '@/lib/types'
import { getPublicProfileIdentity } from './auth'
import { getPublicProfile as getMembersPublicProfile } from './members'

/**
 * Perfil público de OUTRA criança (`/crianca/[profileId]`). Junta a IDENTIDADE do
 * auth (nome + flag de visibilidade) com o DADO DE JOGO do members (xp/ranking/
 * conquistas/avatar/quarto). GATEIA pela flag dos pais: opt-out / inexistente
 * → `null` (a página faz `notFound()`). Falha upstream vira erro real para não
 * mascarar indisponibilidade como perfil inexistente.
 */
export async function getPublicProfile(profileId: string): Promise<PublicProfileDTO | null> {
  const identity = await getPublicProfileIdentity(profileId)
  // Portão vivo: perfil sumido/arquivado, ou os pais NÃO liberaram → não existe p/ o visitante.
  if (identity.status >= 500) throw new Error('Falha ao verificar o perfil público')
  if (identity.status !== 200 || !identity.body?.publicProfileEnabled) return null

  const game = await getMembersPublicProfile(profileId)
  if (game.status >= 500) throw new Error('Falha ao carregar o perfil público')
  if (game.status !== 200 || !game.body) return null

  return { ...game.body, name: identity.body.name }
}
