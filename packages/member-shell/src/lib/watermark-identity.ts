import type { SessionUser } from './types'

/**
 * O que a marca d'água estampa e por quem o cache de PDFs marcados se separa.
 * ⚠️ O token do ALUNO do Kids não carrega mais o e-mail do responsável: estampar esse
 * e-mail num material que fica com a criança expunha a família. O aluno é identificado
 * como na marca do vídeo da aula (`Perfil <8 primeiros caracteres do id>`), o que basta
 * para o suporte rastrear uma cópia. A chave do cache ganha um sufixo próprio para que a
 * cópia antiga (marcada com o e-mail) não volte a ser servida.
 */
export function watermarkIdentity(user: Pick<SessionUser, 'id' | 'email' | 'kids'>): {
  label: string
  cacheUser: string
} {
  if (user.kids?.kind === 'student' || !user.email)
    return { label: `Perfil ${user.id.slice(0, 8)}`, cacheUser: `${user.id}-perfil` }
  return { label: user.email, cacheUser: user.id }
}
