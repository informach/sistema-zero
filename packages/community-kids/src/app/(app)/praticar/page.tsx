import type { PracticeSessionView } from '@sistemazero/core/practice'
import { redirect } from 'next/navigation'
import { PracticeWorkshop } from '@/components/kids/practice-workshop'
import { getCreatorJourney } from '@/server/creator-journey'
import { getPracticeAvailability } from '@/server/practice'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function PracticePage() {
  const user = await getSession()
  if (!user?.activeProfile) redirect('/perfis')
  const [enabled, journey, history] = await Promise.all([
    getPracticeAvailability().catch(() => null),
    getCreatorJourney(),
    shell.gateway
      .gatewayFetchReadonly<{ sessions: PracticeSessionView[] }>('/members/practice/sessions')
      .catch(() => null),
  ])
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">
      <header>
        <p className="font-bold text-primary">Sua oficina de ideias</p>
        <h1 className="sz-display mt-2 text-3xl md:text-4xl">Praticar um pouco</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Perguntas curtas sobre o que você já estudou, com tempo para pensar e entender cada
          resposta.
        </p>
      </header>
      <PracticeWorkshop
        key={user.id}
        profileId={user.id}
        enabled={enabled}
        courses={
          journey.courses
            ?.filter((course) => !course.careerLock?.locked && course.progress.completedLessons > 0)
            .map((course) => ({ slug: course.courseSlug, title: course.title })) ?? null
        }
        history={history?.status === 200 ? (history.body?.sessions ?? null) : null}
      />
    </div>
  )
}
