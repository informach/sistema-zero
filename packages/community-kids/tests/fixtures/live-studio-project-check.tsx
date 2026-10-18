import { afterEach, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { createElement, forwardRef, useEffect, useImperativeHandle } from 'react'
import { LessonPlayerProvider } from '../../../member-shell/src/components/lesson-player-context'
import { SectionProjectCheck } from '../../../member-shell/src/components/studio/section-project-check'

const FakeEditor = forwardRef((props: any, ref: any) => {
  useImperativeHandle(ref, () => ({
    getProject: () => props.initialProject,
    prepareHandoff: async () => null,
    applyObservedRevision: async () => {},
    resumeAuthorship: () => {},
    save: async () => {},
  }))
  useEffect(() => {
    props.onReady()
  }, [props.onReady])
  return createElement('div', { 'data-testid': 'editor' })
})
mock.module('../../../member-shell/node_modules/next/dynamic.js', () => ({
  default: () => FakeEditor,
}))
const { LiveBlockWorkspace } = await import(
  '../../../member-shell/src/components/live/live-workspace'
)
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})
test('o Estúdio ao vivo verifica o projeto do editor e atualiza o progresso da aula', async () => {
  globalThis.indexedDB = new IDBFactory()
  const actor = crypto.randomUUID(),
    device = crypto.randomUUID(),
    session = crypto.randomUUID(),
    block = crypto.randomUUID()
  const canonical = {
    id: crypto.randomUUID(),
    sessionId: session,
    learnerId: actor,
    revision: 2,
    writerEpoch: 1,
    writerId: actor,
    writerDeviceId: device,
    leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
    assistance: null,
    project: { id: crypto.randomUUID(), name: 'Jogo da Bia' },
  }
  let checked: unknown
  let refreshed = false
  globalThis.fetch = (async (input: any, init: any) => {
    if (String(input).includes('/project-check')) {
      checked = JSON.parse(init.body)
      return Response.json({ passed: true, results: [{ id: 'loop', passed: true }] })
    }
    return Response.json(canonical)
  }) as typeof fetch
  const player: any = {
    viewerId: actor,
    lessonId: 'lesson',
    courseSlug: 'course',
    viewerWatermark: null,
    refreshAfterLearning: () => {
      refreshed = true
    },
    sectionProjectCheck: {
      blockId: block,
      sectionId: 'section',
      revision: 'revision',
      objectives: [{ id: 'loop', label: 'Usar repetição', kind: 'idea' }],
    },
  }
  // Positive control: the configured criterion really renders a verification in the regular control.
  render(
    createElement(
      LessonPlayerProvider,
      { value: player },
      createElement(SectionProjectCheck, { blockId: block, handleRef: { current: null } }),
    ),
  )
  expect(Boolean(screen.queryByRole('button', { name: 'Verificar esta etapa' }))).toBe(true)
  cleanup()
  // The live replacement must consume the same criterion and verify its current project.
  render(
    createElement(
      LessonPlayerProvider,
      { value: player },
      createElement(LiveBlockWorkspace, {
        blockId: block,
        title: 'Meu projeto',
        workspace: {
          actorId: actor,
          learnerId: actor,
          deviceId: device,
          sessionId: session,
          role: 'learner',
        },
      }),
    ),
  )
  await waitFor(() => expect(Boolean(screen.queryByRole('button', { name: 'Guardar' }))).toBe(true))
  await waitFor(() =>
    expect(Boolean(screen.queryByRole('button', { name: 'Verificar esta etapa' }))).toBe(true),
  )
  expect(Boolean(screen.queryByText(/Usar repetição/))).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Verificar esta etapa' }))
  await waitFor(() => expect(refreshed).toBe(true))
  expect(checked).toEqual({ revision: 'revision', project: canonical.project })
})
