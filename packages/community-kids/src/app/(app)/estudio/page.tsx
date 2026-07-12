import { resolveStudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { KidsLockedStudio } from '@/components/kids/kids-locked-studio'
import { KidsStudioUnavailable } from '@/components/kids/kids-studio-unavailable'
import { StudioFullClient } from '@/components/kids/studio-full-client'
import {
  checkChallengeAccessReadonly,
  checkStudioAccessReadonly,
  getChallengeReadonly,
  getGamificationReadonly,
} from '@/server/members'
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
  // A posse do DESAFIO (Clube+Estúdio, best-effort) liga o checkbox do Compartilhar.
  const [res, session, challengeAccess, gam] = await Promise.all([
    checkStudioAccessReadonly(),
    getSession(),
    checkChallengeAccessReadonly().catch(() => null),
    // Rank do aluno → modos+perfil do editor. `withRanking:true` casa a chave do
    // React.cache com a da (app)/layout (dedup, sem ida extra). Best-effort.
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  if (res.status !== 200) return <KidsStudioUnavailable />
  const hasAccess = res.body?.access?.['estudio-completo'] === true
  if (!hasAccess) return <KidsLockedStudio />
  // Modos (Blocos/Ponte) + perfil (iniciante/intermediário/avançado) pelo RANK;
  // admin/staff = Lenda. Soluço/ausência → noob (degrada seguro). Código adiado.
  const levelSlug = gam?.status === 200 ? (gam.body?.level?.slug ?? 'noob') : 'noob'
  const tier = resolveStudioTier(levelSlug, session?.role)
  const challengeEligible =
    challengeAccess?.status === 200 &&
    challengeAccess.body?.access?.['clube-dos-criadores'] === true &&
    challengeAccess.body?.access?.['estudio-completo'] === true
  const challengeRes = challengeEligible ? await getChallengeReadonly().catch(() => null) : null
  const challenge =
    challengeRes?.status === 200 && challengeRes.body
      ? { key: challengeRes.body.challenge.key, title: challengeRes.body.challenge.title }
      : null
  return <StudioFullClient viewerId={session?.id ?? null} challenge={challenge} tier={tier} />
}
