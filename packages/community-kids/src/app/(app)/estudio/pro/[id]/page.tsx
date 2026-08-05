import { isStudioZappyAllowed } from '@sistemazero/member-shell/server/zappy-access'
import { redirect } from 'next/navigation'
import { KidsLockedStudio } from '@/components/kids/kids-locked-studio'
import { KidsStudioUnavailable } from '@/components/kids/kids-studio-unavailable'
import { StudioProClient } from '@/components/kids/studio-pro-client'
import { checkStudioAccessReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { resolveStudioProAccess } from '@/server/studio-pro-access'

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
 * bloqueado / ok) + **exige a capacidade PRO** (`tier.pro` = Lenda/admin). Sem ela,
 * volta pro `/estudio`. O editor pesado só carrega no cliente (`StudioProClient`).
 */
export default async function EstudioProPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!ID_RE.test(id)) redirect('/estudio')

  const [res, session, gam] = await Promise.all([
    checkStudioAccessReadonly(),
    getSession(),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  if (res.status !== 200 || gam?.status !== 200) return <KidsStudioUnavailable />
  const levelSlug = gam.body?.level?.slug
  const access = resolveStudioProAccess({
    session,
    studioAccess: res.body?.access?.['estudio-completo'] === true,
    levelSlug,
  })
  if (!access.allowed && access.code === 'STUDIO_ACCESS_REQUIRED') return <KidsLockedStudio />
  // A página é protegida pelo proxy, mas mantém o redirect defensivo para URL direta.
  if (!access.allowed) redirect('/estudio')

  return (
    <StudioProClient
      viewerId={session?.id ?? null}
      projectId={id}
      // Mesma política do /estudio: equipe sempre, aluno a partir do degrau
      // mínimo da carreira (Inventor). Aqui o rank já foi buscado p/ o gate Pro.
      zappyEnabled={isStudioZappyAllowed(session, levelSlug)}
    />
  )
}
