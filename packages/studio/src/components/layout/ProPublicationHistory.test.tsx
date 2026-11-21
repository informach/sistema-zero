import { afterEach, expect, mock, test } from 'bun:test'
import type { StudioProPublication } from '@sistemazero/core/studio'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '../../core/project'
import { setProjectStorageNamespace } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import type { StudioShareAdapter } from '../../studio/share'
import { ProPublicationHistory } from './ProPublicationHistory'

afterEach(() => {
  cleanup()
  setProjectStorageNamespace('')
  useProjectStore.setState({ project: null })
})
function fixture() {
  const project = {
    ...createEmptyProject('history-game', 'Arena'),
    kind: 'pro' as const,
    mode: 'code' as const,
    tree: { 'src/main.ts': { kind: 'file' as const, content: 'latest' } },
    proMeta: { templateId: 'canvas-grid-arena', devScript: 'dev' },
  }
  useProjectStore.setState({ project })
  const publication: StudioProPublication = {
    playId: crypto.randomUUID(),
    version: 2,
    disabled: false,
    activeRevision: '2'.repeat(64),
    revisions: [1, 2].map((n) => ({
      id: String(n).repeat(64),
      sourceHash: 'a'.repeat(64),
      artifactHash: 'b'.repeat(64),
      createdAt: n * 1000,
      validation: { profileVersion: 1, runtimeFingerprint: 'c'.repeat(64) },
    })),
  }
  const adapter: NonNullable<StudioShareAdapter['publication']> = {
    get: mock(async () => publication),
    activate: mock(async (input) => ({
      ...publication,
      version: 3,
      activeRevision: input.revision,
      disabled: input.disabled,
    })),
  }
  return { project, publication, adapter }
}
test('rollback and disable use explicit CAS and preserve the local working copy', async () => {
  const f = fixture()
  render(
    <ProPublicationHistory
      adapter={f.adapter}
      playId={f.publication.playId}
      projectId={f.project.id}
    />,
  )
  await screen.findByText('Link ativo')
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar no link' }))
  await waitFor(() => expect(f.adapter.activate).toHaveBeenCalledTimes(1))
  expect((f.adapter.activate as ReturnType<typeof mock>).mock.calls[0]?.[0]).toMatchObject({
    expectedVersion: 2,
    revision: '1'.repeat(64),
    disabled: false,
  })
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Desativar link' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Desativar link' }))
  await screen.findByText('Link desativado')
  expect((f.adapter.activate as ReturnType<typeof mock>).mock.calls[1]?.[0]).toMatchObject({
    expectedVersion: 3,
    disabled: true,
  })
  expect(useProjectStore.getState().project).toEqual(f.project)
})
test('retry after a lost restore response reuses the operation id', async () => {
  const f = fixture()
  let attempts = 0
  f.adapter.activate = mock(async (input) => {
    if (++attempts === 1) throw new Error('Resposta perdida')
    return { ...f.publication, version: 3, activeRevision: input.revision }
  })
  render(
    <ProPublicationHistory
      adapter={f.adapter}
      playId={f.publication.playId}
      projectId={f.project.id}
    />,
  )
  await screen.findByText('Link ativo')
  // Pôr a versão de agora no link é o botão Atualizar do Compartilhar, não o histórico.
  expect(screen.queryByRole('button', { name: /Publicar versão atual/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar no link' }))
  await screen.findByText('Resposta perdida')
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar no link' }))
  await waitFor(() => expect(f.adapter.activate).toHaveBeenCalledTimes(2))
  const calls = (f.adapter.activate as ReturnType<typeof mock>).mock.calls
  expect(calls[0]?.[0]).toEqual(calls[1]?.[0])
})
test('a late history response cannot cross a profile round trip', async () => {
  const f = fixture()
  setProjectStorageNamespace('history-a')
  let resolve!: (value: StudioProPublication) => void
  f.adapter.get = () =>
    new Promise((done) => {
      resolve = done
    })
  render(
    <ProPublicationHistory
      adapter={f.adapter}
      playId={f.publication.playId}
      projectId={f.project.id}
    />,
  )
  setProjectStorageNamespace('history-b')
  setProjectStorageNamespace('history-a')
  resolve(f.publication)
  await new Promise((done) => setTimeout(done, 0))
  expect(screen.queryByText('Link ativo')).toBeNull()
  expect(f.adapter.activate).not.toHaveBeenCalled()
})
