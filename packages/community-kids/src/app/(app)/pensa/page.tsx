import { creativeToolAvailability } from '@sistemazero/core/career'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { meetsAiAppsLevel } from '@sistemazero/member-shell/server/creative-apps-access'
import { KidsCareerLockedPensa } from '@/components/kids/kids-career-locked-pensa'
import { KidsLockedPensa } from '@/components/kids/kids-locked-pensa'
import { KidsPensaUnavailable } from '@/components/kids/kids-pensa-unavailable'
import { PensaClient } from '@/components/kids/pensa-client'
import { ToolRouteRecado } from '@/components/kids/tool-route-recado'
import { canOpenPensaStudioTask } from '@/lib/pensa-capabilities'
import {
  checkCreativeToolsAccessReadonly,
  checkPensaAccessReadonly,
  getGamificationReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Pensa — produto vendável (igual ao Estúdio Completo): quem tem o produto planeja
 * seus jogos aqui; quem não, vê o recado gentil. O gate é resolvido no SERVIDOR
 * (sem acesso → o app nem é carregado). `pensa` = ref do produto (ver
 * `PENSA_ACCESS_REF` no member-shell). Acesso resolve pela CONTA (o responsável compra).
 *
 * São 4 estados: indisponível, sem o produto, produto comprado mas carreira abaixo
 * de Inventor(a), e acesso completo. O gate também é reaplicado no BFF.
 */
export default async function PensaPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>
}) {
  const { plano } = await searchParams
  // `session.id` = o PERFIL ativo (kids) → o Modo Missão semeia/abre o projeto do
  // Estúdio no MESMO namespace do IndexedDB que o /estudio usa (fase R do Pensa).
  // A posse do PINTA (produto à parte) só liga o "Desenhar no Pinta" das missões:
  // best-effort — soluço na checagem degrada escondendo o botão, nunca trava a página.
  const [res, toolsRes, gam, session] = await Promise.all([
    checkPensaAccessReadonly(),
    checkCreativeToolsAccessReadonly().catch(() => null),
    getGamificationReadonly().catch(() => null),
    getSession(),
  ])
  // Os recados rolam na própria caixa: a rota trava a altura na janela (ver `ToolRouteRecado`).
  if (res.status !== 200) return <ToolRouteRecado screen={KidsPensaUnavailable} />
  const hasAccess = res.body?.access?.pensa === true
  if (!hasAccess) return <ToolRouteRecado screen={KidsLockedPensa} />
  if (gam?.status !== 200) return <ToolRouteRecado screen={KidsPensaUnavailable} />
  if (!meetsAiAppsLevel(gam.body?.level?.slug, session?.role)) {
    return <ToolRouteRecado screen={KidsCareerLockedPensa} />
  }
  const pintaOwned = toolsRes?.status === 200 && toolsRes.body?.access?.pinta === true
  const studioAvailable = canOpenPensaStudioTask({
    studioProductOwned:
      toolsRes?.status === 200 && toolsRes.body?.access?.['estudio-completo'] === true,
    levelSlug: gam?.status === 200 ? gam.body?.level?.slug : undefined,
    role: session?.role,
  })
  return (
    <PensaClient
      pintaOwned={pintaOwned}
      studioAvailable={studioAvailable}
      moldaAvailable={
        creativeToolAvailability({
          tool: 'molda',
          owned: toolsRes?.body?.access?.molda === true,
          level: gam.body?.level?.slug ?? null,
          privileged: isPrivilegedRole(session?.role),
        }) === 'available'
      }
      initialProjectId={plano ?? null}
    />
  )
}
