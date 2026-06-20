import { ContinueHero } from '@/components/kids/continue-hero'
import { CourseCard } from '@/components/kids/course-card'
import { KidsMascot } from '@/components/kids/mascot'
import { MissionsPanel } from '@/components/kids/missions-panel'
import { StreakCard } from '@/components/kids/streak-card'
import { unitThemeAt } from '@/components/kids/unit-theme'
import { getGamificationReadonly, listMyCourses } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getSession()
  // Numa sessão de PERFIL a saudação é para a CRIANÇA (nome do perfil ativo); o
  // token carrega o nome da CONTA, então o perfil tem prioridade.
  const greetName = user?.activeProfile?.name ?? user?.firstName
  // Gamificação é best-effort (401/gateway fora → card some), igual ao layout.
  const [{ status, body }, gam] = await Promise.all([listMyCourses(), getGamificationReadonly()])
  const courses = status === 200 ? (body?.courses ?? []) : []
  const gamification = gam.status === 200 ? (gam.body ?? null) : null

  return (
    <div className="flex flex-col gap-8">
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

      {gamification && courses.length > 0 ? <StreakCard gamification={gamification} /> : null}

      {/* Missões diárias/semanais (busca client-side; some se a gamificação estiver fora). */}
      {courses.length > 0 ? <MissionsPanel /> : null}

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
              <CourseCard key={course.courseSlug} course={course} theme={unitThemeAt(i)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
