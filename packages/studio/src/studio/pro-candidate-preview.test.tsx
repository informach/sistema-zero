import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { createEmptyProject } from '../core/project'
import { setProjectStorageNamespace } from '../state/projectStorageRuntime'
import { StudioStoresContext } from '../state/storesContext'
import { createStudioStores } from '../state/studioStores'
import { StudioProCandidatePreviewProvider, useProCandidatePreview } from './pro-candidate-preview'

const artifact = {
  id: 'a'.repeat(64),
  sha256: 'b'.repeat(64),
  url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
  expiresAt: Date.now() + 60_000,
}
const input = { projectId: 'p', jobId: 'j', revisionHash: 'c'.repeat(64), artifact }
const project = { ...createEmptyProject('p', 'Atual'), kind: 'pro' as const, mode: 'code' as const }
afterEach(() => {
  cleanup()
  setProjectStorageNamespace('')
})

test('candidate selection belongs to its instance and leaves the current project untouched', () => {
  const first = createStudioStores({ persistence: 'none' }),
    second = createStudioStores({ persistence: 'none' })
  first.project.setState({ project })
  second.project.setState({ project })
  let a!: ReturnType<typeof useProCandidatePreview>, b!: typeof a
  function Probe({ slot }: { slot: 'a' | 'b' }) {
    const api = useProCandidatePreview()
    if (slot === 'a') a = api
    else b = api
    return null
  }
  render(
    <StrictMode>
      <StudioStoresContext.Provider value={first}>
        <StudioProCandidatePreviewProvider>
          <Probe slot="a" />
        </StudioProCandidatePreviewProvider>
      </StudioStoresContext.Provider>
      <StudioStoresContext.Provider value={second}>
        <StudioProCandidatePreviewProvider>
          <Probe slot="b" />
        </StudioProCandidatePreviewProvider>
      </StudioStoresContext.Provider>
    </StrictMode>,
  )
  act(() => {
    expect(a.show(input)).toBe(true)
  })
  expect(a.mode).toBe('candidate')
  expect(b.candidate).toBeNull()
  expect(first.project.getState().project).toBe(project)
  expect(first.project.getState().isDirty).toBe(false)
  const nonce = a.focusNonce
  act(() => a.select('current'))
  expect(a.candidate?.jobId).toBe('j')
  expect(a.focusNonce).toBeGreaterThan(nonce)
  act(() => a.report('wrong', 'expired'))
  expect(a.candidate?.status).toBe('loading')
  act(() => a.report(artifact.id, 'expired'))
  expect(a.candidate?.status).toBe('expired')
  act(() => {
    a.select('candidate')
    a.report(artifact.id, 'ready')
  })
  act(() => a.show(input))
  expect(a.candidate?.status).toBe('ready')
  act(() => a.close())
  expect(a.candidate).toBeNull()
  expect(a.mode).toBe('current')
})

test('project/profile changes discard selection permanently and stale callbacks cannot reopen it', () => {
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project })
  let api!: ReturnType<typeof useProCandidatePreview>
  function Probe() {
    api = useProCandidatePreview()
    return null
  }
  const tree = () => (
    <StudioStoresContext.Provider value={stores}>
      <StudioProCandidatePreviewProvider>
        <Probe />
      </StudioProCandidatePreviewProvider>
    </StudioStoresContext.Provider>
  )
  const view = render(tree())
  act(() => {
    expect(api.show({ ...input, projectId: 'other' })).toBe(false)
    expect(api.show({ ...input, revisionHash: 'bad' })).toBe(false)
    api.show(input)
  })
  act(() => stores.project.setState({ project: { ...project, id: 'other' } }))
  expect(api.candidate).toBeNull()
  act(() => stores.project.setState({ project }))
  expect(api.candidate).toBeNull()
  act(() => api.show(input))
  act(() => {
    stores.project.setState({ project: { ...project, id: 'other' } })
    stores.project.setState({ project })
  })
  expect(api.candidate).toBeNull()
  act(() => api.show(input))
  const staleShow = api.show
  setProjectStorageNamespace('different-profile')
  view.rerender(tree())
  expect(api.candidate).toBeNull()
  act(() => expect(staleShow(input)).toBe(false))
  act(() => api.show(input))
  expect(api.candidate).not.toBeNull()
  setProjectStorageNamespace('')
  view.rerender(tree())
  expect(api.candidate).toBeNull()
})
