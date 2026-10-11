import { afterAll, afterEach, expect, mock, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { StrictMode, useContext } from 'react'
import type { CourseDetailView, LessonDetailView } from '../src/lib/types'

// Outros arquivos substituem next/navigation no processo inteiro. O roteador desta fixture
// lê seus contextos, permitindo trocar só a página e preservar o layout. Restauramos os
// exports recebidos ao terminar; nenhum componente da aula é substituído.
const previousNavigation = { ...(await import('next/navigation')) }
mock.module('next/navigation', () => ({
  ...previousNavigation,
  usePathname: () => useContext(PathnameContext),
  useRouter: () => {
    const router = useContext(AppRouterContext)
    if (!router) throw new Error('Missing test router')
    return router
  },
}))
const { LessonPlayer } = await import(
  '../src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client'
)
const { LessonCompletionRefreshProvider } = await import(
  '../src/components/kids/lesson-completion-refresh'
)
afterAll(() => {
  mock.module('next/navigation', () => previousNavigation)
})

const lessonPath = '/cursos/jogo/aulas/primeira'
const course: CourseDetailView = {
  slug: 'jogo',
  title: 'Meu jogo',
  subtitle: null,
  description: null,
  coverImageUrl: null,
  access: { accessType: 'enrollment', expiresAt: null },
  progress: { completedLessons: 0, totalLessons: 2, percent: 0, lastCompletedAt: null },
  continueLessonId: 'primeira',
  myRating: null,
  salesPageUrl: null,
  modules: [],
}
const lesson: LessonDetailView = {
  id: 'primeira',
  slug: 'primeira',
  title: 'Primeira fase',
  courseSlug: course.slug,
  moduleId: 'mundo',
  estimatedMinutes: null,
  completed: false,
  positionSeconds: null,
  blocks: [],
  attachments: [],
}
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

function mountLesson({ last = false, publication = false, failed = false } = {}) {
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/complete'))
        return failed
          ? Response.json({ error: { message: 'Não foi possível concluir.' } }, { status: 503 })
          : Response.json({
              ...course.progress,
              completedLessons: last ? 2 : 1,
              percent: last ? 100 : 50,
            })
      return Response.json({})
    }),
    { preconnect: originalFetch.preconnect },
  )
  const refresh = mock(() => {})
  const router = {
    back() {},
    forward() {},
    push() {},
    replace() {},
    prefetch() {},
    refresh,
    bfcacheId: 'test',
  }
  const tree = (pathname: string, viewerId = 'aluno') => (
    <StrictMode>
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value={pathname}>
          <LessonCompletionRefreshProvider key={viewerId}>
            {pathname === lessonPath ? (
              <LessonPlayer
                course={
                  publication
                    ? {
                        ...course,
                        careerSlot: 1,
                        milestones: { completed: false, showcased: false },
                      }
                    : course
                }
                lesson={lesson}
                nextLessonHref={last ? null : '/cursos/jogo/aulas/segunda'}
                viewerId={viewerId}
                viewerWatermark={null}
                ratingViewer={{ name: 'Ana', age: 10, avatarUrl: null }}
                shareUrl={null}
              />
            ) : (
              <p>Destino da navegação</p>
            )}
          </LessonCompletionRefreshProvider>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    </StrictMode>
  )
  const view = render(tree(lessonPath))
  return {
    refresh,
    navigate: (pathname: string, viewerId = 'aluno') => view.rerender(tree(pathname, viewerId)),
  }
}

async function complete() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Concluir fase' }))
  })
}

test.each([
  { label: 'Próxima fase', href: '/cursos/jogo/aulas/segunda', last: false, publication: false },
  { label: 'Voltar à aventura', href: '/cursos/jogo', last: false, publication: false },
  { label: 'Voltar à aventura', href: '/cursos/jogo', last: true, publication: false },
  {
    label: 'Conferir publicação do projeto',
    href: '/cursos/jogo#publicar',
    last: true,
    publication: true,
  },
])('concluir e sair por "$label" atualiza o layout uma vez: $href', async ({
  label,
  href,
  last,
  publication,
}) => {
  const { refresh, navigate } = mountLesson({ last, publication })
  await complete()
  expect(screen.getByRole('dialog', { name: 'Fase concluída' })).toBeTruthy()
  expect(refresh).not.toHaveBeenCalled()
  expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href)
  // O App Router substitui a página e preserva o layout. Não usamos push+refresh na página
  // que vai desmontar: a atualização precisa sobreviver à navegação real.
  navigate(href.split('#')[0] ?? '')
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  navigate('/outra-pagina')
  await act(async () => {})
  expect(refresh).toHaveBeenCalledTimes(1)
})

test('ficar na fase fecha a celebração e atualiza uma vez, sem nova atualização ao sair depois', async () => {
  const { refresh, navigate } = mountLesson()
  await complete()
  fireEvent.click(screen.getByRole('button', { name: 'Ficar nesta fase' }))
  expect(screen.queryByRole('dialog', { name: 'Fase concluída' })).toBeNull()
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  navigate('/cursos/jogo')
  await act(async () => {})
  expect(refresh).toHaveBeenCalledTimes(1)
})

test('fechar e navegar imediatamente não cancela a atualização ao desmontar a aula', async () => {
  const { refresh, navigate } = mountLesson()
  await complete()
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Ficar nesta fase' }))
    navigate('/cursos/jogo')
  })
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
})

test('a celebração aberta não dispara atualização nem quando a mesma rota renderiza novamente', async () => {
  const { refresh, navigate } = mountLesson()
  await complete()
  navigate(lessonPath)
  await act(async () => {})
  expect(screen.getByRole('dialog', { name: 'Fase concluída' })).toBeTruthy()
  expect(refresh).not.toHaveBeenCalled()
})

test('sair sem concluir não atualiza o layout', async () => {
  const { refresh, navigate } = mountLesson()
  navigate('/cursos/jogo')
  await act(async () => {})
  expect(refresh).not.toHaveBeenCalled()
})

test('conclusão recusada não deixa atualização pendente', async () => {
  const { refresh, navigate } = mountLesson({ failed: true })
  await complete()
  expect(screen.queryByRole('dialog', { name: 'Fase concluída' })).toBeNull()
  navigate('/cursos/jogo')
  await act(async () => {})
  expect(refresh).not.toHaveBeenCalled()
})

test('sair pela navegação do navegador também atualiza, e a pendência não passa para outro perfil', async () => {
  const { refresh, navigate } = mountLesson()
  await complete()
  navigate('/quarto')
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  navigate(lessonPath)
  await complete()
  navigate('/cursos/jogo', 'outro-aluno')
  await act(async () => {})
  expect(refresh).toHaveBeenCalledTimes(1)
})
