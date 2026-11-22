import { afterEach, describe, expect, test } from 'bun:test'
import type { LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LessonResume } from '../../member-shell/src/components/lesson-resume'

const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})
const lesson: LessonDetailView = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'aula-1',
  courseSlug: 'curso-pais',
  moduleId: 'module',
  title: 'Aula',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  blocks: [],
  learningProgress: { sectionId: 'parte-1', blocks: [] },
}

describe('retomada da aula ao reabrir', () => {
  test('um retrato antigo recriado durante a leitura não substitui a resposta atual', async () => {
    let finish: ((r: Response) => void) | undefined
    globalThis.fetch = Object.assign(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
      { preconnect: originalFetch.preconnect },
    )
    const child = (current: LessonDetailView) => <p>{current.learningProgress?.sectionId}</p>
    const view = render(
      <LessonResume lesson={lesson} viewerId="responsavel">
        {child}
      </LessonResume>,
    )
    await waitFor(() => expect(finish).toBeDefined())
    view.rerender(
      <LessonResume lesson={{ ...lesson }} viewerId="responsavel">
        {child}
      </LessonResume>,
    )
    finish?.(Response.json({ ...lesson, learningProgress: { sectionId: 'parte-3', blocks: [] } }))
    await waitFor(() => expect(screen.getByText('parte-3')).toBeTruthy())
    expect(screen.queryByText('parte-1')).toBeNull()
  })
  test('consulta a conta antes de montar vídeos a partir de um retrato antigo do roteador', async () => {
    let finish: ((r: Response) => void) | undefined
    globalThis.fetch = Object.assign(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
      { preconnect: originalFetch.preconnect },
    )
    let mounts = 0
    render(
      <LessonResume lesson={lesson} viewerId="responsavel">
        {(current) => {
          mounts++
          return <p>{current.learningProgress?.sectionId}</p>
        }}
      </LessonResume>,
    )
    expect(mounts).toBe(0)
    await waitFor(() => expect(finish).toBeDefined())
    finish?.(
      Response.json({
        ...lesson,
        positionSeconds: 87,
        learningProgress: { sectionId: 'parte-3', blocks: [] },
      }),
    )
    await waitFor(() => expect(screen.getByText('parte-3')).toBeTruthy())
    expect(screen.queryByText('parte-1')).toBeNull()
  })

  test('a leitura de entrada conserva o segundo do vídeo e aceita refreshes posteriores sem remontar', async () => {
    globalThis.fetch = Object.assign(
      async () => Response.json({ ...lesson, positionSeconds: 87 }),
      { preconnect: originalFetch.preconnect },
    )
    const child = (current: LessonDetailView) => (
      <>
        <span>{current.positionSeconds}</span>
        <input aria-label="Rascunho" defaultValue="" />
      </>
    )
    const view = render(
      <LessonResume lesson={lesson} viewerId="responsavel">
        {child}
      </LessonResume>,
    )
    await waitFor(() => expect(screen.getByText('87')).toBeTruthy())
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Meu trabalho' } })
    view.rerender(
      <LessonResume lesson={{ ...lesson, positionSeconds: 96 }} viewerId="responsavel">
        {child}
      </LessonResume>,
    )
    expect(screen.getByText('96')).toBeTruthy()
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Meu trabalho')
  })

  test('trocar de aprendiz cancela a resposta antiga e não mistura o progresso da família', async () => {
    const complete = new Map<string, (r: Response) => void>()
    globalThis.fetch = Object.assign(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          complete.set(new Headers(init?.headers).get('x-sz-viewer') ?? '', resolve)
        }),
      { preconnect: originalFetch.preconnect },
    )
    const child = (current: LessonDetailView) => <span>{current.learningProgress?.sectionId}</span>
    const view = render(
      <LessonResume lesson={lesson} viewerId="responsavel">
        {child}
      </LessonResume>,
    )
    await waitFor(() => expect(complete.has('responsavel')).toBe(true))
    view.rerender(
      <LessonResume lesson={lesson} viewerId="filho">
        {child}
      </LessonResume>,
    )
    await waitFor(() => expect(complete.has('filho')).toBe(true))
    complete.get('filho')?.(
      Response.json({ ...lesson, learningProgress: { sectionId: 'parte-do-filho', blocks: [] } }),
    )
    await waitFor(() => expect(screen.getByText('parte-do-filho')).toBeTruthy())
    complete.get('responsavel')?.(
      Response.json({ ...lesson, learningProgress: { sectionId: 'parte-dos-pais', blocks: [] } }),
    )
    await waitFor(() => expect(screen.queryByText('parte-dos-pais')).toBeNull())
  })

  test('falha ao ler o progresso avisa e não começa a aula do zero', async () => {
    globalThis.fetch = Object.assign(
      async () =>
        Response.json({ error: { code: 'UNAVAILABLE', message: 'Fora do ar' } }, { status: 503 }),
      { preconnect: originalFetch.preconnect },
    )
    render(
      <LessonResume lesson={lesson} viewerId="responsavel">
        {() => <p>Aula montada</p>}
      </LessonResume>,
    )
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByText('Aula montada')).toBeNull()
    globalThis.fetch = Object.assign(async () => Response.json(lesson), {
      preconnect: originalFetch.preconnect,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.getByText('Aula montada')).toBeTruthy())
  })
})
