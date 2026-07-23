import { ChallengeCard } from '@/components/kids/challenge-card'
import { ContinueHero } from '@/components/kids/continue-hero'
import { CourseCard } from '@/components/kids/course-card'
import { CreatorCareerCard } from '@/components/kids/creator-career-card'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { KidsMascot } from '@/components/kids/mascot'
import { MissionsPanel } from '@/components/kids/missions-panel'
import { unitThemeAt } from '@/components/kids/unit-theme'
import {
  checkChallengeAccessReadonly,
  getAvatarReadonly,
  getChallengeReadonly,
  getGamificationReadonly,
  getMissionsReadonly,
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
  const [{ status, body }, gam, missions, avatarRes, showcaseRes, challengeAccess] =
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
    ])
  if (status !== 200) throw new Error('Falha ao carregar os cursos')
  const courses = body?.courses ?? []
  // slug → título p/ o card nomear o curso-base (`foundationCourseSlug`) sem ir ao backend.
  const titleBySlug = new Map(courses.map((c) => [c.courseSlug, c.title]))
  const gamification = gam.status === 200 ? (gam.body ?? null) : null
  const missionsData = missions.status === 200 ? (missions.body ?? null) : null
  const avatarPhotoUrl =
    avatarRes.status === 200 && avatarRes.body ? (avatarRes.body.photoUrl ?? null) : null
  const showcaseStats = showcaseRes?.status === 200 ? (showcaseRes.body ?? null) : null
  const challengeEligible =
    challengeAccess?.status === 200 &&
    challengeAccess.body?.access?.['clube-dos-criadores'] === true &&
    challengeAccess.body?.access?.['estudio-completo'] === true
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

      <ContinueHero courses={courses} />

      {/* Gamificação fora → os cards mostram placeholder gentil (não somem em silêncio). */}
      {courses.length > 0 ? (
        <CreatorCareerCard
          gamification={gamification}
          avatarPhotoUrl={avatarPhotoUrl}
          showcaseStats={showcaseStats}
        />
      ) : null}

      {/* Desafio do mês (game jam) — só com posse de Clube+Estúdio. */}
      {challengeData ? <ChallengeCard data={challengeData} /> : null}

      {/* Missões diárias/semanais (dados do servidor). */}
      {courses.length > 0 ? <MissionsPanel initial={missionsData} /> : null}

      <section className="flex flex-col gap-4">
        <h2 className="sz-display text-xl">Meus cursos</h2>
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
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
              <CourseCard
                key={course.courseSlug}
                course={course}
                foundationTitle={
                  course.careerLock?.foundationCourseSlug
                    ? (titleBySlug.get(course.careerLock.foundationCourseSlug) ?? null)
                    : null
                }
                theme={unitThemeAt(i)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
