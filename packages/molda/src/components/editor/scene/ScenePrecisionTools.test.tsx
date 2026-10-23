import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import { structuredBytes } from '../../../core/structuredBytes'
import { groupSceneNodes } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sceneLocalBounds } from '../../../scene/pivot'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

function setup(source: MoldaSceneDocument = animatedScene()) {
  const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
      autosaveMs: 60000,
    }),
    probe = sceneViewportProbe()
  const view = render(<SceneWorkshop editor={editor} viewportFactory={probe.factory} />)
  fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
  return {
    source,
    editor,
    probe,
    close() {
      view.unmount()
      editor.getState().dispose()
    },
  }
}

test('numeric cut validates the full plane, previews without saving and creates two native halves in one undo', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByText('Seleção e organização'))
    fireEvent.click(screen.getByRole('button', { name: 'Separar peça' }))
    const bar = within(screen.getByRole('region', { name: 'Separar a peça' }))
    const field = () => bar.getByLabelText('Direção do plano Z')
    fireEvent.change(field(), { target: { value: '0' } })
    fireEvent.click(bar.getByRole('button', { name: 'Conferir plano' }))
    expect(bar.getByRole('alert').textContent).toContain('diferente de zero')
    expect(bar.getByRole('button', { name: 'Separar' }).hasAttribute('disabled')).toBe(true)
    expect(f.editor.getState().content).toBe(f.source)
    fireEvent.change(field(), { target: { value: '1' } })
    fireEvent.click(bar.getByRole('button', { name: 'Conferir plano' }))
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    await act(async () => {
      fireEvent.click(bar.getByRole('button', { name: 'Separar' }))
    })
    const cut = f.editor.getState().content
    const pieces = cut.nodes.filter((node) => node.name.startsWith('corpo ('))
    expect(pieces).toHaveLength(2)
    for (const piece of pieces) expect(sceneLocalBounds(cut, piece.id)!.size).toEqual([4, 2, 3])
    expect(f.editor.getState().canUndo).toBe(true)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.nodes).toEqual(f.source.nodes)
    expect(f.editor.getState().content.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('visual pivot selection ends after picking a point, preserves the scene and undoes once', () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Pivô' }))
    const panel = within(screen.getByRole('region', { name: 'Onde a peça gira' }))
    const fine = panel.getByText('Ajuste fino').closest('details')!
    expect(fine.open).toBe(false)
    expect(screen.queryByText('Mais posições do pivô')).toBeNull()
    fireEvent.click(panel.getByRole('button', { name: 'Escolher na peça' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(true)
    fireEvent.click(panel.getByRole('button', { name: 'Escolher na peça' }))
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(false)
    fireEvent.click(panel.getByText('Ajuste fino'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mover para cima e para baixo' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.vertical).toBe(true)
    const point = sceneLocalBounds(f.source, 'body')!.min.map((n, i) =>
      i === 1 ? sceneLocalBounds(f.source, 'body')!.max[1] : n,
    ) as Vec3
    fireEvent.click(panel.getByRole('button', { name: 'Escolher na peça' }))
    act(() => f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.markVertex!('corner', point))
    const after = f.editor.getState().content
    expect(after.nodes.find((node) => node.id === 'body')!.pivot).toEqual(point)
    expect(after.animations).toBe(f.source.animations)
    expect(after.geometries).toBe(f.source.geometries)
    expect(after.nodes.map((node) => node.transform)).toEqual(
      f.source.nodes.map((node) => node.transform),
    )
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(false)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.nodes).toEqual(f.source.nodes)
    fireEvent.click(panel.getByRole('button', { name: 'Escolher na peça' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(true)
    expect(f.editor.getState().canUndo).toBe(false)
    fireEvent.click(panel.getByRole('button', { name: 'Na base' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(false)
    expect(f.editor.getState().content.nodes.find((node) => node.id === 'body')!.pivot).toEqual(
      sceneLocalBounds(f.source, 'body')!.base,
    )
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.nodes).toEqual(f.source.nodes)
    act(() => f.editor.getState().redo())
    expect(f.editor.getState().content.nodes.find((node) => node.id === 'body')!.pivot).toEqual(
      sceneLocalBounds(f.source, 'body')!.base,
    )
  } finally {
    f.close()
  }
})

test('pivot presets support groups and locked pieces cannot accept point picking', () => {
  const source = groupSceneNodes(animatedScene(), ['body'], { name: 'Roda e eixo' })
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher Roda e eixo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pivô' }))
    const panel = within(screen.getByRole('region', { name: 'Onde a peça gira' }))
    expect(panel.getByRole('button', { name: 'Escolher na peça' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(panel.getByRole('status').textContent).toContain('selecione uma peça do grupo')
    fireEvent.click(panel.getByRole('button', { name: 'Na base' }))
    const after = f.editor.getState().content
    const group = after.nodes.find((node) => node.name === 'Roda e eixo')!
    expect(group.pivot).toEqual(sceneLocalBounds(source, group.id)!.base)
    expect(after.geometries).toBe(source.geometries)
    expect(after.animations).toBe(source.animations)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.nodes).toEqual(source.nodes)
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    fireEvent.click(panel.getByRole('button', { name: 'Escolher na peça' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Travar corpo' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(false)
    expect(panel.getByRole('button', { name: 'Escolher na peça' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(panel.getByRole('button', { name: 'Na base' }).hasAttribute('disabled')).toBe(true)
  } finally {
    f.close()
  }
})

test('whole movement rhythm and reversal use a disposable preview and one explicit confirmation', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Animar' }))
    const prepare = async () => {
      const settings = within(
        (await screen.findByText(COPY.scene.animationSettings)).closest('details')!,
      )
      fireEvent.change(settings.getByLabelText(COPY.scene.animationDuration), {
        target: { value: '4' },
      })
      fireEvent.click(settings.getByLabelText(COPY.scene.animationRetime))
      fireEvent.click(settings.getByRole('button', { name: 'Conferir ajustes' }))
    }
    await prepare()
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar ajustes' }))
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    await prepare()
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationApply }))
    expect(f.editor.getState().content.animations![0]!.duration).toBe(4)
    expect(f.editor.getState().content.animations![0]!.tracks[0]!.keys[1]!.time).toBe(
      1.123456789123 * 2,
    )
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
    fireEvent.click(await screen.findByRole('button', { name: COPY.scene.animationReverse }))
    expect(f.editor.getState().content.animations).toEqual(f.source.animations)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationApply }))
    expect(f.editor.getState().content.animations![0]!.tracks[0]!.keys[1]!.time).toBe(
      2 - 1.123456789123,
    )
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})
