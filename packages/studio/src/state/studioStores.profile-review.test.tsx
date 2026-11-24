import { expect, it } from 'bun:test'
import 'fake-indexeddb/auto'
import { act, renderHook } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'
import { createLocalPersistenceAdapter, useProjectStore } from './projectStore'
import { useStudioPersistence } from './studioStores'

it('review: editing the carried project must not copy private content into another profile', async () => {
  const previous = captureProjectStorageScope().namespace
  const first = `review-a-${crypto.randomUUID()}`
  const second = `review-b-${crypto.randomUUID()}`
  const id = crypto.randomUUID()
  let unmount = () => {}
  try {
    setProjectStorageNamespace(first)
    useProjectStore.setState({
      project: createEmptyProject(id, 'Private project A'),
      isDirty: true,
    })
    const hook = renderHook(useStudioPersistence)
    unmount = hook.unmount
    await act(async () => hook.result.current.save())
    setProjectStorageNamespace(second)
    hook.rerender()
    // Same project, through the real editor action; no explicit import/copy/open.
    useProjectStore.getState().setFile('script.js', 'window.PRIVATE_PROFILE_A = true;')
    await act(async () => {
      await expect(hook.result.current.save()).rejects.toThrow('outra aba')
    })
    expect(await createLocalPersistenceAdapter({ namespace: second }).load(id)).toBeNull()
    expect(useProjectStore.getState().isDirty).toBe(true)
    expect(useProjectStore.getState().project?.files?.['script.js']).toBe(
      'window.PRIVATE_PROFILE_A = true;',
    )
  } finally {
    unmount()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    setProjectStorageNamespace(previous)
  }
})
