import { KidsLockedStudio } from '@/components/kids/kids-locked-studio'
import { KidsStudioUnavailable } from '@/components/kids/kids-studio-unavailable'
import { StudioFullClient } from '@/components/kids/studio-full-client'
import { checkStudioAccessReadonly } from '@/server/members'
import { getSession } from '@/server/session'

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
export default async function EstudioPage() {
  // `session.id` = o PERFIL ativo (kids) → isola os projetos do Estúdio por criança no
  // IndexedDB (irmãos no mesmo navegador não compartilham a lista). Resolve junto do gate.
  const [res, session] = await Promise.all([checkStudioAccessReadonly(), getSession()])
  if (res.status !== 200) return <KidsStudioUnavailable />
  const hasAccess = res.body?.access?.['estudio-completo'] === true
  return hasAccess ? <StudioFullClient viewerId={session?.id ?? null} /> : <KidsLockedStudio />
}
