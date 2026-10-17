import { expect, test } from 'bun:test'
import type { PensaProjectView } from '@sistemazero/core/pensa'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PensaTransport } from '../core/types'
import { PROJECT_ID, projectFixture } from './pensa.fixture'
import { usePensaProject } from './usePensaProject'

test('an older refresh cannot replace the result of an accepted mutation', async () => {
  const old = projectFixture()
  const changed: PensaProjectView = {
    ...old,
    project: {
      ...old.project,
      name: 'Meu novo nome',
      metadataRevision: old.project.metadataRevision + 1,
    },
  }
  let release: (view: PensaProjectView) => void = () => {
    throw new Error('Read not pending')
  }
  const stale = new Promise<PensaProjectView>((resolve) => {
    release = resolve
  })
  let reads = 0
  const transport: PensaTransport = {
    async request<T>(path: string, init?: { method?: string }): Promise<T> {
      if (path.startsWith('/projects?')) return [] as T
      if (init?.method === 'PATCH') return changed as T
      reads++
      return (reads === 1 ? old : await stale) as T
    },
  }
  const { result } = renderHook(() => usePensaProject(transport, PROJECT_ID))
  await waitFor(() => expect(result.current.view?.project.id).toBe(PROJECT_ID))
  const reading = result.current.refresh()
  await act(async () => {
    await result.current.execute(`/projects/${PROJECT_ID}`, { name: changed.project.name }, 'PATCH')
  })
  await act(async () => {
    release(old)
    await reading
  })
  expect(result.current.view?.project.name).toBe(changed.project.name)
})

test('a failed project switch does not leave the previous project displayed as the selection', async () => {
  const view = projectFixture()
  const transport: PensaTransport = {
    async request<T>(path: string): Promise<T> {
      if (path.startsWith('/projects?')) return [] as T
      if (path === `/projects/${PROJECT_ID}`) return view as T
      throw new Error('O outro projeto não está disponível.')
    },
  }
  const { result } = renderHook(() => usePensaProject(transport, PROJECT_ID))
  await waitFor(() => expect(result.current.view?.project.id).toBe(PROJECT_ID))
  await act(async () => {
    await result.current.open('10000000-0000-4000-8000-000000000099')
  })
  expect(result.current.view).toBeNull()
  expect(result.current.error).toContain('outro projeto')
})
