import { courseJourneyState, creativeToolAvailability } from '@sistemazero/core/career'
import { ArrowRight, BookOpen, Map as MapIcon, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { ChallengeCard } from '@/components/kids/challenge-card'
import { ChildGuide } from '@/components/kids/child-guide'
import {
  ContinueHero,
  hasAnyCourseActivity,
  pickContinueCourse,
} from '@/components/kids/continue-hero'
import { CourseCard } from '@/components/kids/course-card'
import { CreatorCareerCard } from '@/components/kids/creator-career-card'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
import { KidsMascot } from '@/components/kids/mascot'
import { MissionsPanel } from '@/components/kids/missions-panel'
import { nextLevelHintWithin } from '@/lib/career-horizon'
import {
  checkChallengeAccessReadonly,
  getAvatarReadonly,
  getChallengeReadonly,
  getGamificationReadonly,
  getMissionsReadonly,
  listCatalog,
  listMyCourses,
} from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getSession()
  // Numa sessão de PERFIL a saudação é para a CRIANÇA (nome do perfil ativo); o
  // token carrega o nome da CONTA, então o perfil tem prioridade.
  const greetName = user?.activeProfile?.name ?? user?.firstName
  // Gamificação + missões são best-effort (401/gateway fora → seções somem). A
  // gamificação pede `withRanking: true` p/ casar a chave do React.cache com a do
  // layout (clients.ts memoiza por esse booleano) — uma ÚNICA ida ao gateway por
  // render nesta rota, a mais acessada. Missões antes vinham de um fetch client
  // pós-hidratação (waterfall); agora entram no Promise.all do servidor.
  const [{ status, body }, gam, missions, avatarRes, showcaseRes, challengeAccess, catalogRes] =
    await Promise.all([
      listMyCourses(),
      getGamificationReadonly({ withRanking: true }),
      getMissionsReadonly(),
      // Foto do avatar p/ a aura da Carreira de Criador (React.cache deduplica
      // com a busca do layout — segue 1 ida ao gateway por render).
      getAvatarReadonly(),
      // "Seus jogos já foram jogados N vezes" (Mural) — best-effort, linha some no erro.
      shell.hub.myShowcaseStatsReadonly().catch(() => null),
      // Desafio do mês: card SÓ com posse de Clube+Estúdio (produtos à parte).
      checkChallengeAccessReadonly().catch(() => null),
      // Catálogo: limita a frase do próximo marco ao que EXISTE (horizonte do catálogo),
      // p/ a home nunca prometer um número diferente do mapa. Best-effort — `null` = a
      // busca falhou e a frase volta a ser a crua do members.
      listCatalog().catch(() => null),
    ])
  if (status !== 200) throw new Error('Falha ao carregar os cursos')
  const courses = body?.courses ?? []
  // Home = superfície de AÇÃO: só cursos LIBERADOS pela carreira (os travados —
  // futuro/recompensa — vivem no Mapa da Carreira em /cursos). Ordenação
  // ação-primeiro: em andamento → não começados → concluídos (revisão) por último.
  const courseRank = (c: (typeof courses)[number]) => {
    const order = {
      publish: 0,
      continue: 1,
      start: 2,
      review: 3,
      'content-unavailable': 4,
      locked: 5,
    }
    return order[courseJourneyState(c)]
  }
  const unlocked = courses
    .filter((c) => c.careerLock?.locked !== true)
    .sort((a, b) => courseRank(a) - courseRank(b))
  const gamification = gam.status === 200 ? (gam.body ?? null) : null
  const missionsData = missions.status === 200 ? (missions.body ?? null) : null
  // `null` = catálogo DESCONHECIDO (≠ vazio): a frase cai na contagem crua do members.
  const catalogCourses = catalogRes?.status === 200 ? (catalogRes.body?.courses ?? []) : null
  const levelHint = nextLevelHintWithin(gamification?.level, catalogCourses)
  // Avatar é tri-state para o guia: presente, ausente ou desconhecido. Um erro do
  // members não pode virar "você ainda não criou", pois isso induziria uma ação
  // baseada em informação falsa. Outras superfícies seguem degradando a foto para null.
  const avatarState = avatarRes.status === 200 ? (avatarRes.body ?? null) : null
  const avatarPhotoUrl = avatarState?.photoUrl ?? null
  const showcaseStats = showcaseRes?.status === 200 ? (showcaseRes.body ?? null) : null
  const challengeEligible =
    creativeToolAvailability({
      tool: 'estudio-completo',
      owned: true,
      level: gamification?.level?.slug ?? null,
    }) === 'available' &&
    challengeAccess?.status === 200 &&
    challengeAccess.body?.access?.['clube-dos-criadores'] === true &&
    challengeAccess.body?.access?.['estudio-completo'] === true
  const hasCourseActivity = hasAnyCourseActivity(courses)
  const startAvailable = pickContinueCourse(courses) !== null
  const childGuideEnabled = Boolean(user?.activeProfile && user.id)
  // Tema do mês só é buscado quando o card vai aparecer (best-effort).
  const challengeRes = challengeEligible ? await getChallengeReadonly().catch(() => null) : null
  const challengeData = challengeRes?.status === 200 ? (challengeRes.body ?? null) : null

  // A saudação das telas-modelo (11/09/2026): o Zappy num ladrilho amarelo, o "Olá" em
  // Baloo e a frase. Com o guia ligado, o "Como funciona?" fica à direita dela.
  const saudacao = (
    <div className="flex items-center gap-4 md:gap-5">
      <span
        aria-hidden="true"
        className="grid size-16 shrink-0 place-items-center rounded-[1.25rem] bg-(--sz-kids-amarelo) md:size-[4.5rem] md:rounded-[1.375rem]"
      >
        <KidsMascot
          expression={courses.length === 0 ? 'thinking' : 'happy'}
          className="size-12 md:size-14"
        />
      </span>
      <div className="min-w-0">
        <h1 className="sz-display text-[clamp(2rem,3.4vw,2.8125rem)]">
          Olá{greetName ? `, ${greetName}` : ''}!
        </h1>
        <p className="mt-1.5 font-medium text-[1.0625rem] text-muted-foreground">
          Vamos dar o próximo passo na sua criação?
        </p>
      </div>
    </div>
  )

  return (
    <>
      {/* Re-sincroniza ranking/nível/foguinho ao voltar pra tela (sem deslogar). */}
      <FocusRefresh />
      <KidsBand tone="creme">
        {/* Tutorial guiado da CRIANÇA (fase 2): boas-vindas 1×, convite ao avatar e o
          aponte do "Começar" logo abaixo — tudo derivado do estado que a página já
          buscou (zero fetch novo). A home roda sempre em sessão de perfil (o proxy
          manda conta sem `pfl` p/ /perfis), então `user.id` é o PERFIL. */}
        {childGuideEnabled && user?.id ? (
          <ChildGuide
            profileKey={user.id}
            childName={greetName ?? null}
            hasAvatar={avatarState === null ? null : avatarPhotoUrl !== null}
            hasCourseActivity={hasCourseActivity}
            startAvailable={startAvailable}
            header={saudacao}
          >
            <ContinueHero courses={courses} />
          </ChildGuide>
        ) : (
          <>
            <div className="mb-6 md:mb-7">{saudacao}</div>
            <ContinueHero courses={courses} />
          </>
        )}

        {/* Gamificação fora → os cards mostram placeholder gentil (não somem em silêncio). */}
        {!startAvailable && courses.length > 0 ? (
          <section className="kids-carta mt-6 p-6 md:p-7">
            <h2 className="sz-display text-xl md:text-[1.625rem]">Espaço para sua próxima ideia</h2>
            <p className="mt-2 font-medium text-[0.9375rem] text-muted-foreground">
              Explore as ferramentas liberadas na sua oficina ou revisite um projeto dos cursos.
            </p>
            <Link href="/criar" prefetch={false} className="sz-btn-gradient mt-4 px-6">
              Abrir minha oficina
            </Link>
          </section>
        ) : null}
      </KidsBand>

      {courses.length > 0 ? (
        <KidsBand tone="menta">
          <CreatorCareerCard
            gamification={gamification}
            levelHint={levelHint}
            avatarPhotoUrl={avatarPhotoUrl}
            name={greetName ?? null}
            showcaseStats={showcaseStats}
          />
        </KidsBand>
      ) : null}

      {/* Desafio do mês (game jam, só com posse de Clube+Estúdio) e missões. A faixa
          só existe quando há o que pôr dentro dela: faixa vazia é uma tarja de cor
          sem conteúdo, que fica pior do que não ter faixa nenhuma. */}
      {challengeData || courses.length > 0 ? (
        <KidsBand tone="ceu">
          {challengeData ? <ChallengeCard data={challengeData} /> : null}
          {courses.length > 0 ? (
            <MissionsPanel initial={missionsData} className={challengeData ? 'mt-8' : undefined} />
          ) : null}
        </KidsBand>
      ) : null}

      <KidsBand tone="lilas">
        <section aria-labelledby="meus-cursos">
          <KidsSectionHeader
            id="meus-cursos"
            title="Meus cursos"
            actions={
              <Link
                href="/cursos"
                prefetch={false}
                className="sz-btn-gradient sz-btn-inverso h-10 gap-1.5 px-5 text-sm"
              >
                Ver o mapa da carreira <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          {courses.length === 0 ? (
            <KidsEmptyState
              icon={BookOpen}
              title="Nenhum curso liberado ainda"
              description="Assim que sua compra for confirmada, seu acesso aparece aqui."
            />
          ) : unlocked.length === 0 ? (
            // Defensivo (tudo travado pela carreira): aponta o mapa em vez de sumir.
            <KidsEmptyState
              icon={MapIcon}
              title="Seus próximos cursos estão no mapa!"
              description="Abra o Mapa da Carreira para ver o que vem pela frente."
              action={
                <Link href="/cursos" prefetch={false} className="sz-btn-gradient px-6">
                  <Sparkles className="size-4" aria-hidden /> Abrir o mapa
                </Link>
              }
            />
          ) : (
            // Quatro colunas só a partir de 1280px: com o menu de 268px, a 1024 cada
            // cartão ficaria com 140px.
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {unlocked.map((course) => (
                <CourseCard key={course.courseSlug} course={course} />
              ))}
            </div>
          )}
        </section>
      </KidsBand>
    </>
  )
}
