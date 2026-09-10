import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import { bbmodelImportFixture } from '../../../testing/bbmodelImportFixture'
import { sceneImportEditor } from '../../../testing/sceneImportFixtures'
import { initialBbmodelImportOptions, useSceneBbmodelImport } from './useSceneBbmodelImport'

function chosen() {
  const input = bbmodelImportFixture()
  input.options.sourcePreference = 'prefer-files'
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
function setup(options: Parameters<typeof useSceneBbmodelImport>[1] = {}) {
  const editor = sceneImportEditor(),
    asset = editor.getState().asset,
    hook = renderHook((props) => useSceneBbmodelImport(props.editor, props.options), {
      wrapper: StrictMode,
      initialProps: { editor, options },
    })
  return {
    editor,
    asset,
    hook,
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
test('bbmodel visible defaults allow native appearance but no content omission', () => {
  const options = initialBbmodelImportOptions(),
    other = initialBbmodelImportOptions()
  expect(options).toMatchObject({
    sourcePreference: 'prefer-embedded',
    surfaces: {
      normals: 'molda-flat',
      renderOrder: 'reject',
      seamLabels: 'reject',
      cubeShade: 'reject',
      outsideFrameUvs: 'reject',
    },
    textureMaterials: {
      lighting: 'molda-standard',
      autoSides: 'double',
      repeatWrap: 'reject',
      renderModes: 'reject',
      pbrGroups: 'reject',
    },
    selection: { unlisted: 'reject', unsupportedNodes: 'reject' },
    geometry: { unsupportedFaces: 'reject' },
    remainder: { unmapped: 'reject', animations: 'reject' },
  })
  options.nodeMaterials.color[0] = 0
  expect(other.nodeMaterials.color).toEqual([1, 1, 1, 1])
})
test('bbmodel real worker prepares without mutation, requires current consent and commits one undoable replacement', async () => {
  const { editor, asset, hook, close } = setup()
  try {
    await ready(hook)
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().contentRevision).toBe(0)
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
    expect(imported.images[0]!.flipbook?.frames).toEqual([0, 1, 1])
    expect(editor.getState().contentRevision).toBe(1)
    act(() => expect(hook.result.current.confirm()).toBe(false))
    act(() => editor.getState().undo())
    expect(editor.getState().asset.nodes).toEqual(asset.nodes)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().redo())
    expect(editor.getState().asset.images).toEqual(imported.images)
  } finally {
    close()
  }
})
test('bbmodel options, entry, edits and undo, blur, cancellation and unmount revoke captured consent', async () => {
  const { editor, hook, close } = setup()
  try {
    for (const invalidate of [
      () => hook.result.current.setOptions(initialBbmodelImportOptions()),
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
    expect(stale.confirm()).toBe(false)
    await stale.prepare()
    await stale.choose(chosen().files)
  } finally {
    close()
  }
})
test('bbmodel missing companions append without recopying prior files or approving an old review', async () => {
  const { editor, hook, close } = setup(),
    fixture = chosen()
  try {
    await act(async () => {
      await hook.result.current.choose(fixture.files.slice(0, 1))
    })
    const original = hook.result.current.view.bundle!.files[0]!.bytes
    act(() => hook.result.current.setOptions(fixture.input.options))
    await act(async () => {
      await hook.result.current.prepare()
    })
    expect(hook.result.current.view.stage).toEqual({ kind: 'missing', paths: ['paint.png'] })
    await act(async () => {
      await hook.result.current.choose(fixture.files.slice(1), true)
    })
    expect(hook.result.current.view.bundle!.files[0]!.bytes).toBe(original)
    expect(hook.result.current.view.options.sourcePreference).toBe('prefer-files')
    await act(async () => {
      await hook.result.current.prepare()
    })
    expect(hook.result.current.view.stage).toMatchObject({ kind: 'ready', accepted: false })
    expect(editor.getState().contentRevision).toBe(0)
  } finally {
    close()
  }
})
test('bbmodel latest host gate and reentrant edit cannot adopt stale content', async () => {
  const { editor, hook, close } = setup({ canAdopt: () => true })
  try {
    await ready(hook)
    act(() => hook.result.current.accept(true))
    const captured = hook.result.current.confirm
    hook.rerender({ editor, options: { canAdopt: () => false } })
    act(() => expect(captured()).toBe(false))
    expect(hook.result.current.view.stage).toMatchObject({ kind: 'ready', error: copy.pendingPose })
    hook.rerender({
      editor,
      options: {
        canAdopt: () => {
          editor.getState().commit({ ...editor.getState().asset, name: 'Newest' })
          return true
        },
      },
    })
    act(() => expect(hook.result.current.confirm()).toBe(false))
    expect(editor.getState().asset.name).toBe('Newest')
    expect(editor.getState().contentRevision).toBe(1)
  } finally {
    close()
  }
})
test('bbmodel callbacks from a replaced editor cannot operate on the next editor with the same document id', async () => {
  const { editor, hook, close } = setup(),
    other = sceneImportEditor()
  try {
    expect(editor.getState().asset.id).toBe(other.getState().asset.id)
    await ready(hook)
    act(() => hook.result.current.accept(true))
    const old = hook.result.current
    hook.rerender({ editor: other, options: {} })
    await ready(hook)
    const current = hook.result.current.view
    await act(async () => {
      old.cancel()
      old.accept(true)
      old.setOptions(current.options)
      old.setEntry(current.entryPath!)
      expect(old.confirm()).toBe(false)
      await old.prepare()
      await old.choose(chosen().files)
    })
    expect(hook.result.current.view).toBe(current)
    expect(other.getState().contentRevision).toBe(0)
  } finally {
    close()
    other.getState().dispose()
  }
})
