import { expect, it } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { createEmptyProject } from '../../core/project'
import { registerProjectOperation } from '../../state/projectOperations'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../../state/projectStorageRuntime'
import { createStudioStores } from '../../state/studioStores'
import { prepareSourceDownload } from '../sourceDownload'

function fixture() {
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({
    project: {
      ...createEmptyProject('source-export', 'Meu jogo'),
      kind: 'pro',
      mode: 'code',
      tree: { 'main.ts': { kind: 'file', content: 'old' } },
    },
  })
  return stores
}

it('does not flush new editor buffers after the download was cancelled during a writer', async () => {
  const stores = fixture()
  const controller = new AbortController()
  let flushes = 0
  stores.pendingEditorEdits.register(() => {
    flushes++
  })
  const unregister = registerProjectOperation(stores.project, {
    projectId: 'source-export',
    flush: async () => {
      controller.abort(new Error('cancelled'))
    },
  })
  try {
    await expect(
      prepareSourceDownload(stores.project, stores.pendingEditorEdits, controller.signal),
    ).rejects.toThrow('cancelled')
    expect(flushes).toBe(1)
  } finally {
    unregister()
  }
})

it('does not start asynchronous writers after cancellation in the buffer flush', async () => {
  const stores = fixture()
  const controller = new AbortController()
  let writes = 0
  stores.pendingEditorEdits.register(() => controller.abort(new Error('cancelled')))
  const unregister = registerProjectOperation(stores.project, {
    projectId: 'source-export',
    flush: async () => {
      writes++
    },
  })
  try {
    await expect(
      prepareSourceDownload(stores.project, stores.pendingEditorEdits, controller.signal),
    ).rejects.toThrow('cancelled')
    expect(writes).toBe(0)
  } finally {
    unregister()
  }
})

it('flushes synchronous buffers around asynchronous writers before taking the immutable snapshot', async () => {
  const stores = fixture()
  let calls = 0
  stores.pendingEditorEdits.register(() => {
    calls++
    stores.project.getState().setProFileContent('main.ts', `buffer ${calls}`)
  })
  const unregister = registerProjectOperation(stores.project, {
    projectId: 'source-export',
    flush: async () => {
      await Promise.resolve()
      stores.project.getState().setProFileContent('main.ts', 'filesystem')
    },
  })
  try {
    const result = await prepareSourceDownload(
      stores.project,
      stores.pendingEditorEdits,
      new AbortController().signal,
    )
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()))
    expect(strFromU8(files['main.ts']!)).toBe('buffer 2')
    expect(calls).toBe(2)
  } finally {
    unregister()
  }
})

it('does not resume an old export after project A → B → A', async () => {
  const stores = fixture()
  const project = stores.project.getState().project!
  const unregister = registerProjectOperation(stores.project, {
    projectId: project.id,
    flush: async () => {
      stores.project.setState({ project: { ...project, id: 'other' } })
      stores.project.setState({ project })
    },
  })
  try {
    await expect(
      prepareSourceDownload(
        stores.project,
        stores.pendingEditorEdits,
        new AbortController().signal,
      ),
    ).rejects.toThrow('mudou')
  } finally {
    unregister()
  }
})

it('rejects a changed profile even when project IDs match', async () => {
  const stores = fixture()
  const previous = captureProjectStorageScope().namespace
  const unregister = registerProjectOperation(stores.project, {
    projectId: 'source-export',
    flush: async () => {
      setProjectStorageNamespace('source-export-other-profile')
    },
  })
  try {
    await expect(
      prepareSourceDownload(
        stores.project,
        stores.pendingEditorEdits,
        new AbortController().signal,
      ),
    ).rejects.toThrow('mudou')
  } finally {
    unregister()
    setProjectStorageNamespace(previous)
  }
})
