import { expect, spyOn, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { encodeSceneGlb } from '../../../export/sceneGlb'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { useSceneGlbExport } from './useSceneGlbExport'

function setup(hidden = false) {
  const asset = animatedScene()
  asset.nodes[1]!.hidden = hidden
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
  const view = renderHook((owner) => useSceneGlbExport(owner), {
    wrapper: StrictMode,
    initialProps: editor,
  })
  return { asset, editor, view, saves: () => saves }
}
test('hidden tabs discard a ready result and cannot start another worker until visible', async () => {
  const { editor, view } = setup()
  const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  try {
    await act(async () => {
      await view.result.current.prepare(false)
    })
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(view.result.current.state).toEqual({
      status: 'idle',
      message: COPY.scene.glbExport.interrupted,
    })
    await act(async () => {
      await view.result.current.prepare(false)
    })
    expect(view.result.current.state.status).toBe('idle')
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    await act(async () => {
      await view.result.current.prepare(false)
    })
    expect(view.result.current.state.status).toBe('ready')
  } finally {
    if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
    else Reflect.deleteProperty(document, 'hidden')
    view.unmount()
    editor.getState().dispose()
  }
})
test('unavailable workers produce a recoverable error without falling back to main-thread encoding', async () => {
  const asset = animatedScene()
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
  })
  let attempts = 0
  const view = renderHook(
    () =>
      useSceneGlbExport(editor, () => {
        attempts++
        throw new Error('Worker unavailable')
      }),
    { wrapper: StrictMode },
  )
  try {
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        await view.result.current.prepare(false)
      })
      expect(view.result.current.state).toEqual({
        status: 'error',
        message: COPY.scene.glbExport.failed,
      })
    }
    expect(attempts).toBe(2)
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
test('export only downloads after an explicit click, matches real encoder, and writes no editor history or persistence', async () => {
  const { asset, editor, view, saves } = setup()
  const blobs: Blob[] = [],
    names: string[] = []
  const url = spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob)
    return 'blob:test'
  })
  const anchor = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download)
  })
  try {
    await act(async () => {
      await view.result.current.prepare(false)
    })
    expect(view.result.current.state.status).toBe('ready')
    expect(blobs.length).toBe(0)
    act(view.result.current.download)
    expect(view.result.current.state.status).toBe('downloaded')
    expect(names).toEqual([`${asset.name}.glb`])
    expect(blobs[0]!.type).toBe('model/gltf-binary')
    expect(new Uint8Array(await blobs[0]!.arrayBuffer())).toEqual(encodeSceneGlb(asset).bytes)
    act(view.result.current.download)
    expect(blobs.length).toBe(1)
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().canUndo).toBe(false)
    expect(editor.getState().contentRevision).toBe(0)
    expect(saves()).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
    anchor.mockRestore()
  }
})
test('loss consent is explicit, revocable, and bound to the exact result; thumbnails do not invalidate it', async () => {
  const { editor, view } = setup(true)
  const url = spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  const anchor = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  try {
    await act(async () => {
      await view.result.current.prepare(false)
    })
    act(view.result.current.download)
    expect(url).toHaveBeenCalledTimes(0)
    act(() => view.result.current.accept(true))
    const staleDownload = view.result.current.download
    act(() => view.result.current.accept(false))
    act(staleDownload)
    expect(url).toHaveBeenCalledTimes(0)
    act(() => view.result.current.accept(true))
    act(() => editor.getState().setThumb('data:image/png;base64,thumb'))
    expect(view.result.current.state.status).toBe('ready')
    act(view.result.current.download)
    expect(url).toHaveBeenCalledTimes(1)
    await act(async () => {
      await view.result.current.prepare(false)
    })
    act(view.result.current.download)
    expect(url).toHaveBeenCalledTimes(1)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
    anchor.mockRestore()
  }
})
test('an edit, undo, restart, blur and unmount invalidate prepared bytes and captured confirmations', async () => {
  const { editor, view } = setup(true)
  const url = spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  try {
    await act(async () => {
      await view.result.current.prepare(false)
    })
    act(() => view.result.current.accept(true))
    const oldDownload = view.result.current.download
    act(() => editor.getState().commit({ ...editor.getState().asset, name: 'Nova criação' }))
    expect(view.result.current.state).toEqual({
      status: 'idle',
      message: COPY.scene.glbExport.changed,
    })
    act(() => editor.getState().undo())
    act(oldDownload)
    await act(async () => {
      await view.result.current.prepare(false)
    })
    act(oldDownload)
    act(() => view.result.current.accept(true))
    const afterRestart = view.result.current.download
    act(() => window.dispatchEvent(new Event('blur')))
    expect(view.result.current.state).toEqual({
      status: 'idle',
      message: COPY.scene.glbExport.interrupted,
    })
    act(afterRestart)
    await act(async () => {
      await view.result.current.prepare(false)
    })
    act(() => view.result.current.accept(true))
    const afterClose = view.result.current.download,
      oldPrepare = view.result.current.prepare
    view.unmount()
    act(afterClose)
    await oldPrepare(false)
    expect(url).toHaveBeenCalledTimes(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
  }
})
test('pending real worker is discarded on cancel, content change and unmount, without stale errors/results', async () => {
  const { editor, view } = setup()
  try {
    for (const stop of [
      () => view.result.current.cancel(),
      () => editor.getState().commit({ ...editor.getState().asset, name: 'Mudou' }),
      () => window.dispatchEvent(new Event('blur')),
    ]) {
      let pending: Promise<void> | undefined
      act(() => {
        pending = view.result.current.prepare(false)
        stop()
      })
      await act(async () => {
        await pending
      })
      expect(view.result.current.state.status).toBe('idle')
    }
    let pending: Promise<void> | undefined
    act(() => {
      pending = view.result.current.prepare(false)
    })
    view.unmount()
    await pending
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
test('switching stores for the same document id resets the session and rejects callbacks from the previous store', async () => {
  const { editor, view, asset } = setup()
  const other = createDocumentEditorStore({
    asset: structuredClone(asset),
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
  })
  const url = spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  try {
    await act(async () => {
      await view.result.current.prepare(false)
    })
    const oldDownload = view.result.current.download,
      oldPrepare = view.result.current.prepare
    view.rerender(other)
    expect(view.result.current.state.status).toBe('idle')
    act(oldDownload)
    await oldPrepare(false)
    expect(view.result.current.state.status).toBe('idle')
    expect(url).toHaveBeenCalledTimes(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
    other.getState().dispose()
    url.mockRestore()
  }
})
test('download failures retain the current report and allow explicit retry without rebuilding or changing the document', async () => {
  const { editor, view, asset } = setup()
  const url = spyOn(URL, 'createObjectURL').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  const anchor = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  try {
    await act(async () => {
      await view.result.current.prepare(false)
    })
    act(view.result.current.download)
    expect(view.result.current.state.status).toBe('ready')
    expect(view.result.current.state).toMatchObject({ error: COPY.scene.glbExport.downloadFailed })
    url.mockReturnValue('blob:test')
    act(view.result.current.download)
    expect(view.result.current.state.status).toBe('downloaded')
    expect(editor.getState().asset).toBe(asset)
  } finally {
    view.unmount()
    editor.getState().dispose()
    url.mockRestore()
    anchor.mockRestore()
  }
})
