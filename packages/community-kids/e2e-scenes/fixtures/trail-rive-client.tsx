import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CourseTrail } from '../../src/components/kids/course-trail'
import type { CourseDetailView } from '../../src/lib/types'

const router = {
  bfcacheId: 'trail-fixture',
  back() {},
  forward() {},
  refresh() {},
  hmrRefresh() {},
  push() {},
  replace() {},
  prefetch() {},
}
const params = new URLSearchParams(location.search)
const counts = (params.get('rows') ?? '1,2,5').split(',').map(Number)
const course: CourseDetailView = {
  slug: 'ensaio-rive',
  title: 'Animações dos módulos',
  subtitle: null,
  description: null,
  coverImageUrl: null,
  access: { accessType: 'course', expiresAt: null },
  progress: {
    completedLessons: 0,
    totalLessons: counts.reduce((a, b) => a + b, 0),
    percent: 0,
    lastCompletedAt: null,
  },
  continueLessonId: null,
  myRating: null,
  salesPageUrl: null,
  modules: counts.map((count, index) => ({
    id: `m${index}`,
    title: `Módulo ${index + 1}`,
    summary: null,
    sortOrder: index,
    riveUrl: `${location.origin}/zappy/happy.riv`,
    chest: { unlocked: false, claimed: false, xp: 25, coins: 15 },
    lessons: Array.from({ length: count }, (_, i) => ({
      id: `m${index}-a${i}`,
      slug: `a${i}`,
      title: 'Uma aula com título longo para conferir a leitura',
      sortOrder: i,
      estimatedMinutes: null,
      completed: false,
      locked: index !== 0 || i !== 0,
    })),
  })),
}

function Fixture() {
  const [broken, setBroken] = useState(params.has('broken'))
  const [removed, setRemoved] = useState(params.has('removed'))
  const [advanced, setAdvanced] = useState(false)
  return (
    <AppRouterContext.Provider value={router}>
      <main className="mx-auto max-w-[48rem] p-8">
        <button type="button" onClick={() => setBroken(!broken)}>
          Trocar arquivo
        </button>
        {params.has('controls') ? (
          <>
            <button type="button" onClick={() => setRemoved(!removed)}>
              Remover ou recolocar arte
            </button>
            <button type="button" onClick={() => setAdvanced(!advanced)}>
              Avançar aula
            </button>
          </>
        ) : null}
        <CourseTrail
          course={{
            ...course,
            modules: course.modules.map((module) => ({
              ...module,
              riveUrl: removed ? null : broken ? `${location.origin}/missing.riv` : module.riveUrl,
              lessons: module.lessons.map((lesson, index) => ({
                ...lesson,
                completed: advanced && index === 0,
                locked: advanced ? index > 1 : lesson.locked,
              })),
            })),
          }}
        />
      </main>
    </AppRouterContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
