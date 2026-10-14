/** Review evidence: the real LiveWorkspace host, with the Studio imperative boundary replaced. */
import { afterEach, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { createElement, forwardRef, useEffect, useImperativeHandle } from 'react'

let localProject: any
let editorProps: any
const observed: string[] = []
const FakeStudio = forwardRef((props: any, ref: any) => {
  editorProps = props
  useImperativeHandle(ref, () => ({
    prepareHandoff: async () => structuredClone(localProject),
    applyObservedRevision: async (project: any) => {
      localProject = structuredClone(project)
      observed.push(project.name)
    },
    resumeAuthorship: () => {},
    getProject: () => localProject,
    save: async () => props.persistence.save(localProject),
  }))
  useEffect(() => {
    props.onReady()
  }, [])
  return createElement('div', { 'data-testid': 'studio-boundary' })
})
mock.module('../../member-shell/node_modules/next/dynamic.js', () => ({
  default: () => FakeStudio,
}))
const { LiveWorkspace } = await import('../../member-shell/src/components/live/live-workspace')
const originalFetch = globalThis.fetch
const originalIdb = globalThis.indexedDB
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  globalThis.indexedDB = originalIdb
})

test('teacher can end expired help without losing the last local draft or writing it over the child', async () => {
  globalThis.indexedDB = new IDBFactory()
  const teacher = crypto.randomUUID(),
    child = crypto.randomUUID(),
    deviceId = crypto.randomUUID(),
    session = crypto.randomUUID()
  let canonical: any = {
    id: crypto.randomUUID(),
    sessionId: session,
    learnerId: child,
    revision: 3,
    writerEpoch: 4,
    writerId: teacher,
    writerDeviceId: deviceId,
    leaseExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    project: { id: crypto.randomUUID(), name: 'Última revisão salva' },
    assistance: {
      id: crypto.randomUUID(),
      teacherId: teacher,
      teacherName: 'Ana',
      status: 'active',
    },
  }
  localProject = structuredClone(canonical.project)
  const requests: string[] = []
  globalThis.fetch = (async (input: any, init: any) => {
    const path = String(input).split('?')[0]!
    requests.push(`${init?.method ?? 'GET'} ${path}`)
    if (path.endsWith('/cancel-assistance'))
      canonical = {
        ...canonical,
        assistance: null,
        writerId: child,
        writerDeviceId: null,
        leaseExpiresAt: null,
        writerEpoch: canonical.writerEpoch + 1,
      }
    return Response.json(canonical)
  }) as typeof fetch
  render(
    createElement(LiveWorkspace, {
      room: {
        session: { id: session },
        actorId: teacher,
        role: 'teacher',
        access: { canOpen: true },
      } as any,
      selectedLearnerId: child,
      deviceId,
    }),
  )
  await waitFor(() => expect(observed.at(-1)).toBe('Última revisão salva'))
  expect(Boolean(screen.queryByRole('button', { name: 'Devolver o projeto' }))).toBe(false)
  localProject = { ...localProject, name: 'Rascunho da professora ainda não salvo' }
  fireEvent.click(screen.getByRole('button', { name: 'Encerrar ajuda interrompida' }))
  await waitFor(() =>
    expect(Boolean(screen.queryByRole('button', { name: 'Encerrar ajuda interrompida' }))).toBe(
      false,
    ),
  )
  await waitFor(() =>
    expect(
      screen.getByText(
        'Há um rascunho preservado neste aparelho que ainda precisa ser guardado na conta.',
      ),
    ).toBeTruthy(),
  )
  expect(canonical.project.name).toBe('Última revisão salva')
  expect(requests.some((path) => path.endsWith('/commits') || path.endsWith('/return'))).toBe(false)
  const { LiveDraftJournal, liveDraftScope } = await import(
    '../../member-shell/src/lib/live/workspace-drafts'
  )
  const journal = await LiveDraftJournal.open(
    liveDraftScope(canonical.id, child, teacher),
    deviceId,
  )
  try {
    expect((await journal.list()).map((item) => item.project.name)).toContain(
      'Rascunho da professora ainda não salvo',
    )
  } finally {
    journal.close()
  }
})

test('declining assistance preserves an unflushed local edit', async () => {
  globalThis.indexedDB = new IDBFactory()
  const child = crypto.randomUUID(),
    deviceId = crypto.randomUUID(),
    session = crypto.randomUUID()
  let canonical = {
    id: crypto.randomUUID(),
    sessionId: session,
    learnerId: child,
    revision: 1,
    writerEpoch: 1,
    writerId: child,
    writerDeviceId: deviceId,
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    project: { id: crypto.randomUUID(), name: 'Revisão salva' },
    assistance: {
      id: crypto.randomUUID(),
      teacherId: crypto.randomUUID(),
      teacherName: 'Ana',
      status: 'requested',
    },
  }
  localProject = structuredClone(canonical.project)
  const requests: string[] = []
  globalThis.fetch = (async (input: any, init: any) => {
    const path = String(input).split('?')[0]!
    requests.push(`${init?.method ?? 'GET'} ${path}`)
    if (path.endsWith('/revoke'))
      canonical = { ...canonical, writerEpoch: 1, assistance: null as any }
    return Response.json(canonical)
  }) as typeof fetch
  render(
    createElement(LiveWorkspace, {
      room: {
        session: { id: session },
        actorId: child,
        role: 'learner',
        access: { canOpen: true },
      } as any,
      deviceId,
    }),
  )
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy())
  localProject = { ...localProject, name: 'Edição ainda no debounce' }
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
  await waitFor(() => expect(requests.some((path) => path.endsWith('/revoke'))).toBe(true))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Agora não' })).toBeNull())
  expect(localProject.name).toBe('Edição ainda no debounce')
  expect(requests.some((path) => path.endsWith('/commits'))).toBe(false)
  expect(observed.at(-1)).toBe('Revisão salva')
})

test.each([
  false,
  true,
])('a durable draft survives remount and respects a newer revision: %s', async (newerRevision) => {
  globalThis.indexedDB = new IDBFactory()
  const child = crypto.randomUUID(),
    session = crypto.randomUUID()
  let deviceId = crypto.randomUUID(),
    disconnected = false
  let canonical: any = {
    id: crypto.randomUUID(),
    sessionId: session,
    learnerId: child,
    revision: 1,
    writerEpoch: 1,
    writerId: child,
    writerDeviceId: deviceId,
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    project: { id: crypto.randomUUID(), name: 'Na conta' },
    assistance: null,
  }
  globalThis.fetch = (async (input: any, init: any) => {
    const path = String(input).split('?')[0]!
    const body = init?.body ? JSON.parse(init.body) : null
    if (path.endsWith('/commits')) {
      if (disconnected) throw new Error('Offline')
      canonical = { ...canonical, revision: canonical.revision + 1, project: body.project }
    }
    if (path.endsWith('/claim'))
      canonical = {
        ...canonical,
        writerDeviceId: body.deviceId,
        writerEpoch: canonical.writerEpoch + 1,
      }
    return Response.json(canonical)
  }) as typeof fetch
  const mount = () =>
    render(
      createElement(LiveWorkspace, {
        room: {
          session: { id: session },
          actorId: child,
          role: 'learner',
          access: { canOpen: true },
        } as any,
        deviceId,
      }),
    )
  localProject = structuredClone(canonical.project)
  mount()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy())
  localProject = { ...localProject, name: 'Criado sem rede' }
  disconnected = true
  await act(async () => {
    await editorProps.persistence.stage(localProject)
    await editorProps.persistence.save(localProject).catch(() => {})
  })
  cleanup()
  await Bun.sleep(10)
  deviceId = crypto.randomUUID()
  if (newerRevision)
    canonical = {
      ...canonical,
      revision: canonical.revision + 1,
      project: { ...canonical.project, name: 'Revisão mais recente' },
    }
  localProject = structuredClone(canonical.project)
  disconnected = false
  mount()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Recuperar conexão' })).toBeTruthy(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Recuperar conexão' }))
  if (newerRevision) {
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('revisão'))
    expect(canonical.project.name).toBe('Revisão mais recente')
  } else await waitFor(() => expect(canonical.project.name).toBe('Criado sem rede'))
})
