import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { indexSceneDocument } from '../scene/documentIndex'
import { transformPoint } from '../scene/matrix'
import { createSceneSkin } from '../scene/skinCommands'
import type { SceneSkinPaintSettings } from '../scene/skinPaint'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { createDocumentEditorStore } from './editorStore'
import type { SceneSkinPaintPreview } from './sceneSkinPaintGesture'
import { createSceneSkinPaintSession } from './sceneSkinPaintSession'

function setup() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    source = createSceneSkin(document, input, () => id),
    editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      autosaveMs: 60000,
      persistence: { save: async () => undefined },
    }),
    session = createSceneSkinPaintSession(editor),
    mesh = source.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Mesh expected')
  const sample = {
      faceId: 'f_0_0',
      point: transformPoint(
        indexSceneDocument(source).scene.worldMatrices.get(input.nodeId)!,
        mesh.vertices.v_0_0!,
      ),
    },
    settings: SceneSkinPaintSettings = { mode: 'add', radius: 0.1, strength: 0.25 },
    scope = { skinId: 'skin', jointId: 'upper', settings, displayed: () => editor.getState().asset }
  return { editor, source, session, sample, scope }
}

test('an attachment owns settings, sends incremental previews and stable status, and commits one undo', () => {
  const { editor, source, session, sample, scope } = setup(),
    previews: Array<SceneSkinPaintPreview | null> = [],
    attachment = session.connect(scope, (preview) => previews.push(preview))
  let notifications = 0
  const unsubscribe = session.subscribe(() => notifications++)
  try {
    scope.settings.strength = 1
    expect(attachment.actions.begin(sample)).toBe(true)
    const status = session.getSnapshot(),
      count = notifications
    for (let i = 0; i < 100; i++) attachment.actions.move(sample)
    expect(session.getSnapshot()).toBe(status)
    expect(notifications).toBe(count)
    expect(previews[0]!.delta.size).toBe(0)
    expect(previews[1]!.delta.get('v_0_0')).toBe(0.25)
    expect(previews.at(-1)!.delta.size).toBe(0)
    expect(editor.getState().asset).toBe(source)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().setThumb('data:image/png;base64,new')
    attachment.actions.end(true)
    expect(session.getSnapshot()).toMatchObject({ phase: 'applied', stats: { changed: 1 } })
    expect(editor.getState().asset.thumb).toBe('data:image/png;base64,new')
    expect(editor.getState().asset.skins![0]!.weights.v_0_0![0]!.weight).toBe(0.25)
    expect(editor.getState().asset.skins![0]!.joints).toBe(source.skins![0]!.joints)
    editor.getState().undo()
    expect(editor.getState().asset.skins).toEqual(source.skins)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    unsubscribe()
    attachment.dispose()
    editor.getState().dispose()
  }
})

test('source not yet displayed, revisions, cancellation and disposed attachment callbacks cannot write', () => {
  const { editor, source, session, sample, scope } = setup(),
    attachment = session.connect({ ...scope, displayed: () => source }, () => {})
  try {
    attachment.actions.begin(sample)
    session.cancel()
    attachment.actions.end(true)
    expect(session.getSnapshot().phase).toBe('cancelled')
    expect(editor.getState().canUndo).toBe(false)
    attachment.actions.begin(sample)
    editor.getState().commit({ ...source, name: 'New revision' })
    const external = editor.getState().asset
    expect(session.getSnapshot().phase).toBe('cancelled')
    attachment.actions.end(true)
    expect(attachment.actions.begin(sample)).toBe(false)
    expect(session.getSnapshot().phase).toBe('error')
    expect(editor.getState().asset).toBe(external)
    attachment.dispose()
    expect(attachment.actions.begin(sample)).toBe(false)
    attachment.actions.move(sample)
    attachment.actions.end(true)
    expect(editor.getState().asset).toBe(external)
  } finally {
    attachment.dispose()
    editor.getState().dispose()
  }
})

test('reattaching revokes the previous viewport, and its late cleanup cannot cancel the new gesture', () => {
  const { editor, source, session, sample, scope } = setup(),
    old = session.connect(scope, () => {})
  old.actions.begin(sample)
  const next = session.connect(
    { ...scope, settings: { ...scope.settings, strength: 0.75 } },
    () => {},
  )
  try {
    expect(next.actions.begin(sample)).toBe(true)
    old.dispose()
    old.actions.end(true)
    old.actions.move(sample)
    expect(old.actions.begin(sample)).toBe(false)
    expect(editor.getState().asset).toBe(source)
    expect(session.getSnapshot().phase).toBe('painting')
    next.actions.end(true)
    expect(editor.getState().asset.skins![0]!.weights.v_0_0![0]!.weight).toBe(0.75)
  } finally {
    next.dispose()
    editor.getState().dispose()
  }
})

test('cancellation inside the color consumer cannot restore stale painting status', () => {
  const { editor, source, session, sample, scope } = setup(),
    attachment = session.connect(scope, (preview) => {
      if (preview?.delta.size) session.cancel()
    })
  try {
    expect(attachment.actions.begin(sample)).toBe(false)
    expect(session.getSnapshot().phase).toBe('cancelled')
    attachment.actions.end(true)
    expect(editor.getState().asset).toBe(source)
  } finally {
    attachment.dispose()
    editor.getState().dispose()
  }
})

test('a newer attachment created during release wins over the outer connect', () => {
  const { editor, source, session, sample, scope } = setup()
  let replace = false
  const newer: Array<ReturnType<typeof session.connect>> = []
  const first = session.connect(scope, (preview) => {
    if (!preview && replace) {
      replace = false
      const newest = session.connect(
        { ...scope, settings: { ...scope.settings, strength: 0.75 } },
        () => {},
      )
      newer.push(newest)
      newest.actions.begin(sample)
    }
  })
  first.actions.begin(sample)
  replace = true
  const outer = session.connect(scope, () => {})
  try {
    expect(outer.actions.begin(sample)).toBe(false)
    expect(session.getSnapshot().phase).toBe('painting')
    expect(editor.getState().asset).toBe(source)
    // The consumer owns the new attachment; cancel from the workshop must reach it.
    session.cancel()
    expect(session.getSnapshot().phase).toBe('cancelled')
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    for (const connection of newer) connection.dispose()
    outer.dispose()
    first.dispose()
    editor.getState().dispose()
  }
})
