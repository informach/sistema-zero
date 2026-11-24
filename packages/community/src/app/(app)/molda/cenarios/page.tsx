import { CenariosClient } from '@sistemazero/member-shell/components/creator/cenarios-client'
import {
  adultCenariosToolAccess,
  cenariosBasicToolAccess,
} from '@sistemazero/member-shell/lib/cenarios-tool-access'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { notFound } from 'next/navigation'
import { getCreativeToolsState } from '@/server/creative-tools'
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
  const [session, acesso, state] = await Promise.all([
    getSession(),
    shell.members.checkCenariosAccessReadonly().catch(() => null),
    getCreativeToolsState(),
  ])
  if (!session || acesso?.status !== 200 || acesso.body?.aberto !== true) notFound()
  // As faixas de ferramentas seguem a jornada adulta, como no Molda; a equipe tem todas (numa
  // sessão de suporte o papel é o da pessoa, então vale a jornada dela).
  const ferramentas = isPrivilegedRole(session.role)
    ? undefined
    : state.kind === 'ready'
      ? adultCenariosToolAccess(state.journey)
      : cenariosBasicToolAccess()
  return (
    <CenariosClient
      key={session.id}
      viewerId={session.id}
      {...(ferramentas ? { ferramentas } : {})}
    />
  )
}
