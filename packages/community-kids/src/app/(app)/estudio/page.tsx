import { kidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import {
  KidsJourneyLockedStudio,
  KidsStudioWithoutTools,
} from '@/components/kids/kids-journey-locked-studio'
import { KidsLockedStudio } from '@/components/kids/kids-locked-studio'
import { KidsStudioUnavailable } from '@/components/kids/kids-studio-unavailable'
import { StudioFullClient } from '@/components/kids/studio-full-client'
import { ToolRouteRecado } from '@/components/kids/tool-route-recado'
import {
  checkCreativeToolsAccessReadonly,
  getGamificationReadonly,
  getStudioUnlocksReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'
import { studioGate } from '@/server/studio-gate'
import { prepareStudioServices } from '@/server/studio-services'

export const dynamic = 'force-dynamic'

/**
 * Estúdio Completo — produto vendável (igual ao Mural/Clube): quem comprou acessa o
 * editor; quem não, vê o recado gentil. O gate é resolvido no SERVIDOR (sem acesso →
 * o editor pesado nem é carregado). `estudio-completo` = ref do produto (ver
 * `STUDIO_ACCESS_REF` no member-shell). Acesso resolve pela CONTA (o responsável compra).
 *
 * São 3 estados, NÃO 2: o members RESPONDEU (200) e não tem o produto → bloqueio real
 * (`KidsLockedStudio`, "peça a um responsável"); o gateway/token soluçou (status ≠ 200,
 * ex.: 502/401) → "tente de novo" (`KidsStudioUnavailable`), pois mostrar "ainda não
 * liberado" a quem JÁ comprou, num erro transitório, mentiria que ela não tem acesso.
 */
export default async function EstudioPage({
  searchParams,
}: {
  searchParams: Promise<{ missao?: string; projeto?: string }>
}) {
  const { missao, projeto } = await searchParams
  const readServices = prepareStudioServices()
  const [res, session, gam, unlocksRes] = await Promise.all([
    // ⚠️ Pede refs `estudio-completo,pinta,molda` numa ida SÓ: o gate segue sendo o
    // `estudio-completo`; a posse do PINTA liga o "Trazer do Pinta" e a do MOLDA o
    // "Trazer do Molda" no editor (produtos vendidos à parte — cross-app só com posse
    // dos dois lados).
    checkCreativeToolsAccessReadonly(),
    getSession(),
    // Política/earned do perfil → capacidades do editor. `withRanking:true` casa a chave do
    // React.cache com a da (app)/layout (dedup, sem ida extra). Best-effort.
    getGamificationReadonly({ withRanking: true }).catch(() => null),
    // Paleta pelo CURRÍCULO: bônus concluídos + cursos da jornada concluídos e publicados.
    // É a paleta INTEIRA (sem reserva), então falhar aqui é "indisponível", nunca "sem blocos".
    getStudioUnlocksReadonly().catch(() => null),
  ])
  // Os recados rolam na própria caixa: a rota trava a altura na janela (ver `ToolRouteRecado`).
  if (res.status !== 200) return <ToolRouteRecado screen={KidsStudioUnavailable} />
  const hasAccess = res.body?.access?.['estudio-completo'] === true
  if (!hasAccess) return <ToolRouteRecado screen={KidsLockedStudio} />
  const pintaOwned = res.body?.access?.pinta === true
  const moldaOwned = res.body?.access?.molda === true
  // Falha ao consultar o rank não pode virar Faísca: isso esconderia ferramentas de
  // uma criança que já as conquistou. Mantemos o mesmo estado honesto de indisponibilidade.
  if (gam?.status !== 200) return <ToolRouteRecado screen={KidsStudioUnavailable} />
  const journey = kidsJourneyAccess(gam.body)
  if (!journey) return <ToolRouteRecado screen={KidsStudioUnavailable} />
  // A política decide livre/Ponte/Pro; a paleta vem do CURRÍCULO e os cursos
  // conquistados decidem os BLOCOS. O produto pode estar comprado pela conta, mas a criação
  // livre só começa com algum bloco conquistado. Dentro das aulas o Estúdio segue disponível.
  const gate = studioGate(journey, unlocksRes)
  if (gate.kind === 'unavailable') return <ToolRouteRecado screen={KidsStudioUnavailable} />
  if (gate.kind === 'journey-locked') {
    return (
      <ToolRouteRecado
        screen={gate.reason === 'no-blocks' ? KidsStudioWithoutTools : KidsJourneyLockedStudio}
      />
    )
  }
  const { tier } = gate
  const services = await readServices(session, journey)
  // Exemplos prontos (vitrine + "Exemplos clássicos") aparecem SÓ p/ a EQUIPE
  // interna (superadmin/admin/staff), enquanto a usuária valida o catálogo — o
  // cliente segue sem eles. Deriva do PAPEL da conta, não do rank: uma criança
  // que chegou a Lenda (rank `god`) NÃO é equipe e continua sem exemplos.
  const showExamples = isPrivilegedRole(session?.role)
  return (
    <StudioFullClient
      viewerId={session?.id ?? null}
      {...services}
      tier={tier}
      showExamples={showExamples}
      taskId={missao ?? null}
      initialProjectId={projeto ?? null}
      pintaOwned={pintaOwned}
      moldaOwned={moldaOwned}
    />
  )
}
