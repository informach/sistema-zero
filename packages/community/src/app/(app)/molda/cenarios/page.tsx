import { CenariosClient } from '@sistemazero/member-shell/components/creator/cenarios-client'
import { notFound } from 'next/navigation'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Molda Cenários: a oficina de cenários 3D (mundos, cenários e bibliotecas de modelos).
 *
 * Quem decide se a ferramenta está aberta para esta pessoa é o members (`CENARIOS_MODO`): hoje só
 * a equipe. Para quem ainda não tem, a página não existe (404).
 */
export default async function CenariosPage() {
  const [session, acesso] = await Promise.all([
    getSession(),
    shell.members.checkCenariosAccessReadonly().catch(() => null),
  ])
  if (!session || acesso?.status !== 200 || acesso.body?.aberto !== true) notFound()
  return <CenariosClient key={session.id} viewerId={session.id} />
}
