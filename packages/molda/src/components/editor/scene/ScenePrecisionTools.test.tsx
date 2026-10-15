import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import { structuredBytes } from '../../../core/structuredBytes'
import { sceneLocalBounds } from '../../../scene/pivot'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

function setup() {
  const source = animatedScene(),
    editor = createDocumentEditorStore({
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
    fireEvent.click(screen.getByRole('button', { name: 'Cortar' }))
    const bar = within(screen.getByRole('region', { name: 'Cortar a peça' }))
    const field = () => bar.getByLabelText('Direção do plano Z')
    fireEvent.change(field(), { target: { value: '0' } })
    fireEvent.click(bar.getByRole('button', { name: 'Conferir plano' }))
    expect(bar.getByRole('alert').textContent).toContain('diferente de zero')
    expect(bar.getByRole('button', { name: 'Cortar' }).hasAttribute('disabled')).toBe(true)
    expect(f.editor.getState().content).toBe(f.source)
    fireEvent.change(field(), { target: { value: '1' } })
    fireEvent.click(bar.getByRole('button', { name: 'Conferir plano' }))
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    await act(async () => {
      fireEvent.click(bar.getByRole('button', { name: 'Cortar' }))
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

test('precision pivot targets use the canonical pivot without converting geometry or rebasing old animation', () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Pivô' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar alça Y' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.vertical).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Canto −X +Y −Z' }))
    const after = f.editor.getState().content
    expect(after.nodes.find((node) => node.id === 'body')!.pivot).toEqual(
      sceneLocalBounds(f.source, 'body')!.min.map((n, i) =>
        i === 1 ? sceneLocalBounds(f.source, 'body')!.max[1] : n,
      ) as Vec3,
    )
    expect(after.animations).toBe(f.source.animations)
    expect(after.geometries).toBe(f.source.geometries)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.nodes).toEqual(f.source.nodes)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Encaixar em um ponto da peça' }))
    expect(f.probe.ports.at(-1)!.callbacks.guideInput!()!.pivot!.snapVertex).toBe(true)
    expect(f.editor.getState().canUndo).toBe(false)
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
