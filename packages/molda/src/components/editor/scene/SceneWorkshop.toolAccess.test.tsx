/**
 * A oficina no NÍVEL DE ENTRADA (Explorador(a) de Mundos): o que a criança de 9 anos encontra.
 *
 * O `SceneWorkshop.contract.test.tsx` mede o PADRÃO, tudo liberado. Este mede a tela que a
 * criança vê de fato, com o portão por nível de carreira ligado, e prova a regra de ouro do
 * portão: trancar tira a AUTORIA, nunca a leitura.
 *
 * ⚠️ O portão é pedagógico, não de segurança: um controle trancado não é renderizado (nunca
 * `disabled`), e um documento que já usa uma família trancada abre, reproduz e exporta intacto.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { SCENE_TOOL_ACCESS_COPY } from '../../../core/sceneToolAccessCopy'
import { structuredBytes } from '../../../core/structuredBytes'
import {
  type MoldaToolAccess,
  type MoldaToolFamilyId,
  moldaToolFamilyIds,
  readMoldaToolAccess,
} from '../../../core/toolFamilies'
import { addScenePrimitive } from '../../../scene/commands'
import type { MoldaSceneDocument, SceneImage } from '../../../scene/document'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { readSceneDocument } from '../../../scene/readDocument'
import { createSceneSkin } from '../../../scene/skinCommands'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { controlInventory, frontControls, openEveryDisclosure } from '../../../testing/domContract'
import { makeModel } from '../../../testing/fixtures'
import { sceneAnimationClip } from '../../../testing/sceneAnimation'
import { makeSceneSkinFixture } from '../../../testing/sceneSkin'
import type {
  SceneTransformTool,
  SceneViewportCallbacks,
  SceneViewportFactory,
} from '../../../viewport/sceneViewportTypes'
import { MoldaToolAccessProvider } from '../../toolAccess'
import { SceneWorkshop } from './SceneWorkshop'
import { SCENE_COMMAND_ACCESS } from './sceneCommandAccess'
import { SCENE_COMMANDS } from './sceneCommandRegistry'

const copy = COPY.scene

/** O que o kids manda para o Explorador(a): o básico, e o que vem depois com o nome do posto. */
const BASIC: MoldaToolAccess = {
  allow: moldaToolFamilyIds(['basic']),
  upcoming: [
    {
      when: 'Abrem no nível Arquiteto(a) de Mundos',
      families: moldaToolFamilyIds(['intermediate']),
    },
    { when: 'Abrem no nível Lenda', families: moldaToolFamilyIds(['professional']) },
  ],
}
const basic = readMoldaToolAccess(BASIC)

/** `null` = sem provedor: tudo liberado, como o playground e os outros hosts. */
function mount(asset: MoldaSceneDocument, access: MoldaToolAccess | null = BASIC) {
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const stage = {
    callbacks: null as SceneViewportCallbacks | null,
    tools: [] as SceneTransformTool[],
  }
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    stage.callbacks = callbacks
    return {
      setDocument: () => [],
      setSelection: () => {},
      setIsolation: () => {},
      setView: () => {},
      frame: () => {},
      setTransformTool: (tool) => {
        stage.tools.push(tool)
      },
      setAreaTool: () => {},
      setComponentSelection: () => {},
      setPaintTarget: () => {},
      setImageFrame: () => {},
      setPose: () => {},
      setAnimationEditing: () => {},
      setSupportGuides: () => {},
      setSkinWeightTarget: () => {},
      setSkinPaintEnabled: () => {},
      setSkinPaintPreview: () => {},
      cancelGesture: () => {},
      renderThumb: () => null,
      dispose: () => {},
    }
  }
  const wrap = (node: ReactNode) =>
    access ? <MoldaToolAccessProvider access={access}>{node}</MoldaToolAccessProvider> : node
  const view = render(
    wrap(<SceneWorkshop editor={editor} viewportFactory={factory} onExit={() => {}} />),
  )
  return { editor, view, stage }
}

const withPiece = (): MoldaSceneDocument =>
  addScenePrimitive(migrateLegacyModel(makeModel()).document, 'box', 'Bloco')

/** Escolher como a criança escolhe: pelo botão da peça na hierarquia. */
function choosePiece(container: HTMLElement): void {
  const button = container.querySelector<HTMLButtonElement>('button[aria-label^="Escolher "]')
  if (!button) throw new Error('a hierarquia não ofereceu nenhuma peça para escolher')
  act(() => {
    button.click()
  })
}

async function openTab(name: string) {
  await act(async () => {
    screen.getByRole('button', { name }).click()
    await Promise.resolve()
  })
}

const names = (controls: string[]) =>
  controls.map((control) => control.replace(/^[a-z]+: /, '').replace(' [desligado]', ''))

/** Rótulos de controles que CRIAM ou MUDAM algo das famílias trancadas no nível de entrada. */
function lockedLabels(): string[] {
  const locked = (family: MoldaToolFamilyId) => !basic.can(family)
  const fromRegistry = SCENE_COMMANDS.filter(
    (command) =>
      SCENE_COMMAND_ACCESS[command.id as keyof typeof SCENE_COMMAND_ACCESS] !== 'always' &&
      locked(
        SCENE_COMMAND_ACCESS[command.id as keyof typeof SCENE_COMMAND_ACCESS] as MoldaToolFamilyId,
      ),
  ).map((command) => command.label)
  return [
    ...fromRegistry,
    copy.pivot,
    copy.dimensions,
    copy.curveDetail,
    copy.pathSettings,
    copy.mirrorOffset,
    copy.selectThrough,
    copy.skinBinding.open,
    copy.skinWeights.title,
    SCENE_PAINT_COPY.more,
    copy.animationCurve,
    copy.twoBone.title,
    NATIVE_IMPORT_COPY.open,
    copy.glbExport.formats.gltf,
    copy.glbExport.formats.obj,
    copy.glbExport.destinationDownload,
  ]
}

beforeEach(() => {
  cleanup()
})
afterEach(() => {
  cleanup()
})

describe('a oficina no nível de entrada', () => {
  /**
   * A CATRACA da criança. Medido em 11/09/2026 com o portão ligado: é o número da queixa dela
   * ("tudo à vista por igual"), agora na tela que a criança de fato encara. Só desce.
   *
   * No padrão (tudo liberado) são 47/34 na abertura e 87/65 com uma peça
   * (`SceneWorkshop.contract.test.tsx`). No básico, 42/30 e 73/59: somem a malha, o laço, o
   * ponto de giro, as medidas, os ossos, o espelho em qualquer direção e o "Trazer arquivo 3D",
   * e entra UMA linha, "Ferramentas que vêm por aí". Das 59 encaradas com uma peça, 18 são as
   * cores e o acabamento, concretos e à vista como no editor antigo. O alvo do redesenho da
   * casca (≤ 30 encarados com uma peça) é medido AQUI, no nível de entrada.
   */
  test('a quantidade de controles que a criança encara, medida no básico', () => {
    const vazio = mount(migrateLegacyModel(makeModel()).document)
    const montadosVazio = controlInventory(vazio.view.container)
    const encaradosVazio = frontControls(vazio.view.container)
    expect(montadosVazio.length, montadosVazio.join(' | ')).toBeLessThanOrEqual(42)
    expect(encaradosVazio.length, encaradosVazio.join(' | ')).toBeLessThanOrEqual(30)
    cleanup()

    const comPeca = mount(withPiece())
    choosePiece(comPeca.view.container)
    const montadosPeca = controlInventory(comPeca.view.container)
    const encaradosPeca = frontControls(comPeca.view.container)
    expect(montadosPeca.length, montadosPeca.join(' | ')).toBeLessThanOrEqual(73)
    expect(encaradosPeca.length, encaradosPeca.join(' | ')).toBeLessThanOrEqual(59)
  })

  test('nenhum controle de família trancada aparece, em nenhuma aba, nem abrindo tudo', async () => {
    const { view } = mount(withPiece())
    choosePiece(view.container)
    const proibidos = lockedLabels()
    const confere = (aba: string) => {
      act(() => {
        openEveryDisclosure(view.container)
      })
      const naTela = names(controlInventory(view.container))
      const vazados = proibidos.filter((label) => naTela.includes(label))
      expect(vazados, `${aba}: ${vazados.join(' · ')}`).toEqual([])
    }
    confere('Modelar')
    await openTab(SCENE_PAINT_COPY.tab)
    confere('Pintar')
    await openTab(copy.animationMode)
    await screen.findByRole('button', { name: copy.animationCreate })
    confere('Animar')
  })

  test('uma linha "Ferramentas que vêm por aí" por aba, com o posto de cada grupo', async () => {
    const { view } = mount(withPiece())
    choosePiece(view.container)
    // Uma linha por tamanho de tela: em Pintar ela tem duas cópias, a da coluna (computador,
    // `hidden md:block`) e a da gaveta (celular, `md:hidden`), e só uma aparece em cada um.
    const todas = () => screen.queryAllByText(SCENE_TOOL_ACCESS_COPY.upcoming)
    const linhas = () => {
      const computador = todas().filter((el) => !el.closest('.md\\:hidden'))
      const celular = todas().filter((el) => !el.closest('.hidden'))
      expect(celular).toHaveLength(computador.length)
      return computador
    }
    expect(linhas()).toHaveLength(1)
    expect(view.container.textContent).toContain('Abrem no nível Arquiteto(a) de Mundos')
    expect(view.container.textContent).toContain('Editar a malha: pontos, linhas e faces')
    await openTab(SCENE_PAINT_COPY.tab)
    expect(linhas()).toHaveLength(1)
    expect(view.container.textContent).toContain('Camadas de pintura')
    await openTab(copy.animationMode)
    await screen.findByRole('button', { name: copy.animationCreate })
    expect(linhas()).toHaveLength(1)
    expect(view.container.textContent).toContain('Curvas e articulações')
  })

  test('tudo liberado (a equipe, a Lenda): nenhuma linha de descoberta', () => {
    const { view } = mount(withPiece(), null)
    choosePiece(view.container)
    act(() => {
      openEveryDisclosure(view.container)
    })
    expect(screen.queryByText(SCENE_TOOL_ACCESS_COPY.upcoming)).toBeNull()
  })

  test('o espelho do básico é o do meio: sem escolher eixo nem posição', () => {
    const { editor, view } = mount(withPiece())
    choosePiece(view.container)
    act(() => {
      openEveryDisclosure(view.container)
    })
    expect(screen.queryByRole('button', { name: 'Y' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.addMirror }))
    const [mirror] = editor.getState().asset.mirrors
    expect(mirror).toMatchObject({ axis: 'x', offset: 0 })
    editor.getState().dispose()
  })

  test('a ferramenta de outra aba não acende a alça numa família trancada', async () => {
    const soPecas: MoldaToolAccess = {
      allow: moldaToolFamilyIds(['basic']).filter((id) => id !== 'animate.create'),
    }
    const source: MoldaSceneDocument = { ...withPiece(), animations: [] }
    const node = source.nodes.at(-1)!
    const { view, stage } = mount({ ...source, animations: [sceneAnimationClip(node.id)] }, soPecas)
    await waitFor(() => expect(stage.callbacks).not.toBeNull())
    choosePiece(view.container)
    // A ferramenta do palco (as propriedades têm outro "Mover", o dos números).
    const palco = () => within(screen.getByRole('region', { name: copy.viewport }))
    fireEvent.click(palco().getByRole('button', { name: copy.move }))
    expect(stage.tools.at(-1)).toBe('move')
    await openTab(copy.animationMode)
    expect(stage.tools.at(-1)).toBe('select')
    expect(palco().queryByRole('button', { name: copy.move })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.animationCreate })).toBeNull()
    // Reproduzir é leitura: continua lá.
    expect(await screen.findByRole('button', { name: copy.animationPlay })).toBeDefined()
  })

  test('atalho de família trancada não age e o navegador não o recebe', () => {
    const semPecas: MoldaToolAccess = {
      allow: moldaToolFamilyIds(['basic']).filter((id) => id !== 'model.pieces'),
    }
    const { editor, view } = mount(withPiece(), semPecas)
    choosePiece(view.container)
    const shell = view.getByRole('region', { name: copy.title })
    const before = editor.getState().asset
    expect(fireEvent.keyDown(shell, { key: 'Delete' })).toBe(false)
    expect(fireEvent.keyDown(shell, { key: 'd', ctrlKey: true })).toBe(false)
    expect(editor.getState().asset).toBe(before)
    editor.getState().dispose()
  })

  test('Ctrl+D duplica a peça escolhida, como no editor antigo', () => {
    const { editor, view } = mount(withPiece())
    choosePiece(view.container)
    const shell = view.getByRole('region', { name: copy.title })
    const count = editor.getState().asset.nodes.length
    expect(fireEvent.keyDown(shell, { key: 'd', ctrlKey: true })).toBe(false)
    expect(editor.getState().asset.nodes).toHaveLength(count + 1)
    editor.getState().dispose()
  })
})

/** Uma folha de pintura que se mexe, 2×2 quadros de 2 px. */
function flipbookSheet(): SceneImage {
  return {
    id: 'quadros',
    name: 'Pintura que se mexe',
    width: 4,
    height: 4,
    encoding: 'rgba',
    layers: [
      {
        id: 'camada',
        name: 'Camada',
        visible: true,
        opacity: 1,
        pixels: new Uint8Array(4 * 4 * 4).fill(200),
      },
    ],
    flipbook: { frameWidth: 2, frameHeight: 2, frames: [1, 3, 0], fps: 8, loop: true },
  }
}

/** Relevo: um mapa de normal de 2×2. */
function normalMap(): SceneImage {
  return {
    id: 'relevo',
    name: 'Relevo',
    width: 2,
    height: 2,
    encoding: 'rgba',
    layers: [
      {
        id: 'camada-relevo',
        name: 'Camada',
        visible: true,
        opacity: 1,
        pixels: new Uint8Array(2 * 2 * 4).fill(128),
      },
    ],
  }
}

/**
 * Tudo o que o básico não cria: movimento, ossos, mapa de relevo, UV de malha, quadros, espelho
 * em Y e tubo. É a criação de uma criança mais velha (ou de um adulto) aberta pela menor.
 */
function everything(): MoldaSceneDocument {
  const {
    document,
    input: { id, ...input },
  } = makeSceneSkinFixture()
  const source = createSceneSkin(document, input, () => id)
  source.animations = [sceneAnimationClip('upper')]
  source.mirrors = [
    { id: 'espelho-y', name: 'Espelho Y', sourceId: 'part-0', axis: 'y', offset: 1 },
  ]
  source.images = [flipbookSheet(), normalMap()]
  source.materials = source.materials.map((material, i) =>
    i === 0 ? { ...material, colorImageId: 'quadros', normalImageId: 'relevo' } : material,
  )
  source.geometries = [
    ...source.geometries,
    {
      id: 'tubo',
      kind: 'path',
      points: [
        { id: 'p0', position: [0, 0, 0] },
        { id: 'p1', position: [0, 2, 0] },
      ],
      radius: 0.25,
      around: 8,
      endCaps: true,
      surfaces: {},
    },
  ]
  source.nodes = [
    ...source.nodes,
    {
      id: 'tubo',
      name: 'Tubo',
      kind: 'mesh',
      parentId: null,
      geometryId: 'tubo',
      materialId: source.materials[0]!.id,
      hidden: false,
      locked: false,
      transform: { kind: 'trs', translation: [3, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    },
  ]
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error(`Fixture inválida: ${JSON.stringify(read)}`)
  return read.document
}

describe('a regra de ouro: trancar tira a autoria, nunca a leitura', () => {
  test('uma criação com tudo abre, reproduz e exporta no básico, e continua idêntica', async () => {
    const doc = everything()
    const { editor, view } = mount(doc)
    choosePiece(view.container)
    await openTab(copy.animationMode)
    // Reproduzir é leitura.
    expect(await screen.findByRole('button', { name: copy.animationPlay })).toBeDefined()
    await openTab(copy.modelMode)
    // O GLB também: o básico leva a criação para o Estúdio.
    fireEvent.click(screen.getByRole('button', { name: copy.glbExport.open }))
    expect(await screen.findByRole('button', { name: copy.glbExport.prepare })).toBeDefined()
    expect(screen.queryByRole('option', { name: copy.glbExport.formats.obj })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.glbExport.close }))
    // Olhar não muda um byte: nenhum passo de desfazer, o mesmo documento.
    expect(editor.getState().asset).toBe(doc)
    expect(editor.getState().canUndo).toBe(false)
    await act(async () => {
      await editor.getState().flush()
    })
    expect(editor.getState().asset).toBe(doc)
    editor.getState().dispose()
  })
})
