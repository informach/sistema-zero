import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive, groupSceneNodes, setSceneNodeFlag } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeModel } from '../../../testing/fixtures'
import { sceneAnimationClip } from '../../../testing/sceneAnimation'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { MoldaToolAccessProvider } from '../../toolAccess'
import { SceneWorkshop } from './SceneWorkshop'
import { prepareHierarchyMove } from './sceneHierarchyMove'

const fixture = () => migrateLegacyModel(makeModel()).document

test('hierarchy multiselect stays readable when authoring groups is unavailable', () => {
  const editor = createDocumentEditorStore({
    asset: fixture(),
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe()
  const view = render(
    <MoldaToolAccessProvider access={{ allow: [] }}>
      <SceneWorkshop editor={editor} viewportFactory={probe.factory} />
    </MoldaToolAccessProvider>,
  )
  try {
    const tools = within(screen.getByRole('group', { name: 'Organizar peças e grupos' }))
    const multi = tools.getByRole('button', { name: COPY.scene.addSelection })
    fireEvent.click(multi)
    expect(multi.getAttribute('aria-pressed')).toBe('true')
    expect(tools.queryByRole('button', { name: COPY.scene.group })).toBeNull()
    expect(tools.queryByRole('combobox', { name: 'Mover para grupo' })).toBeNull()
    expect(
      screen.getByRole('button', { name: COPY.scene.select('corpo') }).getAttribute('draggable'),
    ).toBe('false')
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('o intervalo por Ctrl+clique chega às ações de várias peças da oficina', () => {
  const source = addScenePrimitive(addScenePrimitive(fixture(), 'box', 'meio'), 'box', 'ponta')
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const view = render(
    <SceneWorkshop editor={editor} viewportFactory={sceneViewportProbe().factory} />,
  )
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.addSelection }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }), {
      ctrlKey: true,
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('ponta') }), {
      ctrlKey: true,
    })
    for (const name of ['corpo', 'asa', 'meio', 'ponta']) {
      expect(
        screen.getByRole('button', { name: COPY.scene.select(name) }).getAttribute('aria-pressed'),
      ).toBe('true')
    }
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.group }))
    const group = editor.getState().content.nodes.find((node) => node.kind === 'group')
    expect(group).toBeDefined()
    expect(
      editor.getState().content.nodes.filter((node) => node.parentId === group?.id),
    ).toHaveLength(4)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
function sameWorld(before: MoldaSceneDocument, after: MoldaSceneDocument) {
  const old = indexSceneDocument(before).scene.worldMatrices
  for (const [id, matrix] of indexSceneDocument(after).scene.worldMatrices) {
    if (!old.has(id)) continue
    matrix.forEach((n, i) => {
      expect(n).toBeCloseTo(old.get(id)![i]!, 10)
    })
  }
}

test('grouping from the hierarchy, nesting, renaming and moving back to root preserve the model and undo', async () => {
  const source = fixture()
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe()
  const view = render(<SceneWorkshop editor={editor} viewportFactory={probe.factory} />)
  try {
    await waitFor(() => expect(probe.ports.length).toBeGreaterThan(0))
    const tools = within(screen.getByRole('group', { name: 'Organizar peças e grupos' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
    fireEvent.click(tools.getByRole('button', { name: COPY.scene.addSelection }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('asa') }))
    fireEvent.click(tools.getByRole('button', { name: COPY.scene.group }))
    let document = editor.getState().content
    const group = document.nodes.find((n) => n.kind === 'group')!
    expect(document.nodes.filter((n) => n.parentId === group.id)).toHaveLength(2)
    sameWorld(source, document)
    const tree = within(screen.getByRole('region', { name: COPY.scene.hierarchy }))
    fireEvent.keyDown(tree.getByRole('button', { name: COPY.scene.select('Grupo') }), { key: 'F2' })
    const name = tree.getByRole('textbox', { name: 'Renomear Grupo na árvore' })
    fireEvent.change(name, { target: { value: 'root' } })
    fireEvent.keyDown(name, { key: 'Enter' })
    expect(document.nodes.find((n) => n.id === group.id)?.name).toBe('Grupo')
    expect(editor.getState().content.nodes.find((n) => n.id === group.id)?.name).toBe('root')
    expect(globalThis.document.activeElement).toBe(
      tree.getByRole('button', { name: COPY.scene.select('root') }),
    )
    fireEvent.click(tools.getByRole('button', { name: COPY.scene.addSelection }))
    fireEvent.click(tree.getByRole('button', { name: COPY.scene.select('asa') }))
    fireEvent.click(tools.getByRole('button', { name: COPY.scene.group }))
    document = editor.getState().content
    const child = document.nodes.find((n) => n.kind === 'group' && n.parentId === group.id)!
    expect(child).toBeTruthy()
    expect(document.nodes.find((n) => n.id === 'wing')?.parentId).toBe(child.id)
    sameWorld(source, document)
    fireEvent.click(tree.getByRole('button', { name: COPY.scene.select('asa') }))
    fireEvent.change(tools.getByRole('combobox', { name: 'Mover para grupo' }), {
      target: { value: 'root' },
    })
    expect(editor.getState().content.nodes.find((n) => n.id === 'wing')?.parentId).toBeNull()
    sameWorld(source, editor.getState().content)
    act(() => editor.getState().undo())
    expect(editor.getState().content.nodes.find((n) => n.id === 'wing')?.parentId).toBe(child.id)
    fireEvent.doubleClick(tree.getByRole('button', { name: COPY.scene.select('root') }))
    const cancelled = tree.getByRole('textbox', { name: 'Renomear root na árvore' })
    const before = editor.getState().contentRevision
    fireEvent.change(cancelled, { target: { value: 'cancelado' } })
    fireEvent.keyDown(cancelled, { key: 'Escape' })
    expect(editor.getState().contentRevision).toBe(before)
    expect(tree.getByRole('button', { name: COPY.scene.select('root') })).toBeTruthy()
    fireEvent.click(tree.getByRole('button', { name: COPY.scene.hide('root') }))
    expect(tree.queryByRole('button', { name: COPY.scene.select('asa') })).toBeNull()
    fireEvent.click(tree.getByRole('button', { name: COPY.scene.show('root') }))
    expect(tree.getByRole('button', { name: COPY.scene.select('asa') })).toBeTruthy()
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('hierarchy destinations exclude self, descendants, mesh parents, locked subtrees and singular groups', () => {
  const grouped = groupSceneNodes(fixture(), ['body'], { nextId: () => 'outer' })
  const nested = groupSceneNodes(grouped, ['body'], { nextId: () => 'inner' })
  const index = indexSceneDocument(nested)
  const parent = prepareHierarchyMove(index, ['outer', 'body'])
  expect(parent.ids).toEqual(['outer'])
  expect(parent.allows('inner')).toBe(false)
  expect(parent.allows('outer')).toBe(false)
  expect(parent.allows('wing')).toBe(false)
  const child = prepareHierarchyMove(index, ['body'])
  expect(child.allows('outer')).toBe(true)
  expect(child.allows(null)).toBe(true)
  const locked = setSceneNodeFlag(nested, ['body'], 'locked', true)
  expect(prepareHierarchyMove(indexSceneDocument(locked), ['outer']).editable).toBe(false)
  const singular: MoldaSceneDocument = {
    ...nested,
    nodes: nested.nodes.map((n) =>
      n.id === 'inner'
        ? {
            ...n,
            transform: {
              kind: 'trs',
              translation: [0, 0, 0],
              rotation: [0, 0, 0, 1],
              scale: [0, 1, 1],
            },
          }
        : n,
    ),
  }
  expect(prepareHierarchyMove(indexSceneDocument(singular), ['wing']).allows('inner')).toBe(false)
  expect(nested.nodes.find((n) => n.id === 'body')?.parentId).toBe('inner')
  const animated = { ...nested, animations: [sceneAnimationClip('outer')] }
  expect(prepareHierarchyMove(indexSceneDocument(animated), ['body']).allows(null)).toBe(false)
  expect(prepareHierarchyMove(indexSceneDocument(animated), ['body']).allows('outer')).toBe(true)
  expect(prepareHierarchyMove(indexSceneDocument(animated), ['wing']).allows('inner')).toBe(false)
})

test('replacing the editor cancels a hierarchy drag even when both editors share the document', () => {
  const source = groupSceneNodes(fixture(), ['body'], { name: 'Pasta', nextId: () => 'parent' })
  const createEditor = () =>
    createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
  const editor = createEditor()
  const replacement = createEditor()
  const probe = sceneViewportProbe()
  const view = render(<SceneWorkshop editor={editor} viewportFactory={probe.factory} />)
  try {
    const tree = within(screen.getByRole('region', { name: COPY.scene.hierarchy }))
    const transfer = new DataTransfer()
    fireEvent.dragStart(tree.getByRole('button', { name: COPY.scene.select('asa') }), {
      dataTransfer: transfer,
    })
    view.rerender(<SceneWorkshop editor={replacement} viewportFactory={probe.factory} />)
    fireEvent.drop(tree.getByRole('group', { name: 'Pasta' }), { dataTransfer: transfer })
    expect(editor.getState().content).toBe(source)
    expect(replacement.getState().content).toBe(source)
    expect(editor.getState().canUndo).toBe(false)
    expect(replacement.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
    replacement.getState().dispose()
  }
})

test('drag moves one owned subtree atomically and a changed tree rejects its late drop', async () => {
  const source = groupSceneNodes(fixture(), ['body'], { name: 'Pasta', nextId: () => 'parent' })
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe()
  const view = render(<SceneWorkshop editor={editor} viewportFactory={probe.factory} />)
  const transfer = new DataTransfer()
  try {
    await waitFor(() => expect(probe.ports.length).toBeGreaterThan(0))
    const tree = within(screen.getByRole('region', { name: COPY.scene.hierarchy }))
    const wing = () => tree.getByRole('button', { name: COPY.scene.select('asa') })
    const target = () => tree.getByRole('group', { name: 'Pasta' })
    fireEvent.dragStart(wing(), { dataTransfer: transfer })
    act(() => editor.getState().setThumb('latest'))
    fireEvent.dragOver(target(), { dataTransfer: transfer })
    fireEvent.drop(target(), { dataTransfer: transfer })
    expect(editor.getState().content.nodes.find((n) => n.id === 'wing')?.parentId).toBe('parent')
    expect(editor.getState().asset.thumb).toBe('latest')
    sameWorld(source, editor.getState().content)
    act(() => editor.getState().undo())
    expect(editor.getState().content.nodes).toEqual(source.nodes)
    expect(editor.getState().canUndo).toBe(false)
    fireEvent.dragStart(wing(), { dataTransfer: transfer })
    const external = {
      ...editor.getState().content,
      nodes: editor
        .getState()
        .content.nodes.map((node) =>
          node.id === 'body' ? { ...node, name: 'Mudança externa' } : node,
        ),
    }
    act(() => editor.getState().commit(external))
    const committed = editor.getState().content
    const revision = editor.getState().contentRevision
    fireEvent.dragOver(target(), { dataTransfer: transfer })
    fireEvent.drop(target(), { dataTransfer: transfer })
    expect(editor.getState().content).toBe(committed)
    expect(editor.getState().contentRevision).toBe(revision)
    expect(editor.getState().content.nodes.find((n) => n.id === 'wing')?.parentId).toBeNull()
    act(() => editor.getState().undo())
    expect(editor.getState().canUndo).toBe(false)
    expect(editor.getState().content.nodes).toEqual(source.nodes)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
