import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import type { MoldaSceneDocument } from '../../../scene/document'
import { identityMatrix } from '../../../scene/matrix'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { getMoldaStorageNamespace, setMoldaStorageNamespace } from '../../../state/persistence'
import { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import { animatedScene } from '../../../testing/sceneAnimation'
import { scenePoseRecoveryRevision, useScenePoseRecovery } from './useScenePoseRecovery'

afterEach(() => {
  cleanup()
  localStorage.clear()
  setMoldaStorageNamespace('')
})

function setup(
  source = animatedScene(),
  save: (document: MoldaSceneDocument) => Promise<void> = async () => {},
) {
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save },
    autosaveMs: 60_000,
  })
  const player = new SceneAnimationPlayer({ now: () => 0, request: () => 1, cancel: () => {} })
  player.setClip(source, 'clip')
  const gesture = new SceneAnimationPoseGesture(editor, player)
  const disconnect = gesture.connect()
  const hook = renderHook(() => useScenePoseRecovery(editor, gesture), { wrapper: StrictMode })
  return {
    editor,
    player,
    gesture,
    hook,
    key: `molda:pose-draft:${JSON.stringify([getMoldaStorageNamespace(), source.id])}`,
    close() {
      hook.unmount()
      disconnect()
      player.setClip(null, null)
      editor.getState().dispose()
    },
  }
}
function draft(f: ReturnType<typeof setup>) {
  act(() => {
    const delta = identityMatrix()
    delta[12] = 2
    expect(f.gesture.begin(['body'])).toBe(true)
    expect(f.gesture.preview(delta)).toBe(true)
    f.gesture.end(true)
  })
}

test('rascunhos de poses ficam separados por perfil mesmo quando o modelo tem o mesmo id', async () => {
  setMoldaStorageNamespace('crianca-a')
  const first = setup()
  draft(first)
  await waitFor(() => expect(localStorage.getItem(first.key) !== null).toBe(true))
  first.close()
  setMoldaStorageNamespace('crianca-b')
  const second = setup()
  try {
    await act(async () => {
      await Bun.sleep(20)
    })
    expect(second.hook.result.current.available === null).toBe(true)
    expect(localStorage.getItem(first.key) !== null).toBe(true)
    expect(localStorage.getItem(second.key) === null).toBe(true)
  } finally {
    second.close()
  }
})

test('reload restores completed pose across thumbnail stamps without saving the pose itself', async () => {
  const first = setup()
  draft(first)
  await waitFor(() => expect(localStorage.getItem(first.key) !== null).toBe(true))
  act(() => first.editor.getState().setThumb('data:image/png;base64,aGVsbG8='))
  await act(() => first.editor.getState().flush())
  const saved = first.editor.getState().savedAsset
  const expected = first.gesture.getSnapshot().pose!.worldMatrices
  expect(JSON.parse(localStorage.getItem(first.key)!).revision).toBe(
    await scenePoseRecoveryRevision(saved),
  )
  first.close()
  expect(localStorage.getItem(first.key) !== null).toBe(true)
  const next = setup(saved)
  try {
    await waitFor(() => expect(next.hook.result.current.available !== null).toBe(true))
    act(() => expect(next.hook.result.current.restore()).toBe(true))
    expect(next.gesture.getSnapshot().pose!.worldMatrices).toEqual(expected)
    expect(next.editor.getState().content).toBe(saved)
    expect(next.editor.getState().canUndo).toBe(false)
    act(() => expect(next.gesture.record()).toBe(true))
    await waitFor(() => expect(localStorage.getItem(next.key)).toBeNull())
    expect(next.editor.getState().canUndo).toBe(true)
  } finally {
    next.close()
  }
})

test('recovery waits for its authoring base to reach persistence', async () => {
  let release!: () => void
  const saving = new Promise<void>((resolve) => {
    release = resolve
  })
  const f = setup(animatedScene(), () => saving)
  try {
    act(() => {
      f.editor.getState().commit({ ...f.editor.getState().content, name: 'Nova base' })
      f.player.setClip(f.editor.getState().content, 'clip')
    })
    draft(f)
    await waitFor(() => expect(f.editor.getState().saveState).toBe('saving'))
    expect(localStorage.getItem(f.key)).toBeNull()
    await act(async () => {
      release()
      await saving
    })
    await waitFor(() => expect(localStorage.getItem(f.key) !== null).toBe(true))
    expect(f.editor.getState().savedAsset.name).toBe('Nova base')
    expect(f.gesture.getSnapshot().pending).toBe(true)
  } finally {
    release()
    f.close()
  }
})

test('a failed base save keeps the live draft and explains that recovery was not stored', async () => {
  let fail = true
  const f = setup(animatedScene(), async () => {
    if (fail) throw new Error('offline storage')
  })
  try {
    act(() => {
      f.editor.getState().commit({ ...f.editor.getState().content, name: 'Unsaved' })
      f.player.setClip(f.editor.getState().content, 'clip')
    })
    draft(f)
    await waitFor(() => expect(f.hook.result.current.error !== null).toBe(true))
    expect(localStorage.getItem(f.key)).toBeNull()
    expect(f.gesture.getSnapshot().pending).toBe(true)
    fail = false
    await act(() => f.editor.getState().flush())
    await waitFor(() => expect(localStorage.getItem(f.key) !== null).toBe(true))
    expect(f.hook.result.current.error).toBeNull()
  } finally {
    f.close()
  }
})

test('recovery never overlays a different authoring revision', async () => {
  const first = setup()
  draft(first)
  await waitFor(() => expect(localStorage.getItem(first.key) !== null).toBe(true))
  const different = { ...first.editor.getState().content, name: 'Changed elsewhere' }
  first.close()
  const next = setup(different)
  try {
    await waitFor(() => expect(localStorage.getItem(next.key)).toBeNull())
    expect(next.hook.result.current.available).toBeNull()
    expect(next.gesture.getSnapshot().pending).toBe(false)
    expect(next.editor.getState().content).toBe(different)
  } finally {
    next.close()
  }
})
