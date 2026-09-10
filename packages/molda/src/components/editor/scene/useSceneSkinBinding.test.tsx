import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import type { MoldaSceneDocument } from '../../../scene/document'
import { addSceneSkinJoint, createSceneSkin } from '../../../scene/skinCommands'
import { prepareSceneSkinSuggestion, suggestSceneSkinWeights } from '../../../scene/skinSuggestion'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeSceneSkinFixture } from '../../../testing/sceneSkin'
import type { TaskWorker } from '../../../workers/workerTask'
import { useSceneSkinBinding } from './useSceneSkinBinding'

function setup(asset = makeSceneSkinFixture().document, createWorker?: () => TaskWorker) {
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
    view = renderHook(({ editor, nodeId }) => useSceneSkinBinding(editor, nodeId, createWorker), {
      wrapper: StrictMode,
      initialProps: { editor, nodeId: 'part-0' },
    })
  const choose = () =>
    act(() => {
      view.result.current.toggleJoint('upper')
      view.result.current.toggleJoint('lower')
    })
  const prepare = async () => {
    await act(async () => {
      await view.result.current.prepare()
    })
  }
  const dispose = () => {
    view.unmount()
    editor.getState().dispose()
  }
  return { asset, editor, view, choose, prepare, dispose, saves: () => saves }
}

test('joint addition/removal have independent read-only reviews and one owned undo each', () => {
  const fixture = makeSceneSkinFixture(),
    { id, ...input } = fixture.input,
    source = createSceneSkin(fixture.document, input, () => id),
    { editor, view, dispose, saves } = setup(source)
  try {
    act(() => view.result.current.reviewJoint('addJoint', 'rig'))
    expect(view.result.current.state.status).toBe('ready')
    expect(editor.getState().asset).toBe(source)
    expect(saves()).toBe(0)
    const add = view.result.current.apply
    act(() => {
      expect(add()).toBe(true)
      expect(add()).toBe(false)
    })
    const added = editor.getState().asset
    expect(added.skins![0]!.weights).toBe(source.skins![0]!.weights)
    expect(added.skins![0]!.joints.map((joint) => joint.nodeId)).toEqual(['upper', 'lower', 'rig'])
    expect(editor.getState().contentRevision).toBe(1)
    act(() => editor.getState().undo())
    expect(editor.getState().asset.skins).toEqual(source.skins)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().redo())
    act(() => view.result.current.reviewJoint('removeJoint', 'rig'))
    const remove = view.result.current.apply,
      current = editor.getState().asset
    expect(view.result.current.state.status).toBe('ready')
    expect(editor.getState().asset).toBe(current)
    act(() => {
      expect(remove()).toBe(true)
      expect(remove()).toBe(false)
    })
    expect(editor.getState().asset.skins).toEqual(source.skins)
    expect(editor.getState().asset.nodes).toBe(current.nodes)
    act(() => editor.getState().undo())
    expect(editor.getState().asset.skins).toEqual(added.skins)
  } finally {
    dispose()
  }
})

test('joint reviews reject used bones and cannot cross content changes, context loss or closed sessions', () => {
  const fixture = makeSceneSkinFixture(),
    { id, ...input } = fixture.input,
    source = addSceneSkinJoint(
      createSceneSkin(fixture.document, input, () => id),
      'skin',
      'rig',
    ),
    { editor, view, dispose } = setup(source)
  try {
    act(() => view.result.current.reviewJoint('removeJoint', 'upper'))
    expect(view.result.current.state).toEqual({
      status: 'error',
      message: COPY.scene.skinBinding.jointInUse(3),
    })
    for (const interrupt of [
      () => editor.getState().commit({ ...editor.getState().asset, name: 'Revisão nova' }),
      () => document.dispatchEvent(new Event('webglcontextlost')),
      () => window.dispatchEvent(new Event('blur')),
      () => view.result.current.cancel(),
      () => view.unmount(),
    ]) {
      act(() => view.result.current.reviewJoint('removeJoint', 'rig'))
      const apply = view.result.current.apply
      act(interrupt)
      const current = editor.getState().asset
      act(() => expect(apply()).toBe(false))
      expect(editor.getState().asset).toBe(current)
      expect(current.skins).toBe(source.skins)
    }
  } finally {
    dispose()
  }
})

test('real worker review has no writes; confirmation owns exact weights, keeps latest thumbnail and is one undo/redo', async () => {
  const { asset, editor, view, choose, prepare, dispose, saves } = setup(),
    before = structuredClone(asset)
  try {
    choose()
    await prepare()
    const ready = view.result.current.state
    if (ready.status !== 'ready' || ready.change.kind !== 'create')
      throw new Error('Expected suggestion')
    expect(ready.change.result).toEqual(
      suggestSceneSkinWeights(
        prepareSceneSkinSuggestion(asset, {
          nodeId: 'part-0',
          jointIds: ['upper', 'lower'],
          method: 'segments',
        }),
      ),
    )
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().contentRevision).toBe(0)
    expect(editor.getState().canUndo).toBe(false)
    expect(saves()).toBe(0)
    act(() => editor.getState().setThumb('data:image/png;base64,thumb'))
    expect(view.result.current.state).toBe(ready)
    const apply = view.result.current.apply
    act(() => {
      expect(apply()).toBe(true)
      expect(apply()).toBe(false)
    })
    const linked = editor.getState().asset
    expect(linked.thumb).toBe('data:image/png;base64,thumb')
    expect(linked.skins?.[0]?.weights).toEqual(ready.change.result.weights)
    expect(linked.skins?.[0]?.weights).not.toBe(ready.change.result.weights)
    expect(linked.geometries).toBe(asset.geometries)
    expect(linked.nodes).toBe(asset.nodes)
    act(() => editor.getState().undo())
    expect(editor.getState().asset.skins).toBeUndefined()
    expect(editor.getState().canUndo).toBe(false)
    act(() => {
      expect(apply()).toBe(false)
      editor.getState().redo()
    })
    expect(editor.getState().asset.skins).toEqual(linked.skins)
    expect(asset).toEqual(before)
  } finally {
    dispose()
  }
})

test('parameter changes revoke results and captured preparation/confirmation without accepting an old choice again', async () => {
  const { editor, view, choose, prepare, dispose } = setup()
  try {
    choose()
    await prepare()
    const oldPrepare = view.result.current.prepare,
      oldApply = view.result.current.apply
    act(() => view.result.current.setMethod('rigid'))
    expect(view.result.current.state.status).toBe('idle')
    await act(async () => {
      await oldPrepare()
      expect(oldApply()).toBe(false)
    })
    expect(view.result.current.state.status).toBe('idle')
    await prepare()
    const result = view.result.current.state
    if (result.status !== 'ready' || result.change.kind !== 'create')
      throw new Error('Expected suggestion')
    expect(result.change.result.stats.maximumInfluences).toBe(1)
    act(() => view.result.current.toggleJoint('upper'))
    expect(view.result.current.state.status).toBe('idle')
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    dispose()
  }
})

test('content changes, undo, blur, cancellation and unmount revoke reviews and stale callbacks', async () => {
  const { asset, editor, view, choose, prepare, dispose } = setup()
  try {
    choose()
    for (const stop of [
      () => view.result.current.cancel(),
      () => window.dispatchEvent(new Event('blur')),
      () => {
        editor.getState().commit({ ...asset, name: 'Mudou' })
        editor.getState().undo()
      },
    ]) {
      await prepare()
      const apply = view.result.current.apply
      act(stop)
      act(() => expect(apply()).toBe(false))
      expect(view.result.current.state.status).toBe('idle')
      expect(editor.getState().asset.skins).toBeUndefined()
    }
    await prepare()
    const apply = view.result.current.apply,
      start = view.result.current.prepare
    view.unmount()
    expect(apply()).toBe(false)
    await start()
    expect(editor.getState().asset.skins).toBeUndefined()
  } finally {
    dispose()
  }
})

test('in-flight real workers are cancelled on parameter, node, revision, editor and unmount changes', async () => {
  for (const change of ['method', 'node', 'revision', 'editor', 'unmount'] as const) {
    const current = setup(),
      replacement = setup()
    try {
      current.choose()
      let pending: Promise<void> | undefined
      act(() => {
        pending = current.view.result.current.prepare()
        expect(current.view.result.current.state.status).not.toBe('ready')
        if (change === 'method') current.view.result.current.setMethod('rigid')
        if (change === 'revision')
          current.editor.getState().commit({ ...current.asset, name: 'Mudou' })
      })
      if (change === 'node') current.view.rerender({ editor: current.editor, nodeId: 'upper' })
      if (change === 'editor')
        current.view.rerender({ editor: replacement.editor, nodeId: 'part-0' })
      if (change === 'unmount') current.view.unmount()
      await act(async () => {
        await pending
      })
      if (change !== 'unmount') expect(current.view.result.current.state.status).toBe('idle')
      expect(current.editor.getState().asset.skins).toBeUndefined()
      expect(replacement.editor.getState().asset.skins).toBeUndefined()
    } finally {
      current.dispose()
      replacement.dispose()
    }
  }
})

test('hidden tabs revoke ready reviews and do not create a worker; unavailable workers return recoverable errors', async () => {
  const current = setup(),
    descriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  try {
    current.choose()
    await current.prepare()
    const apply = current.view.result.current.apply
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(apply()).toBe(false)
    await current.prepare()
    expect(current.view.result.current.state).toEqual({
      status: 'idle',
      message: COPY.scene.skinBinding.interrupted,
    })
  } finally {
    if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
    else Reflect.deleteProperty(document, 'hidden')
    current.dispose()
  }
  let attempts = 0
  const unavailable = setup(undefined, () => {
    attempts++
    throw new Error('Unavailable')
  })
  try {
    unavailable.choose()
    await unavailable.prepare()
    expect(attempts).toBe(1)
    expect(unavailable.view.result.current.state).toEqual({
      status: 'error',
      message: COPY.scene.skinBinding.failed,
    })
    expect(unavailable.editor.getState().canUndo).toBe(false)
  } finally {
    unavailable.dispose()
  }
})

test('rebind/remove require independent reviews, preserve source data and produce no history for an unchanged bind', () => {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    linked = createSceneSkin(document, input, () => id),
    current = setup(linked)
  try {
    act(() => current.view.result.current.review('rebind'))
    act(() => expect(current.view.result.current.apply()).toBe(true))
    expect(current.editor.getState().asset).toBe(linked)
    expect(current.editor.getState().canUndo).toBe(false)
    const moved: MoldaSceneDocument = {
      ...linked,
      nodes: linked.nodes.map((node) =>
        node.id === 'lower'
          ? {
              ...node,
              transform: {
                kind: 'trs',
                translation: [2, 3, 0],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
              },
            }
          : node,
      ),
    }
    act(() => current.editor.getState().commit(moved))
    const before = current.editor.getState().asset
    act(() => current.view.result.current.review('rebind'))
    expect(current.editor.getState().asset).toBe(before)
    act(() => expect(current.view.result.current.apply()).toBe(true))
    expect(current.editor.getState().asset.skins?.[0]?.joints).not.toEqual(
      before.skins?.[0]?.joints,
    )
    expect(current.editor.getState().asset.skins?.[0]?.weights).toBe(before.skins?.[0]?.weights)
    act(() => current.editor.getState().undo())
    expect(current.editor.getState().asset.skins).toEqual(before.skins)
    act(() => current.view.result.current.review('remove'))
    const remove = current.view.result.current.apply
    act(() => current.view.result.current.review('rebind'))
    act(() => expect(remove()).toBe(false))
    act(() => current.view.result.current.review('remove'))
    const source = current.editor.getState().asset
    act(() => expect(current.view.result.current.apply()).toBe(true))
    expect(current.editor.getState().asset.skins).toEqual([])
    expect(current.editor.getState().asset.nodes).toBe(source.nodes)
    expect(current.editor.getState().asset.geometries).toBe(source.geometries)
    expect(current.editor.getState().asset.animations).toBe(source.animations)
    act(() => current.editor.getState().undo())
    expect(current.editor.getState().asset.skins).toEqual(source.skins)
  } finally {
    current.dispose()
  }
})

test('invalid/locked targets fail without a commit and removed joint choices are pruned after a content edit', async () => {
  const current = setup()
  try {
    current.choose()
    act(() =>
      current.editor.getState().commit({
        ...current.asset,
        nodes: current.asset.nodes.map((node) =>
          node.id === 'rig' ? { ...node, locked: true } : node,
        ),
      }),
    )
    const source = current.editor.getState().asset,
      revision = current.editor.getState().contentRevision
    await current.prepare()
    expect(current.view.result.current.state.status).toBe('error')
    expect(current.editor.getState().asset).toBe(source)
    expect(current.editor.getState().contentRevision).toBe(revision)
    act(() =>
      current.editor.getState().commit({
        ...current.asset,
        nodes: current.asset.nodes.filter((node) => node.id !== 'lower'),
      }),
    )
    expect(current.view.result.current.settings.jointIds).toEqual(['upper'])
    await current.prepare()
    expect(current.view.result.current.state.status).toBe('ready')
  } finally {
    current.dispose()
  }
})

test('another creation with reused IDs resets choices and a singular joint cannot silently recapture a binding', async () => {
  const current = setup()
  try {
    current.choose()
    await current.prepare()
    const apply = current.view.result.current.apply
    act(() => current.editor.getState().replace({ ...current.asset, id: 'other-creation' }))
    expect(current.view.result.current.settings.jointIds).toEqual([])
    expect(apply()).toBe(false)
    expect(current.editor.getState().asset.skins).toBeUndefined()
  } finally {
    current.dispose()
  }
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    linked = createSceneSkin(document, input, () => id),
    collapsed: MoldaSceneDocument = {
      ...linked,
      nodes: linked.nodes.map((node) =>
        node.id === 'lower'
          ? {
              ...node,
              transform: {
                kind: 'trs',
                translation: [0, 1, 0],
                rotation: [0, 0, 0, 1],
                scale: [0, 1, 1],
              },
            }
          : node,
      ),
    },
    invalid = setup(collapsed)
  try {
    act(() => invalid.view.result.current.review('rebind'))
    act(() => expect(invalid.view.result.current.apply()).toBe(false))
    expect(invalid.view.result.current.state.status).toBe('error')
    expect(invalid.editor.getState().asset).toBe(collapsed)
    expect(invalid.editor.getState().canUndo).toBe(false)
  } finally {
    invalid.dispose()
  }
})
