/**
 * A aba Pintar do jeito da criança: tocar na peça e pintar.
 *
 * ⚠️ A régua deste arquivo mede PASSOS, não só botões: da oficina aberta até o primeiro traço,
 * no máximo 3 interações, todas em controles à vista (`frontControls`) ou no próprio palco, e
 * nenhum `<details>` aberto no caminho. O editor antigo fazia isso em 2 toques; a oficina nova
 * pedia de 4 a 6 passos, por um painel fechado.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { COPY } from '../../../core/copy'
import { resolvePaletteColors } from '../../../core/sanitize'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { structuredBytes } from '../../../core/structuredBytes'
import { moldaToolFamilyIds } from '../../../core/toolFamilies'
import { addScenePrimitive, convertSceneNodesToMesh, editSceneMesh } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { ScenePaintTarget } from '../../../scene/imagePaint'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { sceneFaceViewTexel, scenePaintFaceView } from '../../../scene/paintFaceView'
import { scenePaintFaceBounds } from '../../../scene/paintSurfaceBounds'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { createGalleryStore } from '../../../state/galleryStore'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { frontControls } from '../../../testing/domContract'
import { makeModel, makeTexture } from '../../../testing/fixtures'
import type {
  ScenePaintMode,
  SceneViewportCallbacks,
  SceneViewportFactory,
  SceneViewportPort,
} from '../../../viewport/sceneViewportTypes'
import { MoldaAppProvider } from '../../appContext'
import { MoldaToolAccessProvider } from '../../toolAccess'
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

function mount(asset: MoldaSceneDocument, wrap: (node: ReactNode) => ReactNode = (node) => node) {
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
    mirror: false,
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
      setPaintMirror: (enabled) => {
        stage.mirror = enabled
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
  const view = render(wrap(<SceneWorkshop editor={editor} viewportFactory={factory} />))
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

describe('pintar de perto', () => {
  test('o toque escolhe a face; a face ampliada recebe o traço preso a ela; Esc volta', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap, view } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const imageId = stage.target!.imageId
    const image = () => editor.getState().asset.images.find((entry) => entry.id === imageId)!
    const node = editor.getState().asset.nodes.find((entry) => entry.id === door)
    if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
    const geometry = editor
      .getState()
      .asset.geometries.find((entry) => entry.id === node.geometryId)!
    const bounds = scenePaintFaceBounds(geometry, 'py', image())!
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.closeUp }))
    expect(screen.getByText(SCENE_PAINT_COPY.closeUpHint)).toBeDefined()
    act(() => {
      stage.callbacks!.paint!.begin({
        point: [bounds.x0, bounds.y0],
        region: 'py',
        faceId: 'py',
        bounds,
      })
    })
    // Escolher a face não pinta nada: o lápis volta, agora de perto.
    expect(editor.getState().canUndo).toBe(true)
    const prepared = editor.getState().asset
    const sheet = screen.getByRole('img', { name: SCENE_PAINT_COPY.closeUpSheet })
    const width = bounds.x1 - bounds.x0 + 1
    const height = bounds.y1 - bounds.y0 + 1
    sheet.getBoundingClientRect = () => new DOMRect(0, 0, width * 10, height * 10)
    Object.assign(sheet, { setPointerCapture: () => {}, hasPointerCapture: () => false })
    fireEvent.pointerDown(sheet, { pointerId: 1, button: 0, clientX: 5, clientY: 5 })
    fireEvent.pointerUp(sheet, { pointerId: 1, button: 0, clientX: 5, clientY: 5 })
    // A face em pé: o canto de cima, à esquerda, na tela é o canto de cima da face vista de fora.
    // Na caixa, como no editor antigo, é a primeira linha da face na folha.
    const at = (x: number, y: number) => image().layers[0]!.pixels[y * image().width + x]
    expect(sceneFaceViewTexel(scenePaintFaceView(geometry, 'py', image())!, 0, 0)).toEqual([
      bounds.x0,
      bounds.y0,
    ])
    expect(at(bounds.x0, bounds.y0)).toBe(7)
    expect(editor.getState().asset).not.toBe(prepared)
    // "Pintar de perto" de novo, já de perto: o toque na face ampliada só devolve o lápis.
    const painted = editor.getState().asset
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.closeUp }))
    fireEvent.pointerDown(sheet, { pointerId: 2, button: 0, clientX: 15, clientY: 5 })
    expect(editor.getState().asset).toBe(painted)
    expect(screen.getByRole('img', { name: SCENE_PAINT_COPY.closeUpSheet })).toBe(sheet)
    expect(
      screen.getByRole('button', { name: COPY.scene.paintPencil }).getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.keyDown(view.getByRole('region', { name: COPY.scene.title }), { key: 'Escape' })
    expect(screen.queryByRole('region', { name: SCENE_PAINT_COPY.closeUp })).toBeNull()
    expect(stage.target?.nodeId).toBe(door)
    editor.getState().dispose()
  })
})

describe('espelho de pintura', () => {
  test('liga no palco, e um traço pinta os dois lados no mesmo desfazer', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const toggle = screen.getByRole('button', { name: SCENE_PAINT_COPY.mirror })
    fireEvent.click(toggle)
    expect(stage.mirror).toBe(true)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    const imageId = stage.target!.imageId
    const image = () => editor.getState().asset.images.find((entry) => entry.id === imageId)!
    const prepared = editor.getState().asset
    act(() => {
      const paint = stage.callbacks!.paint!
      paint.begin({ point: [2, 2], region: 'a', mirror: { point: [5, 2], region: 'b' } })
      paint.move({ point: [3, 2], region: 'a', mirror: { point: [4, 2], region: 'b' } })
      paint.end(true)
    })
    const row = (x: number) => image().layers[0]!.pixels[2 * image().width + x]
    expect([row(2), row(3), row(4), row(5)]).toEqual([7, 7, 7, 7])
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.images).toEqual(prepared.images)
    fireEvent.click(toggle)
    expect(stage.mirror).toBe(false)
    editor.getState().dispose()
  })
})

describe('girar a pintura da face', () => {
  test('um toque gira a pintura daquela face, e só dela; um passo de desfazer', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const imageId = stage.target!.imageId
    const image = () => editor.getState().asset.images.find((entry) => entry.id === imageId)!
    const node = editor.getState().asset.nodes.find((entry) => entry.id === door)
    if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
    const geometry = editor
      .getState()
      .asset.geometries.find((entry) => entry.id === node.geometryId)!
    const bounds = scenePaintFaceBounds(geometry, 'py', image())!
    const sample = { point: [bounds.x0, bounds.y0] as [number, number], region: 'py', bounds }
    act(() => {
      stage.callbacks!.paint!.begin(sample)
      stage.callbacks!.paint!.end(true)
    })
    const at = (x: number, y: number) => image().layers[0]!.pixels[y * image().width + x]
    expect(at(bounds.x0, bounds.y0)).toBe(7)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.rotate }))
    expect(screen.getByText(SCENE_PAINT_COPY.rotateHint)).toBeDefined()
    const painted = editor.getState().asset
    act(() => {
      stage.callbacks!.paint!.begin(sample)
    })
    // O canto de cima vai para a direita, como no "Girar a pele" antigo.
    expect(at(bounds.x0, bounds.y0)).toBe(0)
    expect(at(bounds.x1, bounds.y0)).toBe(7)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.images).toEqual(painted.images)
    editor.getState().dispose()
  })
})

describe('vestir com textura', () => {
  test('só aparece dentro do app, que tem a galeria das texturas', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    expect(stage.target?.nodeId).toBe(door)
    expect(screen.queryByRole('button', { name: COPY.editor.model.paint.apply.button })).toBeNull()
    editor.getState().dispose()
  })

  test('a textura da galeria veste a peça inteira, num passo de desfazer', async () => {
    const texture = makeTexture()
    const persistence = createMemoryPersistence([texture])
    const gallery = createGalleryStore(persistence)
    await gallery.getState().load()
    const scene = {
      listSummaries: async () => ({ summaries: [], issues: [] }),
      readProject: async () => null,
      rename: async () => false,
      remove: async () => false,
      duplicate: async () => null,
      subscribe: () => () => {},
    }
    const { document, door, wall } = twoBoxes()
    const { editor, stage, tap } = mount(document, (node) => (
      <MoldaAppProvider value={{ adapter: {}, persistence, scene, gallery }}>
        {node}
      </MoldaAppProvider>
    ))
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const imageId = stage.target!.imageId
    const prepared = editor.getState().asset
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.apply.button }))
    const dialog = screen.getByRole('dialog', { name: COPY.editor.model.paint.apply.title })
    fireEvent.click(within(dialog).getByRole('button', { name: texture.name }))
    fireEvent.click(
      within(dialog).getByRole('button', { name: COPY.editor.model.paint.apply.apply }),
    )
    await waitFor(() => expect(editor.getState().asset).not.toBe(prepared))
    const pixels = editor.getState().asset.images.find((entry) => entry.id === imageId)!
      .layers[0]!.pixels
    expect(pixels.some((value) => value !== 0)).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    // A outra peça não muda, e um desfazer tira a roupa inteira.
    expect(material(editor.getState().asset, wall)).toEqual(material(prepared, wall))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.images).toEqual(prepared.images)
    expect(stage.target?.nodeId).toBe(door)
    editor.getState().dispose()
  })
})

describe('atalhos do editor antigo na aba Pintar', () => {
  const pressed = (name: string) =>
    screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'

  test('P, E, G, I, 1 a 3, M, R e F trocam a ferramenta; a dica mostra a tecla', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap, view } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const shell = view.getByRole('region', { name: COPY.scene.title })
    const press = (key: string) => fireEvent.keyDown(shell, { key })
    expect(screen.getByRole('button', { name: COPY.scene.paintPencil }).title).toContain('(P)')
    expect(press('e')).toBe(false)
    expect(pressed(COPY.scene.paintEraser)).toBe(true)
    press('g')
    expect(pressed(COPY.scene.paintFill)).toBe(true)
    press('i')
    expect(pressed(COPY.scene.paintPicker)).toBe(true)
    press('p')
    expect(pressed(COPY.scene.paintPencil)).toBe(true)
    press('3')
    expect(pressed(SCENE_PAINT_COPY.width[3])).toBe(true)
    press('1')
    expect(pressed(SCENE_PAINT_COPY.width[1])).toBe(true)
    press('m')
    expect(stage.mirror).toBe(true)
    press('m')
    expect(stage.mirror).toBe(false)
    press('r')
    expect(pressed(SCENE_PAINT_COPY.rotate)).toBe(true)
    press('f')
    expect(pressed(SCENE_PAINT_COPY.closeUp)).toBe(true)
    // Tecla que não é da aba segue para o navegador, e nenhuma delas muda o documento.
    expect(press('k')).toBe(true)
    expect(editor.getState().canUndo).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().dispose()
  })

  test('no meio do traço a tecla não troca nada; trancada, também não, e o navegador não a recebe', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap, view } = mount(document, (node) => (
      <MoldaToolAccessProvider
        access={{
          allow: moldaToolFamilyIds(['basic', 'intermediate', 'professional']).filter(
            (id) => id !== 'paint.brush',
          ),
        }}
      >
        {node}
      </MoldaToolAccessProvider>
    ))
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const shell = view.getByRole('region', { name: COPY.scene.title })
    expect(fireEvent.keyDown(shell, { key: 'm' })).toBe(false)
    expect(stage.mirror).toBe(false)
    cleanup()
    editor.getState().dispose()
    const open = mount(document)
    await waitFor(() => expect(open.stage.callbacks).not.toBeNull())
    open.tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    act(() => {
      open.stage.callbacks!.paint!.begin({ point: [9, 9], region: 'face' })
    })
    const shellAgain = open.view.getByRole('region', { name: COPY.scene.title })
    expect(fireEvent.keyDown(shellAgain, { key: 'm' })).toBe(false)
    expect(open.stage.mirror).toBe(false)
    act(() => {
      open.stage.callbacks!.paint!.end(true)
    })
    open.editor.getState().dispose()
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
