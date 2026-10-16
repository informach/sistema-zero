import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

function setup() {
  const source = animatedScene()
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe()
  const view = render(<SceneWorkshop editor={editor} viewportFactory={probe.factory} />)
  return {
    source,
    editor,
    probe,
    view,
    close() {
      view.unmount()
      editor.getState().dispose()
    },
  }
}

test('named mesh and UV areas preserve the scene and the live viewport; opening UV never converts a primitive', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    const ports = f.probe.ports.length
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Áreas da oficina' })).getByRole('button', {
        name: 'Editar malha',
      }),
    )
    expect(await screen.findByRole('region', { name: 'Área Editar malha' })).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Área Editar malha' })).getByRole('button', {
        name: 'UV',
      }),
    )
    const area = await screen.findByRole('region', { name: 'Área UV' })
    await within(area).findByLabelText(COPY.scene.uvFace)
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.probe.ports).toHaveLength(ports)
    expect(f.probe.ports.at(-1)!.disposed).toBe(0)
    fireEvent.click(within(area).getByRole('button', { name: 'Fechar área' }))
    expect(screen.queryByRole('region', { name: 'Área UV' })).toBeNull()
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.probe.ports).toHaveLength(ports)
  } finally {
    f.close()
  }
})

test('curves use exact imported times, preview without saving, cancel and confirm one undo', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Animar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Curvas' }))
    const area = await screen.findByRole('region', { name: 'Editor de curvas' })
    fireEvent.keyDown(within(area).getByRole('button', { name: /Mover · corpo: 3 poses/ }), {
      key: 'ArrowRight',
    })
    const field = () => within(area).getByLabelText('Valor X') as HTMLInputElement
    expect((within(area).getByLabelText('Tempo (s)') as HTMLInputElement).value).toBe(
      '1.123456789123',
    )
    fireEvent.change(field(), { target: { value: '3.25' } })
    fireEvent.click(within(area).getByRole('button', { name: 'Conferir curva' }))
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(within(area).queryByRole('button', { name: 'Aplicar curva' })).toBeNull()
    fireEvent.change(field(), { target: { value: '3.25' } })
    fireEvent.click(within(area).getByRole('button', { name: 'Conferir curva' }))
    fireEvent.click(within(area).getByRole('button', { name: 'Aplicar curva' }))
    expect(f.editor.getState().content.animations![0]!.tracks[0]!.keys[1]).toMatchObject({
      time: 1.123456789123,
      value: [3.25, Number.MIN_VALUE, -2.234567891],
    })
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations).toEqual(f.source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
    fireEvent.change(within(area).getByLabelText('Tempo (s)'), { target: { value: '2' } })
    fireEvent.click(within(area).getByRole('button', { name: 'Conferir curva' }))
    expect(within(area).getByRole('alert').textContent).toContain('Já existe uma pose')
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})
