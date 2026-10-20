import { kidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { redirect } from 'next/navigation'
import { KidsLockedStudio } from '@/components/kids/kids-locked-studio'
import { KidsStudioUnavailable } from '@/components/kids/kids-studio-unavailable'
import { StudioProClient } from '@/components/kids/studio-pro-client'
import { ToolRouteRecado } from '@/components/kids/tool-route-recado'
import { toolEarnedInJourney, toolOpensAtLevel } from '@/lib/tool-opens-at'
import { checkCreativeToolsAccessReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { resolveStudioProAccess } from '@/server/studio-pro-access'
import { prepareStudioServices } from '@/server/studio-services'

export const dynamic = 'force-dynamic'

// Id de projeto = ULID/charset seguro do Studio (`/^[A-Za-z0-9_-]+$/`). Id fora disso
// nunca é um projeto real → volta pra lista sem tocar o storage.
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

/**
 * Rota ISOLADA do modo Código (projeto PRO / WebContainer) do Estúdio Completo. É a
 * ÚNICA página do app com COOP/COEP + CSP relaxada (WASM) — escopados no `next.config`
 * — para o WebContainer bootar sem afrouxar a segurança do resto do app kids.
 *
 * Gate defensivo (URL direta): mesmo dos 3 estados do `/estudio` (indisponível /
 * bloqueado / ok) + **exige a capacidade PRO** da política persistida. Sem ela,
 * volta pro `/estudio`. O editor pesado só carrega no cliente (`StudioProClient`).
 */
export default async function EstudioProPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ missao?: string | string[] }>
}) {
  const { id } = await params
  const query = await searchParams
  const taskId =
    typeof query?.missao === 'string' && /^[0-9a-f-]{36}$/i.test(query.missao) ? query.missao : null
  if (!ID_RE.test(id)) redirect('/estudio')

  const readServices = prepareStudioServices()
  const [res, session, gam] = await Promise.all([
    checkCreativeToolsAccessReadonly(),
    getSession(),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  // Os recados rolam na própria caixa: a rota trava a altura na janela (ver `ToolRouteRecado`).
  if (res.status !== 200 || gam?.status !== 200) {
    return <ToolRouteRecado screen={KidsStudioUnavailable} />
  }
  const journey = kidsJourneyAccess(gam.body)
  if (!journey) return <ToolRouteRecado screen={KidsStudioUnavailable} />
  const access = resolveStudioProAccess({
    session,
    studioAccess: res.body?.access?.['estudio-completo'] === true,
    journey,
  })
  if (!access.allowed && access.code === 'JOURNEY_UNAVAILABLE')
    return <ToolRouteRecado screen={KidsStudioUnavailable} />
  if (!access.allowed && access.code === 'STUDIO_ACCESS_REQUIRED') {
    const opensAt = toolOpensAtLevel('estudio-completo', journey)
    const earned = toolEarnedInJourney('estudio-completo', journey)
    return <ToolRouteRecado screen={<KidsLockedStudio opensAt={opensAt} earned={earned} />} />
  }
  // A página é protegida pelo proxy, mas mantém o redirect defensivo para URL direta.
  if (!access.allowed) redirect('/estudio')
  const services = await readServices(session, journey)

  return (
    <StudioProClient
      viewerId={session?.id ?? null}
      projectId={id}
      taskId={taskId}
      pintaOwned={res.body?.access?.pinta === true}
      moldaOwned={res.body?.access?.molda === true}
      // A mesma view canônica já lida para Pro fornece a capacidade de IA,
      // separada das ferramentas e do currículo.
      {...services}
    />
  )
}
