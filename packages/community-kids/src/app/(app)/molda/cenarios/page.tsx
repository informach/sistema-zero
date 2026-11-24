import { CenariosClient } from '@sistemazero/member-shell/components/creator/cenarios-client'
import { cenariosBasicToolAccess } from '@sistemazero/member-shell/lib/cenarios-tool-access'
import { kidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { notFound } from 'next/navigation'
import { cenariosToolAccessFor } from '@/lib/molda-tool-access'
import { checkCenariosAccessReadonly, getGamificationReadonly } from '@/server/members'
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
  const [session, acesso, gam] = await Promise.all([
    getSession(),
    checkCenariosAccessReadonly().catch(() => null),
    getGamificationReadonly().catch(() => null),
  ])
  if (acesso?.status !== 200 || acesso.body?.aberto !== true) notFound()
  // As faixas de ferramentas seguem o posto, como no Molda; a equipe recebe a prévia com todas.
  // Sem a jornada, a tela mostra só o básico: o Members confere a faixa no lote de qualquer jeito.
  const journey = gam?.status === 200 ? kidsJourneyAccess(gam.body) : null
  const ferramentas = journey ? cenariosToolAccessFor({ journey }) : cenariosBasicToolAccess()
  return (
    <CenariosClient
      key={session?.id ?? 'local'}
      viewerId={session?.id ?? null}
      {...(ferramentas ? { ferramentas } : {})}
    />
  )
}
