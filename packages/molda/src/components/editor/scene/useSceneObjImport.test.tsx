import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { OBJ_IMPORT_COPY as copy } from '../../../core/objImportCopy'
import { structuredBytes } from '../../../core/structuredBytes'
import type { ObjChosenFile } from '../../../import/objLocalBundle'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { objImportFixture } from '../../../testing/objImportFixture'
import { animatedScene } from '../../../testing/sceneAnimation'
import { WORKER_LOADED_MESSAGE } from '../../../workers/workerHandshake'
import { useSceneObjImport } from './useSceneObjImport'

function chosen() {
  const input = objImportFixture()
  return {
    input,
    files: [{ path: input.entryPath, bytes: input.bytes }, ...input.files].map((file) => ({
      name: file.path.split('/').at(-1)!,
      webkitRelativePath: file.path,
      size: file.bytes.length,
      arrayBuffer: async () => new Uint8Array(file.bytes).buffer,
    })),
  }
}
function setup(options: Parameters<typeof useSceneObjImport>[1] = {}) {
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
    }),
    hook = renderHook((props) => useSceneObjImport(props.editor, props.options), {
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
  const fixture = chosen()
  await act(async () => {
    await hook.result.current.choose(fixture.files)
  })
  expect(hook.result.current.view.stage.kind).toBe('choose')
  act(() => hook.result.current.setOptions(fixture.input.options))
  await act(async () => {
    await hook.result.current.prepare()
  })
  expect(hook.result.current.view.stage.kind).toBe('ready')
}
test('OBJ selection waits for Prepare, real worker review waits for current consent, replacement is one undoable commit', async () => {
  const { asset, editor, hook, saves, close } = setup()
  try {
    await ready(hook)
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().contentRevision).toBe(0)
    expect(saves()).toBe(0)
    act(() => expect(hook.result.current.confirm()).toBe(false))
    act(() => hook.result.current.accept(true))
    const stale = hook.result.current.confirm
    act(() => hook.result.current.accept(false))
    act(() => expect(stale()).toBe(false))
    act(() => hook.result.current.accept(true))
    act(() => editor.getState().setThumb('data:image/png;base64,old'))
    act(() => expect(hook.result.current.confirm()).toBe(true))
    const imported = editor.getState().asset
    expect(imported).toMatchObject({ id: asset.id, name: asset.name, createdAt: asset.createdAt })
    expect(imported.thumb).toBeUndefined()
    expect(imported.images.length).toBeGreaterThan(0)
    expect(editor.getState().contentRevision).toBe(1)
    act(() => expect(hook.result.current.confirm()).toBe(false))
    act(() => editor.getState().undo())
    expect(editor.getState().asset.nodes).toEqual(asset.nodes)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().redo())
    expect(editor.getState().asset.images).toEqual(imported.images)
    expect(saves()).toBe(0)
  } finally {
    close()
  }
})
test('OBJ options, entry choice, edits, undo, blur and close revoke accepted reviews and captured callbacks', async () => {
  const { editor, hook, close } = setup()
  try {
    for (const invalidate of [
      () =>
        hook.result.current.setOptions({
          ...hook.result.current.view.options,
          images: { ...hook.result.current.view.options.images, doubleSided: true },
        }),
      () => hook.result.current.setEntry(hook.result.current.view.entryPath!),
      () => {
        editor.getState().commit({ ...editor.getState().asset, name: 'Other' })
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
    await stale.choose(chosen().files)
  } finally {
    close()
  }
})
test('OBJ deferred file IO is discarded on cancel, edits, newer selection and unmount', async () => {
  const { editor, hook, close } = setup()
  try {
    for (const stop of [
      () => hook.result.current.cancel(),
      () => editor.getState().commit({ ...editor.getState().asset, name: 'Changed' }),
      () => window.dispatchEvent(new Event('blur')),
    ]) {
      const pending = Promise.withResolvers<ArrayBuffer>()
      let work: Promise<void> | undefined
      act(() => {
        work = hook.result.current.choose([
          { name: 'slow.obj', size: 0, arrayBuffer: () => pending.promise },
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
        { name: 'slow.obj', size: 0, arrayBuffer: () => pending.promise },
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
        { name: 'closed.obj', size: 0, arrayBuffer: () => last.promise },
      ])
    })
    hook.unmount()
    last.resolve(new ArrayBuffer(0))
    await work
  } finally {
    close()
  }
})
test('OBJ latest pose guard and reentrant host changes cannot confirm stale content', async () => {
  const { editor, hook, close } = setup({ canAdopt: () => true })
  try {
    await ready(hook)
    act(() => hook.result.current.accept(true))
    const oldConfirm = hook.result.current.confirm
    hook.rerender({ editor, options: { canAdopt: () => false } })
    act(() => expect(oldConfirm()).toBe(false))
    expect(hook.result.current.view.stage).toMatchObject({ kind: 'ready', error: copy.pendingPose })
    hook.rerender({
      editor,
      options: {
        canAdopt: () => {
          editor.getState().commit({ ...editor.getState().asset, name: 'Latest' })
          return true
        },
      },
    })
    act(() => expect(hook.result.current.confirm()).toBe(false))
    expect(editor.getState().asset.name).toBe('Latest')
    expect(editor.getState().contentRevision).toBe(1)
  } finally {
    close()
  }
})
test('OBJ sessions reject old callbacks when the editor instance changes, even for the same document id', async () => {
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
      old.setEntry(current.entryPath!)
      old.setOptions(current.options)
      expect(old.confirm()).toBe(false)
      await old.prepare()
      await old.choose(chosen().files)
    })
    expect(hook.result.current.view).toBe(current)
    expect(editor.getState().asset).toBe(asset)
    expect(other.getState().contentRevision).toBe(0)
  } finally {
    close()
    other.getState().dispose()
  }
})
test('OBJ missing companions can be added without copying previous session files or accepting old review', async () => {
  const { hook, editor, close } = setup(),
    fixture = chosen()
  try {
    await act(async () => {
      await hook.result.current.choose(fixture.files.slice(0, 1))
    })
    const firstBytes = hook.result.current.view.bundle!.files[0]!.bytes
    act(() => hook.result.current.setOptions(fixture.input.options))
    await act(async () => {
      await hook.result.current.prepare()
    })
    expect(hook.result.current.view.stage).toEqual({
      kind: 'missing',
      paths: ['project/m/a.mtl', 'project/m/empty.mtl'],
    })
    await act(async () => {
      await hook.result.current.choose(fixture.files.slice(1), true)
    })
    expect(hook.result.current.view.bundle!.files[0]!.bytes).toBe(firstBytes)
    expect(hook.result.current.view.options.materials.libraryMode).toBe('all')
    expect(hook.result.current.view.stage.kind).toBe('choose')
    await act(async () => {
      await hook.result.current.prepare()
    })
    expect(hook.result.current.view.stage.kind).toBe('ready')
    expect(editor.getState().contentRevision).toBe(0)
  } finally {
    close()
  }
})
test('hidden OBJ sessions do not read files, and cancellation during worker construction prevents posting', async () => {
  let reads = 0,
    posts = 0,
    stops = 0
  const events = new EventTarget(),
    descriptor = Object.getOwnPropertyDescriptor(document, 'hidden'),
    { hook, close } = setup({
      createWorker: () => {
        hook.result.current.cancel()
        return {
          postMessage: () => {
            posts++
          },
          terminate: () => {
            stops++
          },
          addEventListener: events.addEventListener.bind(events),
          removeEventListener: events.removeEventListener.bind(events),
        }
      },
    })
  try {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    const file: ObjChosenFile = {
      name: 'hidden.obj',
      size: 0,
      arrayBuffer: async () => {
        reads++
        return new ArrayBuffer(0)
      },
    }
    await act(async () => {
      await hook.result.current.choose([file])
    })
    expect(reads).toBe(0)
    expect(hook.result.current.view.stage).toEqual({ kind: 'choose', message: copy.interrupted })
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    await act(async () => {
      await hook.result.current.choose([file])
      await hook.result.current.prepare()
    })
    expect(posts).toBe(0)
    // Cancelled before it said anything: the stop waits for its hello, never for a loading module.
    expect(stops).toBe(0)
    events.dispatchEvent(new MessageEvent('message', { data: WORKER_LOADED_MESSAGE }))
    expect(stops).toBe(1)
    expect(hook.result.current.view.stage).toEqual({ kind: 'choose', message: copy.cancelled })
  } finally {
    if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
    else Reflect.deleteProperty(document, 'hidden')
    close()
  }
})
