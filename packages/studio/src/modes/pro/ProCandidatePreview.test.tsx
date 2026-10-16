import { afterEach, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { createEmptyProject } from '../../core/project'
import { useProjectStore } from '../../state/projectStore'
import {
  StudioProCandidatePreviewProvider,
  useProCandidatePreview,
} from '../../studio/pro-candidate-preview'
import { StudioProRuntimeProvider } from '../../studio/pro-runtime'
import { ProArtifactPreview } from './ProArtifactPreview'
import { ProPreview } from './ProPreview'
import { createEphemeralProStorage } from './useProStorageBridge'

const artifact = {
  id: 'a'.repeat(64),
  sha256: 'b'.repeat(64),
  url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
  expiresAt: Date.now() + 60_000,
}
afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null })
})

test('remote selection keeps one game document and never builds or replaces the current project', async () => {
  const project = {
    ...createEmptyProject('p', 'Atual'),
    kind: 'pro' as const,
    mode: 'code' as const,
  }
  useProjectStore.setState({ project })
  const build = mock(async () => ({ html: '<main>Atual</main>' }))
  let api!: ReturnType<typeof useProCandidatePreview>
  function Controls() {
    api = useProCandidatePreview()
    return null
  }
  const view = render(
    <StudioProRuntimeProvider value={{ build }}>
      <StudioProCandidatePreviewProvider>
        <Controls />
        <ProPreview />
      </StudioProCandidatePreviewProvider>
    </StudioProRuntimeProvider>,
  )
  await waitFor(() => expect(view.container.querySelector('iframe')?.srcdoc).toContain('Atual'))
  const original = view.container.querySelector('iframe')!
  act(() => {
    api.show({ projectId: 'p', jobId: 'j', artifact, revisionHash: 'c'.repeat(64) })
  })
  expect(view.container.querySelectorAll('iframe')).toHaveLength(1)
  expect(original.isConnected).toBe(false)
  expect(view.container.querySelector('iframe')?.src).toBe(artifact.url)
  expect(view.container.querySelector('iframe')?.sandbox.value).toBe(
    'allow-scripts allow-pointer-lock',
  )
  expect(build).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Jogo atual' }))
  expect(view.container.querySelectorAll('iframe')).toHaveLength(1)
  expect(view.container.querySelector('iframe')?.srcdoc).toContain('Atual')
  expect(build).toHaveBeenCalledTimes(1)
  expect(useProjectStore.getState().project).toBe(project)
  fireEvent.click(screen.getByRole('button', { name: 'Fechar experiência' }))
  expect(api.candidate).toBeNull()
})

test('expired artifacts render recovery state and invoke the owner without any iframe', () => {
  const report = mock(() => {})
  const { container } = render(
    <StrictMode>
      <ProArtifactPreview
        artifact={{ ...artifact, expiresAt: Date.now() - 1 }}
        identity="expired"
        onStatus={report}
      />
    </StrictMode>,
  )
  expect(container.querySelector('iframe')).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('expirou')
  expect(report).toHaveBeenCalledWith('expired')
})

test('ephemeral stores copy snapshots, isolate instances, preserve literal keys and discard all progress', async () => {
  const first = createEphemeralProStorage(),
    second = createEphemeralProStorage()
  const next = Object.assign(Object.create(null), { score: '9' })
  next.__proto__ = 'literal'
  await first.write(next)
  next.score = '100'
  const read = await first.load()
  expect(read.score).toBe('9')
  expect(read.__proto__).toBe('literal')
  expect(Object.getPrototypeOf(read)).toBeNull()
  read.score = '500'
  expect((await first.load()).score).toBe('9')
  expect(Object.keys(await second.load())).toEqual([])
  first.clear()
  expect(Object.keys(await first.load())).toEqual([])
  first.dispose()
  await expect(first.load()).rejects.toThrow('encerrada')
  await expect(first.write({ score: '2' })).rejects.toThrow('encerrada')
})
