import { isPrivilegedRole, resolveStudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { extensionsForBlocks } from '@sistemazero/member-shell/server/studio-unlocks'
import { isStudioZappyAllowed } from '@sistemazero/member-shell/server/zappy-access'
import { KidsCareerLockedStudio } from '@/components/kids/kids-career-locked-studio'
import { KidsLockedStudio } from '@/components/kids/kids-locked-studio'
import { KidsStudioUnavailable } from '@/components/kids/kids-studio-unavailable'
import { StudioFullClient } from '@/components/kids/studio-full-client'
import {
  checkChallengeAccessReadonly,
  checkPintaAccessReadonly,
  getAiCreditsReadonly,
  getChallengeReadonly,
  getGamificationReadonly,
  getStudioUnlocksReadonly,
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
  // O desafio e o saldo de IA eram `await` CONDICIONAIS depois deste bloco —
  // duas idas em SÉRIE que só começavam depois de tudo aqui, e é a soma disso
  // que a criança vê como tela de carregando. Agora DISPARAM junto com o resto
  // (são leituras memoizadas, sem efeito colateral e sem consumo de crédito),
  // mas ficam FORA do `Promise.all`: quem não tem o produto sai nos gates
  // abaixo sem esperar por duas respostas que nunca vai usar. O `.catch` já
  // está aqui, então largar a promessa pendente não vira rejeição solta.
  const desafioPendente = getChallengeReadonly().catch(() => null)
  const creditosPendentes = getAiCreditsReadonly().catch(() => null)
  const [res, session, challengeAccess, gam, unlocksRes] = await Promise.all([
    // ⚠️ Pede refs `pinta,estudio-completo` numa ida SÓ: o gate segue sendo o
    // `estudio-completo`; a posse do PINTA liga o "Trazer do Pinta" no editor
    // (produtos vendidos à parte — cross-app só com posse dos dois lados).
    checkPintaAccessReadonly(),
    getSession(),
    checkChallengeAccessReadonly().catch(() => null),
    // Rank do aluno → modos+perfil do editor. `withRanking:true` casa a chave do
    // React.cache com a da (app)/layout (dedup, sem ida extra). Best-effort.
    getGamificationReadonly({ withRanking: true }).catch(() => null),
    // Paleta pelo CURRÍCULO: bônus concluídos + cursos da carreira concluídos e publicados.
    // Best-effort — falhar aqui NÃO pode esvaziar a caixa de ferramentas: o
    // `resolveStudioTier` cai no perfil do NÍVEL quando a lista vem vazia.
    getStudioUnlocksReadonly().catch(() => null),
  ])
  if (res.status !== 200) return <KidsStudioUnavailable />
  const hasAccess = res.body?.access?.['estudio-completo'] === true
  if (!hasAccess) return <KidsLockedStudio />
  const pintaOwned = res.body?.access?.pinta === true
  // Falha ao consultar o rank não pode virar Faísca: isso esconderia ferramentas de
  // uma criança que já as conquistou. Mantemos o mesmo estado honesto de indisponibilidade.
  if (gam?.status !== 200) return <KidsStudioUnavailable />
  const levelSlug = gam.body?.level?.slug ?? 'noob'
  // A paleta vem do CURRÍCULO (08/2026): o nível decide o MODO (livre/Ponte/Pro) e os
  // cursos conquistados decidem os BLOCOS. As extensões saem dos próprios blocos.
  const unlockedBlocks = unlocksRes?.status === 200 ? (unlocksRes.body?.blocks ?? []) : []
  const tier = resolveStudioTier(levelSlug, session?.role, {
    blocks: unlockedBlocks,
    extensions: extensionsForBlocks(unlockedBlocks),
  })
  // O produto pode estar comprado pela conta, mas a criação livre só começa após
  // concluir+publicar o primeiro curso. Dentro das aulas, o Estúdio segue disponível.
  if (!tier.freeStudio) return <KidsCareerLockedStudio />
  const challengeEligible =
    challengeAccess?.status === 200 &&
    challengeAccess.body?.access?.['clube-dos-criadores'] === true &&
    challengeAccess.body?.access?.['estudio-completo'] === true
  // A posse é que decide se o Desafio aparece, então só ESPERA quem vai usar: a
  // leitura já está a caminho desde o topo, e `await` numa promessa que não
  // interessa é a mesma espera à toa que os gates acima evitam.
  const challengeRes = challengeEligible ? await desafioPendente : null
  const challenge =
    challengeRes?.status === 200 && challengeRes.body
      ? { key: challengeRes.body.challenge.key, title: challengeRes.body.challenge.title }
      : null
  // Exemplos prontos (vitrine + "Exemplos clássicos") aparecem SÓ p/ a EQUIPE
  // interna (superadmin/admin/staff), enquanto a usuária valida o catálogo — o
  // cliente segue sem eles. Deriva do PAPEL da conta, não do rank: uma criança
  // que chegou a Lenda (rank `god`) NÃO é equipe e continua sem exemplos.
  const showExamples = isPrivilegedRole(session?.role)
  // Saldo da ajuda de IA (medidor do Zappy) — mesma régua do Desafio acima: a
  // leitura já está a caminho, mas quem não tem o tutor não espera por ela.
  // Falhou → `null` = "não sei" e o medidor some, nunca "0 restantes".
  const zappyEnabled = isStudioZappyAllowed(session, levelSlug)
  const creditsRes = zappyEnabled ? await creditosPendentes : null
  return (
    <StudioFullClient
      viewerId={session?.id ?? null}
      challenge={challenge}
      tier={tier}
      showExamples={showExamples}
      // O tutor abre por MÉRITO: equipe sempre, aluno a partir do degrau mínimo
      // da carreira (Inventor). O rank já veio na gamificação acima.
      zappyEnabled={zappyEnabled}
      aiCredits={creditsRes?.status === 200 ? (creditsRes.body ?? null) : null}
      taskId={tarefa ?? null}
      pintaOwned={pintaOwned}
    />
  )
}
