import { expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive } from '../../../scene/commands'
import { createSceneProject } from '../../../scene/createProject'
import { scenePieceCoordinates } from '../../../scene/pieceCoordinates'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

test('dimensions and position use integers by default and decimals are explicitly enabled without editing existing pieces', async () => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Medidas' }),
    'box',
    'corpo',
  )
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe(),
    view = render(<SceneWorkshop editor={editor} viewportFactory={probe.factory} />)
  const nodeId = source.nodes[0]!.id
  try {
    await waitFor(() => expect(probe.ports.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    const size = () => screen.getByRole('spinbutton', { name: 'Tamanho X' })
    expect(size().getAttribute('step')).toBe('1')
    fireEvent.change(size(), { target: { value: '3.7' } })
    fireEvent.blur(size())
    expect(scenePieceCoordinates(editor.getState().content, nodeId).dimensions[0]).toBe(4)
    const position = screen.getByRole('spinbutton', { name: 'Posição X' })
    fireEvent.change(position, { target: { value: '-2.7' } })
    fireEvent.blur(position)
    expect(scenePieceCoordinates(editor.getState().content, nodeId).position[0]).toBe(-3)
    const before = editor.getState().content
    fireEvent.click(screen.getByText('Mais ajustes do palco', { exact: true }))
    const fractions = screen.getByRole('checkbox', { name: 'Permitir números quebrados' })
    if (!(fractions instanceof HTMLInputElement)) throw new Error('Missing precision checkbox')
    expect(fractions.checked).toBe(false)
    fireEvent.click(fractions)
    expect(editor.getState().content).toBe(before)
    expect(size().getAttribute('step')).toBe('0.1')
    fireEvent.change(size(), { target: { value: '3.25' } })
    fireEvent.blur(size())
    expect(scenePieceCoordinates(editor.getState().content, nodeId).dimensions[0]).toBeCloseTo(
      3.3,
      12,
    )
    const fractional = editor.getState().content
    fireEvent.click(fractions)
    expect(editor.getState().content).toBe(fractional)
    fireEvent.blur(size())
    expect(editor.getState().content).toBe(fractional)
    expect(size().getAttribute('step')).toBe('1')
    fireEvent.click(screen.getByText('Mais sobre a peça', { exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Mover' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mover Lado · X mais' }))
    expect(scenePieceCoordinates(editor.getState().content, nodeId).position[0]).toBe(-2)
    fireEvent.click(screen.getByRole('button', { name: 'Tamanho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Maior' }))
    expect(scenePieceCoordinates(editor.getState().content, nodeId).dimensions[0]).toBe(4)
    fireEvent.click(fractions)
    fireEvent.click(screen.getByRole('button', { name: 'Menor' }))
    expect(scenePieceCoordinates(editor.getState().content, nodeId).dimensions[0]).toBeCloseTo(
      3.9,
      12,
    )
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
