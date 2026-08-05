import { isPrivilegedRole, resolveStudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { isStudioZappyAllowed } from '@sistemazero/member-shell/server/zappy-access'
import { KidsCareerLockedStudio } from '@/components/kids/kids-career-locked-studio'
import { KidsLockedStudio } from '@/components/kids/kids-locked-studio'
import { KidsStudioUnavailable } from '@/components/kids/kids-studio-unavailable'
import { StudioFullClient } from '@/components/kids/studio-full-client'
import {
  checkChallengeAccessReadonly,
  checkPintaAccessReadonly,
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
export default async function EstudioPage({
  searchParams,
}: {
  searchParams: Promise<{ tarefa?: string }>
}) {
  const { tarefa } = await searchParams
  // `session.id` = o PERFIL ativo (kids) → isola os projetos do Estúdio por criança no
  // IndexedDB (irmãos no mesmo navegador não compartilham a lista). Resolve junto do gate.
  // A posse do DESAFIO (Clube+Estúdio, best-effort) liga o checkbox do Compartilhar.
  const [res, session, challengeAccess, gam] = await Promise.all([
    // ⚠️ Pede refs `pinta,estudio-completo` numa ida SÓ: o gate segue sendo o
    // `estudio-completo`; a posse do PINTA liga o "Trazer do Pinta" no editor
    // (produtos vendidos à parte — cross-app só com posse dos dois lados).
    checkPintaAccessReadonly(),
    getSession(),
    checkChallengeAccessReadonly().catch(() => null),
    // Rank do aluno → modos+perfil do editor. `withRanking:true` casa a chave do
    // React.cache com a da (app)/layout (dedup, sem ida extra). Best-effort.
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  if (res.status !== 200) return <KidsStudioUnavailable />
  const hasAccess = res.body?.access?.['estudio-completo'] === true
  if (!hasAccess) return <KidsLockedStudio />
  const pintaOwned = res.body?.access?.pinta === true
  // Falha ao consultar o rank não pode virar Faísca: isso esconderia ferramentas de
  // uma criança que já as conquistou. Mantemos o mesmo estado honesto de indisponibilidade.
  if (gam?.status !== 200) return <KidsStudioUnavailable />
  const levelSlug = gam.body?.level?.slug ?? 'noob'
  const tier = resolveStudioTier(levelSlug, session?.role)
  // O produto pode estar comprado pela conta, mas a criação livre só começa após
  // concluir+publicar o primeiro curso. Dentro das aulas, o Estúdio segue disponível.
  if (!tier.freeStudio) return <KidsCareerLockedStudio />
  const challengeEligible =
    challengeAccess?.status === 200 &&
    challengeAccess.body?.access?.['clube-dos-criadores'] === true &&
    challengeAccess.body?.access?.['estudio-completo'] === true
  const challengeRes = challengeEligible ? await getChallengeReadonly().catch(() => null) : null
  const challenge =
    challengeRes?.status === 200 && challengeRes.body
      ? { key: challengeRes.body.challenge.key, title: challengeRes.body.challenge.title }
      : null
  // Exemplos prontos (vitrine + "Exemplos clássicos") aparecem SÓ p/ a EQUIPE
  // interna (superadmin/admin/staff), enquanto a usuária valida o catálogo — o
  // cliente segue sem eles. Deriva do PAPEL da conta, não do rank: uma criança
  // que chegou a Lenda (rank `god`) NÃO é equipe e continua sem exemplos.
  const showExamples = isPrivilegedRole(session?.role)
  return (
    <StudioFullClient
      viewerId={session?.id ?? null}
      challenge={challenge}
      tier={tier}
      showExamples={showExamples}
      // O tutor abre por MÉRITO: equipe sempre, aluno a partir do degrau mínimo
      // da carreira (Inventor). O rank já veio na gamificação acima.
      zappyEnabled={isStudioZappyAllowed(session, levelSlug)}
      taskId={tarefa ?? null}
      pintaOwned={pintaOwned}
    />
  )
}
