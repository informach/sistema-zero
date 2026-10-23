import { expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive } from '../../../scene/commands'
import { createSceneProject } from '../../../scene/createProject'
import { scenePieceCoordinates, setScenePieceCoordinates } from '../../../scene/pieceCoordinates'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

test('dimensions and position show two decimals and accept hundredths independently of movement steps', async () => {
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
    expect(size().getAttribute('step')).toBe('0.01')
    expect((size() as HTMLInputElement).value).toBe('2.00')
    fireEvent.change(size(), { target: { value: '3.27' } })
    fireEvent.blur(size())
    expect(scenePieceCoordinates(editor.getState().content, nodeId).dimensions[0]).toBe(3.27)
    expect((size() as HTMLInputElement).value).toBe('3.27')
    const position = screen.getByRole('spinbutton', { name: 'Posição X' })
    fireEvent.change(position, { target: { value: '-2.73' } })
    fireEvent.blur(position)
    expect(scenePieceCoordinates(editor.getState().content, nodeId).position[0]).toBe(-2.73)
    const before = editor.getState().content
    fireEvent.click(screen.getByText('Mais ajustes do palco', { exact: true }))
    const fractions = screen.getByRole('checkbox', {
      name: 'Passos de 0,01 ao mover e redimensionar',
    })
    if (!(fractions instanceof HTMLInputElement)) throw new Error('Missing precision checkbox')
    expect(fractions.checked).toBe(false)
    fireEvent.click(fractions)
    expect(editor.getState().content).toBe(before)
    expect(screen.getByText('Passo das medidas: 0,01')).toBeDefined()
    expect(size().getAttribute('step')).toBe('0.01')
    fireEvent.change(size(), { target: { value: '3.256' } })
    fireEvent.blur(size())
    expect(scenePieceCoordinates(editor.getState().content, nodeId).dimensions[0]).toBeCloseTo(
      3.26,
      12,
    )
    const fractional = editor.getState().content
    fireEvent.click(fractions)
    expect(editor.getState().content).toBe(fractional)
    fireEvent.blur(size())
    expect(editor.getState().content).toBe(fractional)
    expect(size().getAttribute('step')).toBe('0.01')
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('displaying imported coordinates with two decimals does not change their stored precision', async () => {
  const base = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Medidas precisas' }),
    'box',
    'corpo',
  )
  const nodeId = base.nodes[0]!.id
  const source = setScenePieceCoordinates(
    setScenePieceCoordinates(base, nodeId, 'position', [1.2345, 0, 0]),
    nodeId,
    'dimensions',
    [2.3456, 2, 2],
  )
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
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    const position = screen.getByRole('spinbutton', { name: 'Posição X' }) as HTMLInputElement
    const size = screen.getByRole('spinbutton', { name: 'Tamanho X' }) as HTMLInputElement
    expect(position.value).toBe('1.23')
    expect(size.value).toBe('2.35')
    const before = editor.getState().content
    fireEvent.blur(position)
    fireEvent.blur(size)
    expect(editor.getState().content).toBe(before)
    expect(scenePieceCoordinates(before, nodeId).position[0]).toBeCloseTo(1.2345, 12)
    expect(scenePieceCoordinates(before, nodeId).dimensions[0]).toBeCloseTo(2.3456, 12)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
