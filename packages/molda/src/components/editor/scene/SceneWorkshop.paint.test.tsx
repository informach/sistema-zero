/**
 * A aba Pintar do jeito da criança: tocar na peça e pintar.
 *
 * ⚠️ A régua deste arquivo mede PASSOS, não só botões: da oficina aberta até o primeiro traço,
 * no máximo 3 interações, todas em controles à vista (`frontControls`) ou no próprio palco, e
 * nenhum `<details>` aberto no caminho. O editor antigo fazia isso em 2 toques; a oficina nova
 * pedia de 4 a 6 passos, por um painel fechado.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive, convertSceneNodesToMesh, editSceneMesh } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { ScenePaintTarget } from '../../../scene/imagePaint'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { frontControls } from '../../../testing/domContract'
import { makeModel } from '../../../testing/fixtures'
import type {
  ScenePaintMode,
  SceneViewportCallbacks,
  SceneViewportFactory,
  SceneViewportPort,
} from '../../../viewport/sceneViewportTypes'
import { SceneWorkshop } from './SceneWorkshop'

afterEach(() => {
  cleanup()
})

/** Uma caixa nova, sem tinta nenhuma: é o que a criança tem ao começar. */
function twoBoxes() {
  let n = 0
  const nextId = () => `pinta${++n}`
  const base = migrateLegacyModel(makeModel({ parts: [] })).document
  const one = addScenePrimitive(base, 'box', 'porta', nextId)
  const two = addScenePrimitive(one, 'box', 'parede', nextId)
  return { document: two, door: one.nodes.at(-1)!.id, wall: two.nodes.at(-1)!.id }
}

function mount(asset: MoldaSceneDocument) {
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const stage = {
    callbacks: null as SceneViewportCallbacks | null,
    target: null as ScenePaintTarget | null,
    mode: null as ScenePaintMode | null,
  }
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    stage.callbacks = callbacks
    const port: SceneViewportPort = {
      setDocument: () => [],
      setSelection: () => {},
      setIsolation: () => {},
      setView: () => {},
      setTransformTool: () => {},
      setAreaTool: () => {},
      setComponentSelection: () => {},
      setPaintTarget: (target) => {
        stage.target = target
      },
      setPaintMode: (mode) => {
        stage.mode = mode
      },
      setAnimationEditing: () => {},
      setSupportGuides: () => {},
      setSkinWeightTarget: () => {},
      setSkinPaintEnabled: () => {},
      setSkinPaintPreview: () => {},
      setPose: () => {},
      setImageFrame: () => {},
      cancelGesture: () => {},
      renderThumb: () => null,
      frame: () => {},
      dispose: () => {},
    }
    return port
  }
  const view = render(<SceneWorkshop editor={editor} viewportFactory={factory} />)
  /** O toque no palco: é o viewport que decide peça e face, aqui dito direto. */
  const tap = (id: string, faceId = 'py') =>
    act(() => {
      stage.callbacks!.select(id, false, { faceId })
    })
  /** Arrastar na peça: três amostras na mesma face, um traço, um desfazer. */
  const drag = (points: Array<[number, number]>) =>
    act(() => {
      const paint = stage.callbacks!.paint!
      const [first, ...rest] = points
      if (!paint.begin({ point: first!, region: 'face' })) return
      for (const point of rest) paint.move({ point, region: 'face' })
      paint.end(true)
    })
  return { editor, view, stage, tap, drag }
}

const swatch = (document: MoldaSceneDocument, index: number) =>
  screen.getByRole('button', {
    name: COPY.a11y.colorSwatch(index, resolvePaletteColors(document)[index]!),
  })

const material = (document: MoldaSceneDocument, nodeId: string) => {
  const node = document.nodes.find((entry) => entry.id === nodeId)
  if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
  return document.materials.find((entry) => entry.id === node.materialId)!
}

describe('a aba Pintar', () => {
  test('da oficina aberta ao primeiro traço: 3 interações à vista, nenhum painel aberto', async () => {
    const { document, door } = twoBoxes()
    const { editor, view, stage, tap, drag } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    // 1. Tocar na peça, no palco.
    tap(door)
    // 2. A aba Pintar, que está à vista.
    const tab = screen.getByRole('button', { name: SCENE_PAINT_COPY.tab })
    expect(frontControls(view.container)).toContain(`button: ${SCENE_PAINT_COPY.tab}`)
    fireEvent.click(tab)
    expect(stage.mode).toBe('paint')
    expect(stage.target?.nodeId).toBe(door)
    // A superfície nasceu num passo só, sem mudar a aparência.
    const prepared = editor.getState().asset
    expect(material(prepared, door).colorImageId).toBeDefined()
    expect(prepared.images).toHaveLength(document.images.length + 1)
    expect(prepared.images.at(-1)!.layers[0]!.pixels.every((value) => value === 0)).toBe(true)
    // 3. Arrastar na peça.
    drag([
      [9, 9],
      [10, 9],
      [11, 9],
    ])
    const painted = editor.getState().asset.images.at(-1)!.layers[0]!.pixels
    expect(painted.some((value) => value !== 0)).toBe(true)
    expect(view.container.querySelectorAll('details[open]')).toHaveLength(0)
    // Dois desfazer voltam para "sem imagem", e a pintura fecha sem alerta.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(
      editor
        .getState()
        .asset.images.at(-1)!
        .layers[0]!.pixels.every((v) => v === 0),
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(material(editor.getState().asset, door).colorImageId).toBeUndefined()
    await waitFor(() => expect(stage.target).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(SCENE_PAINT_COPY.choosePiece)).toBeDefined()
    editor.getState().dispose()
  })

  test('tocar em outra peça troca o alvo e mantém a cor, a ferramenta e a largura', async () => {
    const { document, door, wall } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    expect(stage.target).toBeNull()
    expect(screen.getByText(SCENE_PAINT_COPY.choosePiece)).toBeDefined()
    tap(door)
    expect(stage.target?.nodeId).toBe(door)
    fireEvent.click(swatch(editor.getState().asset, 5))
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.width[3] }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintFill }))
    tap(wall)
    expect(stage.target?.nodeId).toBe(wall)
    expect(swatch(editor.getState().asset, 5).getAttribute('aria-pressed')).toBe('true')
    expect(
      screen.getByRole('button', { name: COPY.scene.paintFill }).getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintPencil }))
    expect(
      screen.getByRole('button', { name: SCENE_PAINT_COPY.width[3] }).getAttribute('aria-pressed'),
    ).toBe('true')
    // Cada peça ganhou a tinta dela, e só dela.
    const both = editor.getState().asset
    expect(material(both, door).colorImageId).not.toBe(material(both, wall).colorImageId)
    editor.getState().dispose()
  })

  test('Esc cancela o traço; sem traço, solta a peça e a aba continua', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap, view } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const prepared = editor.getState().asset
    act(() => {
      stage.callbacks!.paint!.begin({ point: [9, 9], region: 'face' })
    })
    expect(editor.getState().asset).not.toBe(prepared)
    const shell = view.getByRole('region', { name: COPY.scene.title })
    fireEvent.keyDown(shell, { key: 'Escape' })
    expect(editor.getState().asset.images).toEqual(prepared.images)
    expect(stage.target?.nodeId).toBe(door)
    fireEvent.keyDown(shell, { key: 'Escape' })
    await waitFor(() => expect(stage.target).toBeNull())
    expect(stage.mode).toBe('paint')
    expect(screen.getByText(SCENE_PAINT_COPY.choosePiece)).toBeDefined()
    expect(editor.getState().asset).toBe(prepared)
    editor.getState().dispose()
  })

  test('em Pintar somem os comandos de modelar, e a peça travada explica em vez de pintar', async () => {
    const { document, door } = twoBoxes()
    const locked: MoldaSceneDocument = {
      ...document,
      nodes: document.nodes.map((node) => (node.id === door ? { ...node, locked: true } : node)),
    }
    const { editor, stage, tap } = mount(locked)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    expect(screen.queryByRole('button', { name: COPY.scene.remove })).toBeNull()
    expect(screen.queryByRole('button', { name: COPY.scene.duplicate })).toBeNull()
    tap(door)
    expect(stage.target).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('Destrave')
    expect(editor.getState().asset).toBe(locked)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.modelMode }))
    expect(screen.getByRole('button', { name: COPY.scene.remove })).toBeDefined()
    editor.getState().dispose()
  })

  test('face torta: pergunta antes, e o sim divide e pinta num passo só', async () => {
    let n = 0
    const nextId = () => `torta${++n}`
    const base = migrateLegacyModel(makeModel({ parts: [] })).document
    const withBox = addScenePrimitive(base, 'box', 'pedra', nextId)
    const id = withBox.nodes.at(-1)!.id
    const mesh = convertSceneNodesToMesh(withBox, [id], nextId)
    const bent = editSceneMesh(
      mesh,
      id,
      (source) => {
        const point = source.vertices.v_111!
        return {
          ...source,
          vertices: { ...source.vertices, v_111: [point[0] + 0.3, point[1] + 0.5, point[2] + 0.4] },
        }
      },
      nextId,
    )
    const { editor, stage, tap } = mount(bent)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    tap(id, 'px')
    expect(stage.target).toBeNull()
    expect(editor.getState().asset).toBe(bent)
    expect(screen.getByText(SCENE_PAINT_COPY.crooked(3))).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.split }))
    expect(stage.target?.nodeId).toBe(id)
    expect(screen.queryByRole('button', { name: SCENE_PAINT_COPY.split })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.geometries).toEqual(bent.geometries)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().dispose()
  })
})

describe('"+ Nova cor" na aba Pintar', () => {
  test('N passos do seletor viram UMA cor, que vira a do lápis, e UM desfazer', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap, drag, view } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const colors = resolvePaletteColors(editor.getState().asset).length
    const input = view.container.querySelector<HTMLInputElement>(
      'input[name="molda-scene-new-color"]',
    )!
    // O seletor nativo dispara `input` a cada passo do arrasto e `change` só ao fechar.
    fireEvent.input(input, { target: { value: '#123456' } })
    fireEvent.input(input, { target: { value: '#234567' } })
    fireEvent.input(input, { target: { value: '#345678' } })
    expect(editor.getState().asset.extraColors).toEqual(['#345678'])
    expect(swatch(editor.getState().asset, colors).getAttribute('aria-pressed')).toBe('true')
    fireEvent.change(input, { target: { value: '#345678' } })
    await act(async () => {
      await Promise.resolve()
    })
    drag([
      [9, 9],
      [10, 9],
    ])
    const painted = editor.getState().asset.images.at(-1)!.layers[0]!.pixels
    expect(painted.includes(colors)).toBe(true)
    // Desfazer o traço, e depois a cor: um passo cada. O lápis volta a uma cor que existe.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.extraColors).toBeUndefined()
    drag([[9, 9]])
    expect(editor.getState().asset.images.at(-1)!.layers[0]!.pixels.includes(colors)).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
    editor.getState().dispose()
  })
})

describe('a cor e o acabamento da peça, no Modelar', () => {
  test('tocar numa cor pinta só a peça escolhida, mesmo com o material dividido', async () => {
    const { document, door, wall } = twoBoxes()
    const shared: MoldaSceneDocument = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === wall && node.kind === 'mesh'
          ? { ...node, materialId: material(document, door).id }
          : node,
      ),
    }
    const { editor, stage, tap } = mount(shared)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    const before = material(shared, door)
    fireEvent.click(swatch(shared, 3))
    const next = editor.getState().asset
    expect(material(next, door).baseColor).toEqual({ kind: 'palette', index: 3 })
    expect(material(next, wall)).toEqual(before)
    expect(swatch(next, 3).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.materialPresets.metal }))
    expect(material(editor.getState().asset, door)).toMatchObject({ metalness: 1 })
    expect(
      screen
        .getByRole('button', { name: COPY.scene.materialPresets.metal })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.materials).toEqual(shared.materials)
    expect(editor.getState().asset.nodes).toEqual(shared.nodes)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().dispose()
  })
})
