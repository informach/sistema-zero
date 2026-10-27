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
import {
  addScenePrimitive,
  convertSceneNodesToMesh,
  editSceneMesh,
  groupSceneNodes,
  setSceneNodeFlag,
  transformSceneNodes,
} from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { buildSceneGeometry } from '../../../scene/geometry'
import type { ScenePaintContact, ScenePaintTarget } from '../../../scene/imagePaint'
import { identityMatrix } from '../../../scene/matrix'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { sceneFaceViewTexel, scenePaintFaceView } from '../../../scene/paintFaceView'
import { scenePaintFaceBounds } from '../../../scene/paintSurfaceBounds'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { createGalleryStore } from '../../../state/galleryStore'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { frontControls } from '../../../testing/domContract'
import { makeModel, makeTexture } from '../../../testing/fixtures'
import { sceneBentPaint } from '../../../testing/sceneBentPaint'
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

test('Pintar oferece criação de textura por peça com densidade de 16px a 512px', async () => {
  const f = twoBoxes()
  const { editor, view } = mount(f.document)
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Pintar' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('porta') }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar textura' }))
    const dialog = screen.getByRole('dialog', { name: 'Criar textura' })
    const density = within(dialog).getByRole('combobox', { name: 'Densidade de pixels' })
    expect((density as HTMLSelectElement).options).toHaveLength(6)
    fireEvent.change(density, { target: { value: '32' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar e aplicar' }))
    const first = editor.getState().asset
    expect(first.images.at(-1)?.texelsPerUnit).toBe(32)
    expect(first.nodes.find((node) => node.id === f.door && node.kind === 'mesh')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('parede') }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar textura' }))
    const secondDialog = screen.getByRole('dialog', { name: 'Criar textura' })
    fireEvent.click(within(secondDialog).getByRole('button', { name: 'Criar e aplicar' }))
    const second = editor.getState().asset
    expect(second.images.at(-1)?.texelsPerUnit).toBe(1)
    expect(second.images.find((image) => image.id === first.images.at(-1)?.id)?.texelsPerUnit).toBe(
      32,
    )
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('Organizar quadradinhos respects inherited group locks as well as unlocked pieces', async () => {
  const f = twoBoxes()
  const grouped = groupSceneNodes(f.document, [f.door], { nextId: () => 'locked-group' })
  const source = setSceneNodeFlag(grouped, ['locked-group'], 'locked', true)
  const { editor, view } = mount(source)
  try {
    fireEvent.click(await screen.findByRole('button', { name: COPY.scene.select('porta') }))
    fireEvent.click(screen.getByRole('button', { name: 'Pintar' }))
    fireEvent.click(screen.getByText('Mais ajustes do palco'))
    const organize = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Organizar mapa…',
    })
    expect(organize.disabled).toBe(true)
    expect(editor.getState().saveSnapshot()).toBe(source)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('parede') }))
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Organizar mapa…' }).disabled,
    ).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
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

test('the sheet divider applies the release position even without an intermediate pointer move', async () => {
  const { document, door } = twoBoxes()
  const { editor, tap, view, stage } = mount(document)
  try {
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: 'Pintar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Folha de pintura' }))
    const divider = await screen.findByRole('separator', { name: 'Largura da folha' })
    divider.parentElement!.getBoundingClientRect = () => new DOMRect(100, 0, 1000, 500)
    let captured: number | null = null
    Object.assign(divider, {
      setPointerCapture: (id: number) => {
        captured = id
      },
      hasPointerCapture: (id: number) => captured === id,
      releasePointerCapture: () => {
        captured = null
      },
    })
    const before = editor.getState().content
    fireEvent.pointerDown(divider, { pointerId: 1, button: 0, clientX: 480 })
    fireEvent.pointerUp(divider, { pointerId: 1, button: 0, clientX: 650 })
    expect(Number(divider.getAttribute('aria-valuenow'))).toBeCloseTo(55, 8)
    expect(editor.getState().content).toBe(before)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

function customColorInput() {
  act(() => {
    const details = screen
      // O "+" da barra de cores: o resumo e o título do popover moram no mesmo <details>.
      .getAllByText(SCENE_PAINT_COPY.customColor)[0]!
      .closest('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
  })
  return screen.getByLabelText('Cor hexadecimal') as HTMLInputElement
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
    document: null as MoldaSceneDocument | null,
    target: null as ScenePaintTarget | null,
    mode: null as ScenePaintMode | null,
    mirror: false,
  }
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    stage.callbacks = callbacks
    const port: SceneViewportPort = {
      setDocument: (next) => {
        stage.document = next
        return []
      },
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

test('nível intermediário cria uma textura e continua pintando no modelo', async () => {
  const { document, door } = twoBoxes()
  const { editor, stage, tap, view } = mount(document, (node) => (
    <MoldaToolAccessProvider access={{ allow: moldaToolFamilyIds(['basic', 'intermediate']) }}>
      {node}
    </MoldaToolAccessProvider>
  ))
  try {
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    fireEvent.click(screen.getByRole('button', { name: 'Folha de pintura' }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.scene.appearanceTitle }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.scene.imageCreate }))
    const dialog = screen.getByRole('dialog', { name: COPY.scene.imageCreate })
    fireEvent.click(within(dialog).getByRole('button', { name: COPY.scene.imageCreateApply }))
    await waitFor(() =>
      expect(stage.target?.imageId).toBe(editor.getState().asset.images.at(-1)?.id),
    )
    expect(screen.queryByRole('dialog', { name: COPY.scene.imageCreate })).toBeNull()
    expect(screen.getByRole('region', { name: 'Área Folha de pintura' })).toBeTruthy()
    expect(
      editor.getState().asset.materials.find((entry) => entry.id === stage.target?.materialId)
        ?.colorImageId,
    ).toBe(stage.target?.imageId)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('Modelar mostra a prévia booleana e confirma em um único desfazer', async () => {
  const { document, door, wall } = twoBoxes()
  const offset = identityMatrix()
  offset[12] = 1
  const moved = transformSceneNodes(document, [wall], offset)
  const { editor, stage, view } = mount(moved)
  try {
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    act(() => {
      stage.callbacks!.select(door, false)
      stage.callbacks!.select(wall, true)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Diferença' }))
    expect(editor.getState().asset).toBe(moved)
    await waitFor(() => expect(stage.document?.nodes.some((node) => node.id === wall)).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(stage.document?.nodes.some((node) => node.id === wall)).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Diferença' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar resultado' }))
    expect(editor.getState().asset.nodes.some((node) => node.id === wall)).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.nodes.some((node) => node.id === wall)).toBe(true)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('a miniatura atualizada durante o cálculo não descarta a prévia booleana', async () => {
  const { document, door, wall } = twoBoxes()
  const offset = identityMatrix()
  offset[12] = 1
  const { editor, stage, view } = mount(transformSceneNodes(document, [wall], offset))
  try {
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    act(() => {
      stage.callbacks!.select(door, false)
      stage.callbacks!.select(wall, true)
    })
    fireEvent.click(screen.getByRole('button', { name: 'União' }))
    act(() => editor.getState().setThumb('updated-thumbnail'))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar resultado' }))
    expect(editor.getState().asset.thumb).toBe('updated-thumbnail')
    expect(editor.getState().asset.nodes.some((node) => node.id === wall)).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

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
  test('grade e giro ficam nos controles do palco e da ferramenta, fora da barra de pincéis', async () => {
    const { document, door } = twoBoxes()
    const { editor, view, tap } = mount(document)
    try {
      tap(door)
      fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
      const rail = view.container.querySelector('.mld-workshop-rail')
      expect(rail?.textContent).not.toContain('Quadradinhos')
      expect(rail?.textContent).not.toContain(SCENE_PAINT_COPY.rotate)
      expect(rail?.textContent).not.toContain('Mais pincéis')
      const options = screen
        .getByText('Mais opções da peça', { selector: 'summary' })
        .closest('details')!
      fireEvent.click(options.querySelector('summary')!)
      const rotate = screen.getByRole('button', { name: SCENE_PAINT_COPY.rotate })
      expect(rotate.closest('.mld-workshop-rail')).toBeNull()
      fireEvent.click(screen.getByText('Mais ajustes do palco'))
      const grid = screen.getByRole('button', { name: 'Mostrar quadradinhos' })
      expect(grid.getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(grid)
      expect(grid.getAttribute('aria-pressed')).toBe('true')
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('um modelo aberto pode ganhar interior pintável em um passo de desfazer', async () => {
    const { document, door } = twoBoxes()
    const converted = convertSceneNodesToMesh(document, [door])
    const open = editSceneMesh(converted, door, (mesh) => {
      const faces = { ...mesh.faces }
      delete faces.py
      return { ...mesh, faces }
    })
    const { editor, stage, view, tap } = mount(open)
    try {
      await waitFor(() => expect(stage.callbacks).not.toBeNull())
      tap(door, 'px')
      fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
      fireEvent.click(screen.getByText('Mais opções da peça', { selector: 'summary' }))
      fireEvent.click(screen.getByRole('button', { name: 'Criar lado interno pintável' }))
      const current = editor.getState().asset
      const node = current.nodes.find((entry) => entry.id === door)!
      if (node.kind !== 'mesh') throw new Error('Expected mesh')
      const mesh = current.geometries.find((entry) => entry.id === node.geometryId)!
      if (mesh.kind !== 'mesh') throw new Error('Expected mesh')
      expect(Object.keys(mesh.faces)).toHaveLength(10)
      expect(screen.queryByRole('button', { name: 'Criar lado interno pintável' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(open.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      const insideFace = Object.keys(mesh.faces).find(
        (id) => mesh.faces[id]!.materialId !== undefined,
      )!
      const triangle = buildSceneGeometry(mesh).faceIds.indexOf(insideFace)
      act(() => {
        stage.callbacks!.paint!.begin({
          kind: 'surface',
          nodeId: door,
          faceId: insideFace,
          triangle,
          barycentric: [1 / 3, 1 / 3, 1 / 3],
          frame: 0,
        })
        stage.callbacks!.paint!.end(true)
      })
      expect(editor.getState().asset.images.length).toBeGreaterThan(open.images.length)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('um traço direto numa peça torta oferece preparação junto das cores, sem mudar a criação antes da escolha', async () => {
    const { document, nodeId } = sceneBentPaint()
    const { editor, stage, view } = mount(document)
    try {
      await waitFor(() => expect(stage.callbacks).not.toBeNull())
      fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
      const geometry = document.geometries.find((entry) => entry.kind === 'mesh')!
      const buffers = buildSceneGeometry(geometry)
      act(() => {
        stage.callbacks!.paint!.begin({
          kind: 'surface',
          nodeId,
          faceId: 'nx',
          triangle: buffers.faceIds.indexOf('nx'),
          barycentric: [1 / 3, 1 / 3, 1 / 3],
          frame: 0,
        })
      })
      const colors = screen.getByRole('region', { name: SCENE_PAINT_COPY.pieceCard })
      const prepare = within(colors).getByRole('button', { name: SCENE_PAINT_COPY.split })
      expect(screen.queryByRole('alert')).toBeNull()
      expect(editor.getState().asset).toBe(document)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(prepare)
      expect(stage.target?.nodeId).toBe(nodeId)
      act(() => {
        stage.callbacks!.paint!.begin({ point: [1, 1], region: 'face' })
        stage.callbacks!.paint!.end(true)
      })
      expect(editor.getState().canUndo).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(document.geometries)
      expect(editor.getState().asset.images).toEqual(document.images)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('a cor de fundo de uma peça torta muda sem preparar UV, criar imagens ou dividir faces', async () => {
    const { document, nodeId } = sceneBentPaint()
    const { editor, stage, view } = mount(document)
    try {
      await waitFor(() => expect(stage.callbacks).not.toBeNull())
      fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
      fireEvent.click(screen.getByRole('button', { name: 'Balde' }))
      fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.fillScopes.base }))
      fireEvent.click(swatch(document, 2))
      const geometry = document.geometries.find((entry) => entry.kind === 'mesh')!
      const buffers = buildSceneGeometry(geometry)
      act(() => {
        stage.callbacks!.paint!.begin({
          kind: 'surface',
          nodeId,
          faceId: 'nx',
          triangle: buffers.faceIds.indexOf('nx'),
          barycentric: [1 / 3, 1 / 3, 1 / 3],
          frame: 0,
        })
      })
      expect(material(editor.getState().asset, nodeId).baseColor).not.toEqual(
        material(document, nodeId).baseColor,
      )
      expect(editor.getState().asset.geometries).toEqual(document.geometries)
      expect(editor.getState().asset.images).toEqual(document.images)
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.queryByRole('button', { name: SCENE_PAINT_COPY.split })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.materials).toEqual(document.materials)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('pintar outra peça pronta retira o pedido de preparação da peça anterior', async () => {
    const bent = sceneBentPaint()
    const document = addScenePrimitive(bent.document, 'box', 'outra peça')
    const flatId = document.nodes.at(-1)!.id
    const { editor, stage, view } = mount(document)
    const contact = (nodeId: string): ScenePaintContact => {
      const source = editor.getState().content
      const node = source.nodes.find((entry) => entry.id === nodeId)!
      if (node.kind !== 'mesh') throw new Error('Missing painted piece')
      const geometry = source.geometries.find((entry) => entry.id === node.geometryId)!
      return {
        kind: 'surface',
        nodeId,
        faceId: 'nx',
        triangle: buildSceneGeometry(geometry).faceIds.indexOf('nx'),
        barycentric: [1 / 3, 1 / 3, 1 / 3],
        frame: 0,
      }
    }
    try {
      await waitFor(() => expect(stage.callbacks).not.toBeNull())
      fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
      act(() => stage.callbacks!.paint!.begin(contact(bent.nodeId)))
      expect(screen.getByRole('button', { name: SCENE_PAINT_COPY.split })).toBeDefined()
      act(() => {
        expect(stage.callbacks!.paint!.begin(contact(flatId))).toBe(true)
        stage.callbacks!.paint!.end(true)
      })
      expect(screen.queryByRole('button', { name: SCENE_PAINT_COPY.split })).toBeNull()
      expect(screen.queryByRole('alert')).toBeNull()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('visitar Pintar e salvar conserva o documento confirmado; o primeiro traço guarda a superfície', async () => {
    const { document, door } = twoBoxes()
    const { editor, view, stage, tap, drag } = mount(document)
    try {
      await waitFor(() => expect(stage.callbacks !== null).toBe(true))
      tap(door)
      fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
      expect(editor.getState().content.images.length).toBeGreaterThan(document.images.length)
      await act(() => editor.getState().flush())
      expect(editor.getState().saveSnapshot()).toBe(document)
      expect(editor.getState().savedAsset).toBe(document)
      expect(editor.getState().canUndo).toBe(false)
      drag([
        [1, 1],
        [2, 1],
      ])
      await act(() => editor.getState().flush())
      expect(editor.getState().savedAsset.images.length).toBeGreaterThan(document.images.length)
      act(() => editor.getState().undo())
      expect(editor.getState().content.images).toEqual(document.images)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('da oficina aberta ao primeiro traço: 3 interações à vista, nenhum painel aberto', async () => {
    const { document, door } = twoBoxes()
    const { editor, view, stage, tap, drag } = mount(document, (children) => (
      <MoldaToolAccessProvider access={{ allow: moldaToolFamilyIds(['basic']) }}>
        {children}
      </MoldaToolAccessProvider>
    ))
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    // 1. Tocar na peça, no palco.
    tap(door)
    // 2. A aba Pintar, que está à vista.
    const tab = screen.getByRole('button', { name: SCENE_PAINT_COPY.tab })
    expect(frontControls(view.container)).toContain(`button: ${SCENE_PAINT_COPY.tab}`)
    fireEvent.click(tab)
    expect(stage.mode).toBe('paint')
    expect(stage.target?.nodeId).toBe(door)
    // A superfície nasceu sem mudar a aparência e ainda sem passo de desfazer.
    const prepared = editor.getState().asset
    expect(editor.getState().canUndo).toBe(false)
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
    // O preparo e o primeiro traço são UM passo: um desfazer volta para "sem imagem", e a
    // pintura fecha sem alerta.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(material(editor.getState().asset, door).colorImageId).toBeUndefined()
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    await waitFor(() => expect(stage.target).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(
      screen
        .getByRole('button', { name: SCENE_PAINT_COPY.onlyThisPiece })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    editor.getState().dispose()
  })

  test('olhar a aba Pintar não apaga o Refazer nem muda a criação', async () => {
    const { document, door, wall } = twoBoxes()
    const { editor, stage, tap, drag } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    // Um passo no Modelar, desfeito: há o que refazer.
    fireEvent.click(swatch(document, 3))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().canRedo).toBe(true)
    const looked = editor.getState().asset
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    expect(stage.target?.nodeId).toBe(door)
    expect(editor.getState().canRedo).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.modelMode }))
    expect(editor.getState().asset).toBe(looked)
    expect(editor.getState().canRedo).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    expect(material(editor.getState().asset, door).baseColor).toEqual({ kind: 'palette', index: 3 })
    // Em Pintar: desfazer um traço e tocar noutra peça, ainda sem tinta, também não apaga.
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    drag([[9, 9]])
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().canRedo).toBe(true)
    tap(wall)
    expect(stage.target?.nodeId).toBe(wall)
    expect(editor.getState().canRedo).toBe(true)
    editor.getState().dispose()
  })

  test('tocar em outra peça troca o alvo e mantém a cor, a ferramenta e a largura', async () => {
    const { document, door, wall } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    expect(stage.target).toBeNull()
    expect(
      screen
        .getByRole('button', { name: SCENE_PAINT_COPY.onlyThisPiece })
        .getAttribute('aria-pressed'),
    ).toBe('false')
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
    expect(
      screen
        .getByRole('button', { name: SCENE_PAINT_COPY.onlyThisPiece })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    // Soltar a peça sem pintar devolve a criação como estava, sem passo de desfazer.
    expect(editor.getState().asset).toBe(document)
    expect(editor.getState().canUndo).toBe(false)
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
    expect(editor.getState().asset.geometries).not.toEqual(bent.geometries)
    // Dividir e o primeiro traço são UM passo de desfazer.
    act(() => {
      const paint = stage.callbacks!.paint!
      paint.begin({ point: [1, 1], region: 'face' })
      paint.end(true)
    })
    expect(editor.getState().canUndo).toBe(true)
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
    expect(editor.getState().canUndo).toBe(false)
    const prepared = editor.getState().asset
    const sheet = screen.getByRole('button', { name: SCENE_PAINT_COPY.closeUpSheet })
    const width = bounds.x1 - bounds.x0 + 1
    const height = bounds.y1 - bounds.y0 + 1
    sheet.querySelector('canvas')!.getBoundingClientRect = () =>
      new DOMRect(0, 0, width * 10, height * 10)
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
    expect(screen.getByRole('button', { name: SCENE_PAINT_COPY.closeUpSheet })).toBe(sheet)
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
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    expect(prepared.images).toHaveLength(document.images.length + 1)
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
    // A outra peça não muda, e um desfazer tira a roupa inteira (com o preparo da tinta).
    expect(material(editor.getState().asset, wall)).toEqual(material(prepared, wall))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().dispose()
  })
})

describe('atalhos do editor antigo na aba Pintar', () => {
  const pressed = (name: string) =>
    screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'

  test('B, E, G, I, 1 a 3, M, R e F trocam a ferramenta; a dica mostra a tecla', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap, view } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const shell = view.getByRole('region', { name: COPY.scene.title })
    const press = (key: string) => fireEvent.keyDown(shell, { key })
    expect(screen.getByRole('button', { name: COPY.scene.paintPencil }).title).toContain('(B)')
    expect(press('e')).toBe(false)
    expect(pressed(COPY.scene.paintEraser)).toBe(true)
    press('g')
    expect(pressed(COPY.scene.paintFill)).toBe(true)
    press('i')
    expect(pressed(COPY.scene.paintPicker)).toBe(true)
    press('b')
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
  test('escolher tinta não altera o projeto; a cor entra com o primeiro traço e permanece escolhida após desfazer', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap, drag } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const colors = resolvePaletteColors(editor.getState().asset).length
    const input = customColorInput()
    // O seletor nativo dispara `input` a cada passo do arrasto e `change` só ao fechar.
    fireEvent.change(input, { target: { value: '#123456' } })
    fireEvent.change(input, { target: { value: '#234567' } })
    fireEvent.change(input, { target: { value: '#345678' } })
    expect(editor.getState().asset.extraColors).toBeUndefined()
    expect(editor.getState().canUndo).toBe(false)
    expect(input.value).toBe('#345678')
    fireEvent.blur(input)
    await act(async () => {
      await Promise.resolve()
    })
    drag([
      [9, 9],
      [10, 9],
    ])
    const painted = editor.getState().asset.images.at(-1)!.layers[0]!.pixels
    expect(painted.includes(colors)).toBe(true)
    // O preparo, a cor e o traço pertencem ao mesmo passo de Desfazer.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.extraColors).toBeUndefined()
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    // A tinta continua escolhida mesmo quando o desfazer remove a cor da paleta do projeto.
    tap(door)
    drag([[9, 9]])
    const again = editor.getState().asset.images.at(-1)!
    expect(again.layers[0]!.pixels.includes(colors)).toBe(true)
    expect(again.layers[0]!.pixels[9 * again.width + 9]).toBe(colors)
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

describe('o review da aba Pintar', () => {
  test('girar e "de perto" sem a face (a folha inteira) só explicam, sem mexer na imagem', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const prepared = editor.getState().asset
    for (const tool of [SCENE_PAINT_COPY.rotate, SCENE_PAINT_COPY.closeUp]) {
      fireEvent.click(screen.getByRole('button', { name: tool }))
      act(() => {
        stage.callbacks!.paint!.begin({ point: [1, 1], region: 'folha' })
      })
      expect(screen.getByRole('alert').textContent).toBe(SCENE_PAINT_COPY.faceOnly)
      expect(editor.getState().asset).toBe(prepared)
    }
    expect(screen.queryByRole('region', { name: SCENE_PAINT_COPY.closeUp })).toBeNull()
    editor.getState().dispose()
  })

  test('com o espelho, o balde enche os dois lados num passo de desfazer', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.mirror }))
    expect(screen.getByText(SCENE_PAINT_COPY.mirrorOn)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintFill }))
    const imageId = stage.target!.imageId
    const image = () => editor.getState().asset.images.find((entry) => entry.id === imageId)!
    const node = editor.getState().asset.nodes.find((entry) => entry.id === door)
    if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
    const geometry = editor
      .getState()
      .asset.geometries.find((entry) => entry.id === node.geometryId)!
    const px = scenePaintFaceBounds(geometry, 'px', image())!
    const nx = scenePaintFaceBounds(geometry, 'nx', image())!
    act(() => {
      stage.callbacks!.paint!.begin({
        point: [px.x0, px.y0],
        region: 'px',
        faceId: 'px',
        bounds: px,
        mirror: { point: [nx.x0, nx.y0], region: 'nx', faceId: 'nx', bounds: nx },
      })
    })
    await waitFor(() => expect(editor.getState().asset).not.toBe(document))
    await waitFor(() => expect(image().layers[0]!.pixels[nx.y0 * image().width + nx.x0]).toBe(7))
    expect(image().layers[0]!.pixels[px.y0 * image().width + px.x0]).toBe(7)
    // Só as duas faces: a de cima continua sem tinta.
    const py = scenePaintFaceBounds(geometry, 'py', image())!
    expect(image().layers[0]!.pixels[py.y0 * image().width + py.x0]).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.images).toEqual(document.images)
    editor.getState().dispose()
  })

  test('digitar no hexadecimal não aciona atalhos de pintura', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const input = customColorInput()
    input.focus()
    fireEvent.keyDown(input, { key: 'e' })
    expect(
      screen.getByRole('button', { name: COPY.scene.paintEraser }).getAttribute('aria-pressed'),
    ).toBe('false')
    editor.getState().dispose()
  })

  test('no nível de entrada, o erro que aponta o caminho avançado diz o que dá para fazer', async () => {
    const { document, door } = twoBoxes()
    const relief = {
      id: 'relevo',
      name: 'relevo',
      width: 4,
      height: 4,
      encoding: 'rgba' as const,
      layers: [
        { id: 'r', name: 'r', visible: true, opacity: 1, pixels: new Uint8Array(4 * 4 * 4) },
      ],
    }
    const doorMaterial = material(document, door)
    const withMap: MoldaSceneDocument = {
      ...document,
      images: [...document.images, relief],
      materials: document.materials.map((entry) =>
        entry.id === doorMaterial.id ? { ...entry, normalImageId: 'relevo' } : entry,
      ),
    }
    const basic = { allow: moldaToolFamilyIds(['basic']) }
    const { editor, stage, tap } = mount(withMap, (node) => (
      <MoldaToolAccessProvider access={basic}>{node}</MoldaToolAccessProvider>
    ))
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    tap(door)
    expect(stage.target).toBeNull()
    expect(screen.getByRole('alert').textContent).toBe(SCENE_PAINT_COPY.lockedMaps)
    expect(editor.getState().asset).toBe(withMap)
    editor.getState().dispose()
  })
})

describe('as três zonas da aba Pintar (27/10/2026)', () => {
  test('a barra de cores fica no pé do palco: potinho com o nome, a paleta e o "+"', async () => {
    const { document } = twoBoxes()
    const { editor, stage } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const bar = screen.getByRole('region', { name: SCENE_PAINT_COPY.colors })
    expect(bar.className).toContain('mld-color-bar')
    // A barra é irmã do palco, fora do painel direito.
    expect(bar.closest('.mld-workshop-stage')).not.toBeNull()
    expect(bar.closest('.mld-workshop-inspector')).toBeNull()
    const red = resolvePaletteColors(document)[2]!
    fireEvent.click(within(bar).getByRole('button', { name: COPY.a11y.colorSwatch(2, red) }))
    expect(within(bar).getByText('Vermelho')).toBeDefined()
    expect(
      within(bar).getAllByText(SCENE_PAINT_COPY.customColor)[0]!.closest('details'),
    ).not.toBeNull()
    // Escolher a cor é sessão: o projeto não muda antes do primeiro traço.
    expect(editor.getState().asset).toBe(document)
    // Fora do Pintar a barra some.
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.modelMode }))
    expect(screen.queryByRole('region', { name: SCENE_PAINT_COPY.colors })).toBeNull()
    editor.getState().dispose()
  })

  test('"Só nesta peça" mora na coluna e alterna o alcance do pincel; o palco fica sem "Pintar em"', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    tap(door)
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    expect(screen.queryByRole('group', { name: 'Pintar em' })).toBeNull()
    const only = screen.getByRole('button', { name: SCENE_PAINT_COPY.onlyThisPiece })
    expect(only.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(only)
    expect(only.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(only)
    expect(only.getAttribute('aria-pressed')).toBe('false')
    editor.getState().dispose()
  })

  test('o bloco "Jeito" segue a ferramenta: tamanho, como apagar e o que o balde enche', async () => {
    const { document } = twoBoxes()
    const { editor, stage } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    // Pincel: as três bolinhas, sem a legenda "1 px" escrita.
    expect(screen.getByRole('button', { name: SCENE_PAINT_COPY.width[1] })).toBeDefined()
    expect(screen.queryByText(SCENE_PAINT_COPY.width[1])).toBeNull()
    expect(screen.queryByRole('button', { name: SCENE_PAINT_COPY.eraseModes.cutout })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintEraser }))
    expect(screen.getByRole('button', { name: SCENE_PAINT_COPY.width[1] })).toBeDefined()
    const cutout = screen.getByRole('button', { name: SCENE_PAINT_COPY.eraseModes.cutout })
    fireEvent.click(cutout)
    expect(cutout.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintFill }))
    expect(screen.queryByRole('button', { name: SCENE_PAINT_COPY.width[1] })).toBeNull()
    expect(
      screen
        .getByRole('button', { name: SCENE_PAINT_COPY.fillScopes.area })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    // Os ajustes saíram do painel direito: nada de "Ajustes da ferramenta" lá.
    expect(screen.queryByText('Ajustes da ferramenta')).toBeNull()
    editor.getState().dispose()
  })

  test('as texturas só aparecem com uma peça escolhida, no cartão da peça', async () => {
    const { document, door } = twoBoxes()
    const { editor, stage, tap } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    expect(screen.queryByRole('button', { name: 'Criar textura' })).toBeNull()
    expect(screen.getByText(SCENE_PAINT_COPY.choosePieceAll)).toBeDefined()
    tap(door)
    const card = screen.getByRole('region', { name: SCENE_PAINT_COPY.pieceCard })
    expect(within(card).getByRole('button', { name: 'Criar textura' })).toBeDefined()
    expect(within(card).getByRole('button', { name: SCENE_PAINT_COPY.useImage })).toBeDefined()
    editor.getState().dispose()
  })

  test('os ladrilhos não desenham a tecla; o atalho fica no title e no aria-keyshortcuts', async () => {
    const { document } = twoBoxes()
    const { editor, stage, view } = mount(document)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: SCENE_PAINT_COPY.tab }))
    const pencil = screen.getByRole('button', { name: COPY.scene.paintPencil })
    expect(pencil.textContent).toBe(COPY.scene.paintPencil)
    expect(pencil.getAttribute('aria-keyshortcuts')).toBeTruthy()
    expect(pencil.title).toContain(`(${pencil.getAttribute('aria-keyshortcuts')})`)
    // O pingo de tinta no canto do Pincel e do Balde.
    expect(pencil.querySelector('.mld-tile-dot')).not.toBeNull()
    expect(view.container.querySelector('.mld-tile-key')).toBeNull()
    editor.getState().dispose()
  })
})
