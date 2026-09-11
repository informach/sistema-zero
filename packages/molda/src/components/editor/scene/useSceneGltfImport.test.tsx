import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { GLTF_IMPORT_COPY as copy } from '../../../core/gltfImportCopy'
import { structuredBytes } from '../../../core/structuredBytes'
import { encodeSceneGlb } from '../../../export/sceneGlb'
import type { GltfChosenFile } from '../../../import/gltfLocalBundle'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { makeSceneGlbFixture } from '../../../testing/sceneGlbFixture'
import { WORKER_LOADED_MESSAGE } from '../../../workers/workerHandshake'
import type { TaskWorker } from '../../../workers/workerTask'
import { useSceneGltfImport } from './useSceneGltfImport'

function source(): GltfChosenFile {
  const bytes = encodeSceneGlb(makeSceneGlbFixture(2, 1, 3, 2), { allowLosses: true }).bytes
  return {
    name: 'fox.glb',
    size: bytes.length,
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  }
}
function setup(options: Parameters<typeof useSceneGltfImport>[1] = {}) {
  const asset = animatedScene()
  let saves = 0
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    autosaveMs: 60_000,
    persistence: {
      save: async () => {
        saves++
      },
    },
  })
  const hook = renderHook((props) => useSceneGltfImport(props.editor, props.options), {
    wrapper: StrictMode,
    initialProps: { editor, options },
  })
  return {
    asset,
    editor,
    hook,
    saves: () => saves,
    close: () => {
      hook.unmount()
      editor.getState().dispose()
    },
  }
}
async function ready(hook: ReturnType<typeof setup>['hook']) {
  await act(async () => {
    await hook.result.current.choose([source()])
  })
  expect(hook.result.current.view.sceneIndex).toBe('unselected')
  act(() => hook.result.current.setScene(0))
  await act(async () => {
    await hook.result.current.prepare()
  })
  expect(hook.result.current.view.stage.kind).toBe('ready')
}

test('real import requires a scene and fresh consent; one commit preserves identity and supports undo/redo', async () => {
  const { asset, editor, hook, saves, close } = setup()
  try {
    await act(async () => {
      await hook.result.current.choose([source()])
    })
    await act(async () => {
      await hook.result.current.prepare()
    })
    expect(hook.result.current.view.stage.kind).toBe('choose')
    expect(editor.getState().asset).toBe(asset)
    act(() => hook.result.current.setScene(0))
    await act(async () => {
      await hook.result.current.prepare()
    })
    const stage = hook.result.current.view.stage
    if (stage.kind !== 'ready') throw new Error('Expected real worker review')
    expect(editor.getState().contentRevision).toBe(0)
    expect(saves()).toBe(0)
    act(() => expect(hook.result.current.confirm()).toBe(false))
    act(() => hook.result.current.accept(true))
    const stale = hook.result.current.confirm
    act(() => hook.result.current.accept(false))
    act(() => expect(stale()).toBe(false))
    act(() => hook.result.current.accept(true))
    act(() => editor.getState().setThumb('data:image/png;base64,thumb'))
    act(() => expect(hook.result.current.confirm()).toBe(true))
    const imported = editor.getState().asset
    expect(imported.nodes).toEqual(stage.result.document.nodes)
    expect(imported.images).toEqual(stage.result.document.images)
    expect(imported).toMatchObject({ id: asset.id, name: asset.name, createdAt: asset.createdAt })
    expect(imported.thumb).toBeUndefined()
    expect(editor.getState().contentRevision).toBe(1)
    expect(editor.getState().canUndo).toBe(true)
    act(() => expect(hook.result.current.confirm()).toBe(false))
    act(() => editor.getState().undo())
    expect(editor.getState().asset.nodes).toEqual(asset.nodes)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().redo())
    expect(editor.getState().asset.nodes).toEqual(imported.nodes)
    expect(editor.getState().asset.images).toEqual(imported.images)
    expect(saves()).toBe(0)
  } finally {
    close()
  }
})

test('options, scene, edits, undo, blur and close revoke an accepted result and captured confirmations', async () => {
  const { editor, hook, close } = setup()
  try {
    for (const invalidate of [
      () => hook.result.current.setOptions({ animations: { loop: true } }),
      () => hook.result.current.setScene(0),
      () => {
        editor.getState().commit({ ...editor.getState().asset, name: 'Outra' })
        editor.getState().undo()
      },
      () => window.dispatchEvent(new Event('blur')),
      () => hook.result.current.cancel(),
    ]) {
      await ready(hook)
      act(() => hook.result.current.accept(true))
      const stale = hook.result.current.confirm
      act(invalidate)
      expect(hook.result.current.view.stage.kind).toBe('choose')
      act(() => expect(stale()).toBe(false))
    }
    await ready(hook)
    act(() => hook.result.current.accept(true))
    const stale = hook.result.current
    hook.unmount()
    act(() => expect(stale.confirm()).toBe(false))
    await stale.prepare()
    await stale.choose([source()])
  } finally {
    close()
  }
})

test('deferred native IO is discarded on cancel, content edits, newer selection and unmount', async () => {
  const { editor, hook, close } = setup()
  try {
    for (const stop of [
      () => hook.result.current.cancel(),
      () => editor.getState().commit({ ...editor.getState().asset, name: 'Mudou' }),
      () => window.dispatchEvent(new Event('blur')),
    ]) {
      const pending = Promise.withResolvers<ArrayBuffer>()
      let work: Promise<void> | undefined
      act(() => {
        work = hook.result.current.choose([
          { name: 'slow.glb', size: 0, arrayBuffer: () => pending.promise },
        ])
        stop()
      })
      const stopped = hook.result.current.view
      await act(async () => {
        pending.resolve(new ArrayBuffer(0))
        await work
      })
      expect(hook.result.current.view).toBe(stopped)
    }
    const pending = Promise.withResolvers<ArrayBuffer>()
    let work: Promise<void> | undefined
    act(() => {
      work = hook.result.current.choose([
        { name: 'slow.glb', size: 0, arrayBuffer: () => pending.promise },
      ])
    })
    await ready(hook)
    const current = hook.result.current.view
    await act(async () => {
      pending.resolve(new ArrayBuffer(0))
      await work
    })
    expect(hook.result.current.view).toBe(current)
    const last = Promise.withResolvers<ArrayBuffer>()
    act(() => {
      work = hook.result.current.choose([
        { name: 'closed.glb', size: 0, arrayBuffer: () => last.promise },
      ])
    })
    hook.unmount()
    last.resolve(new ArrayBuffer(0))
    await work
  } finally {
    close()
  }
})

test('the latest host pose guard is read at confirmation and reentrant host changes cannot adopt stale content', async () => {
  const { editor, hook, close } = setup({ canAdopt: () => true })
  try {
    await ready(hook)
    act(() => hook.result.current.accept(true))
    const beforeGuardChange = hook.result.current.confirm
    hook.rerender({ editor, options: { canAdopt: () => false } })
    act(() => expect(beforeGuardChange()).toBe(false))
    expect(hook.result.current.view.stage).toMatchObject({ kind: 'ready', error: copy.pendingPose })
    expect(editor.getState().contentRevision).toBe(0)
    hook.rerender({
      editor,
      options: {
        canAdopt: () => {
          editor.getState().commit({ ...editor.getState().asset, name: 'Escolha mais recente' })
          return true
        },
      },
    })
    act(() => expect(hook.result.current.confirm()).toBe(false))
    expect(editor.getState().asset.name).toBe('Escolha mais recente')
    expect(hook.result.current.view.stage.kind).toBe('choose')
    expect(editor.getState().contentRevision).toBe(1)
  } finally {
    close()
  }
})

test('changing editor instance with the same id resets the session and rejects every old callback', async () => {
  const { asset, editor, hook, close } = setup(),
    other = createDocumentEditorStore({
      asset: structuredClone(asset),
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
    })
  try {
    await ready(hook)
    act(() => hook.result.current.accept(true))
    const old = hook.result.current
    hook.rerender({ editor: other, options: {} })
    await ready(hook)
    const current = hook.result.current.view
    await act(async () => {
      old.cancel()
      old.accept(true)
      old.setScene(0)
      old.setOptions({ skinWeights: 'normalize' })
      expect(old.confirm()).toBe(false)
      await old.prepare()
      await old.inspect()
      await old.choose([source()])
    })
    expect(hook.result.current.view).toBe(current)
    expect(editor.getState().asset).toBe(asset)
    expect(other.getState().contentRevision).toBe(0)
  } finally {
    close()
    other.getState().dispose()
  }
})

test('hidden tabs do not read files; worker construction cancellation terminates before posting', async () => {
  let posts = 0,
    stops = 0,
    reads = 0
  const events = new EventTarget(),
    worker: TaskWorker = {
      postMessage: () => {
        posts++
      },
      terminate: () => {
        stops++
      },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    }
  const { editor, hook, close } = setup({
      createWorker: () => {
        hook.result.current.cancel()
        return worker
      },
    }),
    descriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  try {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    await act(async () => {
      await hook.result.current.choose([
        {
          name: 'hidden.glb',
          size: 0,
          arrayBuffer: async () => {
            reads++
            return new ArrayBuffer(0)
          },
        },
      ])
    })
    expect(reads).toBe(0)
    expect(hook.result.current.view.stage).toEqual({ kind: 'choose', message: copy.interrupted })
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    await act(async () => {
      await hook.result.current.choose([source()])
    })
    expect(posts).toBe(0)
    // Cancelled before it said anything: the stop waits for its hello, never for a loading module.
    expect(stops).toBe(0)
    events.dispatchEvent(new MessageEvent('message', { data: WORKER_LOADED_MESSAGE }))
    expect(stops).toBe(1)
    expect(hook.result.current.view.stage).toEqual({ kind: 'choose', message: copy.cancelled })
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
    else Reflect.deleteProperty(document, 'hidden')
    close()
  }
})
