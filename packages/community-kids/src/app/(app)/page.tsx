import { ArrowRight } from 'lucide-react'
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
import { KidsMascot } from '@/components/kids/mascot'
import { MissionsPanel } from '@/components/kids/missions-panel'
import { unitThemeAt } from '@/components/kids/unit-theme'
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
    const done =
      c.progress.totalLessons > 0 && c.progress.completedLessons >= c.progress.totalLessons
    if (done) return 2
    return c.progress.completedLessons > 0 ? 0 : 1
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
    challengeAccess?.status === 200 &&
    challengeAccess.body?.access?.['clube-dos-criadores'] === true &&
    challengeAccess.body?.access?.['estudio-completo'] === true
  const hasCourseActivity = hasAnyCourseActivity(courses)
  const startAvailable = pickContinueCourse(courses) !== null
  const childGuideEnabled = Boolean(user?.activeProfile && user.id)
  // Tema do mês só é buscado quando o card vai aparecer (best-effort).
  const challengeRes = challengeEligible ? await getChallengeReadonly().catch(() => null) : null
  const challengeData = challengeRes?.status === 200 ? (challengeRes.body ?? null) : null

  return (
    <div className="flex flex-col gap-8">
      {/* Re-sincroniza ranking/nível/foguinho ao voltar pra tela (sem deslogar). */}
      <FocusRefresh />
      <div className="flex items-center gap-4">
        <KidsMascot
          expression={courses.length === 0 ? 'thinking' : 'happy'}
          className="size-14 md:size-20"
        />
        <div>
          <h1 className="sz-display text-3xl md:text-4xl">
            Olá{greetName ? `, ${greetName}` : ''}!
          </h1>
          <p className="mt-1 text-muted-foreground text-sm md:text-base">
            Bora aprender mais um pouquinho hoje?
          </p>
        </div>
      </div>

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
        >
          <ContinueHero courses={courses} />
        </ChildGuide>
      ) : (
        <ContinueHero courses={courses} />
      )}

      {/* Gamificação fora → os cards mostram placeholder gentil (não somem em silêncio). */}
      {courses.length > 0 ? (
        <CreatorCareerCard
          gamification={gamification}
          levelHint={levelHint}
          avatarPhotoUrl={avatarPhotoUrl}
          showcaseStats={showcaseStats}
        />
      ) : null}

      {/* Desafio do mês (game jam) — só com posse de Clube+Estúdio. */}
      {challengeData ? <ChallengeCard data={challengeData} /> : null}

      {/* Missões diárias/semanais (dados do servidor). */}
      {courses.length > 0 ? <MissionsPanel initial={missionsData} /> : null}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="sz-display text-xl">Meus cursos</h2>
          <Link
            href="/cursos"
            className="inline-flex items-center gap-1 font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Ver o mapa da carreira <ArrowRight className="size-4" />
          </Link>
        </div>
        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border border-dashed py-16 text-center">
            <KidsMascot expression="sleeping" className="size-20" />
            <div>
              <p className="sz-display text-lg">Nenhum curso liberado ainda</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Assim que sua compra for confirmada, seu acesso aparece aqui.
              </p>
            </div>
          </div>
        ) : unlocked.length === 0 ? (
          // Defensivo (tudo travado pela carreira): aponta o mapa em vez de sumir.
          <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border border-dashed py-16 text-center">
            <KidsMascot expression="thinking" className="size-20" />
            <div>
              <p className="sz-display text-lg">Seus próximos cursos estão no mapa!</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Abra o Mapa da Carreira para ver o que vem pela frente.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((course, i) => (
              <CourseCard key={course.courseSlug} course={course} theme={unitThemeAt(i)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
