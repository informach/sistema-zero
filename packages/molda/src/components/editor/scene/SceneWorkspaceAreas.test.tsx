import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive } from '../../../scene/commands'
import { createSceneProject } from '../../../scene/createProject'
import type { MoldaSceneDocument } from '../../../scene/document'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

function setup(source: MoldaSceneDocument = animatedScene()) {
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

test('replacing an editor with the same document cancels a pending UV edit in its original owner', async () => {
  const f = setup()
  const replacement = createDocumentEditorStore({
    asset: f.source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pintar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Folha de pintura' }))
    const sheet = await screen.findByRole('region', { name: 'Área Folha de pintura' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ajustar mapa' }))
    const canvas = await within(sheet).findByRole('button', { name: COPY.scene.uvCanvasControl })
    fireEvent.keyDown(canvas, { key: 'Enter' })
    fireEvent.keyDown(canvas, { key: 'ArrowRight' })
    f.view.rerender(<SceneWorkshop editor={replacement} viewportFactory={f.probe.factory} />)
    fireEvent.keyDown(canvas, { key: 'Enter' })
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(replacement.getState().saveSnapshot()).toBe(f.source)
    expect(replacement.getState().canUndo).toBe(false)
  } finally {
    f.close()
    replacement.getState().dispose()
  }
})

test('contextual mesh and UV panels preserve the scene and live viewport; opening UV never converts a primitive', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    const ports = f.probe.ports.length
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Áreas da oficina' })).getByRole('button', {
        name: 'Editar malha',
      }),
    )
    expect(
      await screen.findByRole('region', { name: COPY.scene.componentTitles.face }),
    ).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('region', { name: COPY.scene.componentTitles.face })).getByRole(
        'button',
        {
          name: 'Pintura da face',
        },
      ),
    )
    const area = await screen.findByRole('region', { name: 'Pintura da face' })
    await within(area).findByRole('img', { name: COPY.scene.uvCanvas })
    expect(within(area).queryByLabelText(COPY.scene.uvFace)).toBeNull()
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.probe.ports).toHaveLength(ports)
    expect(f.probe.ports.at(-1)!.disposed).toBe(0)
    fireEvent.click(within(area).getByRole('button', { name: 'Faces' }))
    expect(screen.queryByRole('region', { name: 'Pintura da face' })).toBeNull()
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.probe.ports).toHaveLength(ports)
  } finally {
    f.close()
  }
})

test('opening the UV sheet after touching a native cylinder cap keeps that side selected', async () => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Roda' }),
    'cylinder',
    'roda',
  )
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher roda' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pintar' }))
    act(() =>
      f.probe.ports.at(-1)!.callbacks.select(source.nodes.at(-1)!.id, false, { faceId: 'top' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Folha de pintura' }))
    const sheet = await screen.findByRole('region', { name: 'Área Folha de pintura' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ajustar mapa' }))
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Seleção e ajustes' }))
    const summary = screen.getByText(COPY.scene.uvAdvanced, { selector: 'summary' })
    act(() => {
      const details = summary.closest('details')!
      details.open = true
      fireEvent(details, new Event('toggle'))
    })
    const selected = await screen.findByRole<HTMLSelectElement>('combobox', {
      name: COPY.scene.uvFace,
    })
    expect(selected.value.startsWith('top:')).toBe(true)
    expect(f.editor.getState().canUndo).toBe(false)
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

test('the unified sheet keeps the viewport and primitive intact, frames the UV map and restores paint zoom', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pintar' }))
    const ports = f.probe.ports.length
    fireEvent.click(screen.getByRole('button', { name: 'Folha de pintura' }))
    const sheet = await screen.findByRole('region', { name: 'Área Folha de pintura' })
    await within(sheet).findByRole('button', { name: COPY.scene.paintCanvas })
    expect(screen.queryByRole('spinbutton')).toBeNull()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Aumentar zoom da folha' }))
    const zoom = within(sheet).getByLabelText('Zoom da folha', { exact: true }).textContent
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ajustar mapa' }))
    await within(sheet).findByRole('button', { name: COPY.scene.uvCanvasControl })
    expect(within(sheet).getByRole('button', { name: 'Organizar mapa' })).toBeTruthy()
    expect(within(sheet).getByRole('button', { name: 'Ver mapa' })).toBeTruthy()
    expect(within(sheet).getByRole('button', { name: 'Folha inteira' })).toBeTruthy()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Folha inteira' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ver mapa' }))
    expect(within(sheet).queryByRole('spinbutton')).toBeNull()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Pintar na folha' }))
    expect(within(sheet).getByLabelText('Zoom da folha', { exact: true }).textContent).toBe(zoom)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Fechar folha de pintura' }))
    expect(screen.queryByRole('region', { name: 'Área Folha de pintura' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Folha de pintura' }))
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.probe.ports).toHaveLength(ports)
    expect(f.probe.ports.at(-1)!.disposed).toBe(0)
  } finally {
    f.close()
  }
})
