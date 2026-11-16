import { CenariosClient } from '@sistemazero/member-shell/components/creator/cenarios-client'
import { notFound } from 'next/navigation'
import { checkCenariosAccessReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Molda Cenários: a oficina de cenários 3D (mundos, cenários e bibliotecas de modelos).
 *
 * Quem decide se a ferramenta está aberta para esta pessoa é o members (`CENARIOS_MODO`): hoje só
 * a equipe. Para quem ainda não tem, a página não existe (404), sem cartaz de "em breve". Os
 * dados moram na conta (members) e os arquivos no armazenamento; nada fica só no navegador.
 */
export default async function CenariosPage() {
  const [session, acesso] = await Promise.all([
    getSession(),
    checkCenariosAccessReadonly().catch(() => null),
  ])
  if (acesso?.status !== 200 || acesso.body?.aberto !== true) notFound()
  return <CenariosClient key={session?.id ?? 'local'} viewerId={session?.id ?? null} />
}
