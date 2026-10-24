import { expect, test } from 'bun:test'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { LessonOutlineContent } from '../src/components/community/lesson-outline-content'
import type { CourseDetailView } from '../src/lib/types'

test('menu mantém navegação, conclusão, aula atual e bloqueio independentes', () => {
  const course: Pick<CourseDetailView, 'title' | 'slug' | 'progress' | 'myRating' | 'modules'> = {
    title: 'Criando meu primeiro jogo',
    slug: 'primeiro-jogo',
    myRating: null,
    progress: { percent: 33, completedLessons: 1, totalLessons: 3, lastCompletedAt: null },
    modules: [
      {
        id: 'm1',
        title: 'Do primeiro movimento até a partida completa',
        summary: null,
        sortOrder: 0,
        chest: null,
        lessons: [
          {
            id: 'done',
            slug: 'done',
            sortOrder: 0,
            estimatedMinutes: null,
            title: 'Primeiros movimentos',
            completed: true,
            locked: false,
          },
          {
            id: 'now',
            slug: 'now',
            sortOrder: 1,
            estimatedMinutes: null,
            title: 'Um título comprido que precisa continuar legível no celular',
            completed: false,
            locked: false,
          },
          {
            id: 'later',
            slug: 'later',
            sortOrder: 2,
            estimatedMinutes: null,
            title: 'Próximo passo',
            completed: false,
            locked: true,
          },
        ],
      },
    ],
  }
  const router = {
    back() {},
    forward() {},
    push() {},
    replace() {},
    refresh() {},
    prefetch() {},
    bfcacheId: 'outline-test',
  }
  const html = renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <LessonOutlineContent
        course={course}
        courseHref="/cursos/primeiro-jogo"
        currentLessonId="now"
        shareUrl={null}
        viewer={{ firstName: null, lastName: null, email: null, avatarUrl: null }}
      />
    </AppRouterContext.Provider>,
  )
  expect(html).toContain('aria-label="Lista de aulas do curso"')
  expect(html).toContain('href="/cursos/primeiro-jogo/aulas/done"')
  const current = html.match(/<a\b[^>]*href="\/cursos\/primeiro-jogo\/aulas\/now"[^>]*>/)?.[0]
  expect(current).toContain('aria-current="page"')
  expect(html).toContain('Aula concluída.')
  expect(html).toContain('aria-disabled="true"')
  expect(html).not.toContain('/aulas/later')
  expect(html).toContain('Um título comprido que precisa continuar legível no celular')
  expect(html).not.toContain('truncate')
})
