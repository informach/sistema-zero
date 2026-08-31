import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import {
  gameTwoDBlocks,
  gameTwoDToolboxCategory,
} from '../../../official-extensions/game-2d/blocks'
import {
  gameKitBlocks,
  gameKitToolboxCategory,
} from '../../../official-extensions/game-2d-advanced/blocks'
import { gameThreeDBlocks } from '../../../official-extensions/game-3d/blocks'
import { gameKit3DBlocks } from '../../../official-extensions/game-3d-advanced/blocks'
import { world3DBlocks } from '../../../official-extensions/world-3d/blocks'
import { CORE_BLOCKS, registerExtensionBlocks } from '../../blocks'
import { VALUE_SOCKETS } from '../../blocks/valueSockets'
import { restoreShadowLiterals } from '../../migrateValueFields'
import { ensureBlocklyInitialized } from '../../setup'
import {
  applySuggestedSize,
  SUGGESTIBLE_SOCKET_DEFAULTS,
  SUGGESTION_OPT_OUT,
  suggestedSizeForAsset,
} from '../FieldAssetPicker'

interface AssetWs extends Blockly.Workspace {
  __szAssets?: () => ProjectAsset[]
}

// Nomes que NÃO colidem com o starter pack (regra da casa nos testes de campo).
const FOLHA_SEM_META: ProjectAsset = {
  id: 'a1',
  name: 'nave-folha',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 128,
  height: 32,
  source: 'library',
}

const FOLHA_COM_META: ProjectAsset = {
  id: 'a2',
  name: 'nave-frames',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 128,
  height: 32,
  source: 'library',
  sprite: {
    frameW: 32,
    frameH: 32,
    animations: [{ name: 'voar', from: 0, to: 3, fps: 8, loop: true }],
  },
}

const FOLHA_MIUDA: ProjectAsset = {
  id: 'a3',
  name: 'faisca-frames',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 64,
  height: 16,
  source: 'library',
  sprite: {
    frameW: 16,
    frameH: 16,
    animations: [{ name: 'piscar', from: 0, to: 3, fps: 8, loop: true }],
  },
}

const QUADRADO_32: ProjectAsset = {
  id: 'a4',
  name: 'cometa',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 32,
  height: 32,
  source: 'library',
}

const QUADRADO_16: ProjectAsset = {
  id: 'a5',
  name: 'estrelinha',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 16,
  height: 16,
  source: 'library',
}

const MAPA_FATIADO: ProjectAsset = {
  id: 'a6',
  name: 'pecas-do-mapa',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 48,
  height: 32,
  source: 'library',
  tileset: { tileSize: 16, solid: [1] },
}

const SEM_DIMENSOES: ProjectAsset = {
  id: 'a7',
  name: 'misterio',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  source: 'library',
}

const TODOS_OS_ASSETS = [
  FOLHA_SEM_META,
  FOLHA_COM_META,
  FOLHA_MIUDA,
  QUADRADO_32,
  QUADRADO_16,
  MAPA_FATIADO,
  SEM_DIMENSOES,
]

function makeWorkspace(): AssetWs {
  const ws = new Blockly.Workspace() as AssetWs
  ws.__szAssets = () => TODOS_OS_ASSETS
  return ws
}

/** Sombra numérica no soquete (estado de paleta / pós-cura da Ponte). */
function setShadow(block: Blockly.Block, input: string, value: number): void {
  const connection = block.getInput(input)?.connection
  if (!connection) throw new Error(`soquete ${input} inexistente em ${block.type}`)
  connection.setShadowState({ type: 'sz_val_number', fields: { NUM: value } })
}

function numAt(block: Blockly.Block, input: string): unknown {
  return block.getInput(input)?.connection?.targetBlock()?.getFieldValue('NUM')
}

/** Simula o clique na grade: aplica a sugestão pelo campo de imagem do bloco. */
function pick(
  block: Blockly.Block,
  asset: ProjectAsset,
  previousAssetName?: string,
  fieldName = 'IMAGE',
): void {
  const field = block.getField(fieldName)
  if (!field) throw new Error(`campo ${fieldName} inexistente em ${block.type}`)
  applySuggestedSize(field, asset, previousAssetName)
}

describe('applySuggestedSize — a sugestão nunca vence o valor digitado', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
    registerExtensionBlocks(world3DBlocks)
  })

  it('regressão do relato: 54×54 digitado sobrevive à escolha da folha', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    setShadow(sprite, 'W', 54)
    setShadow(sprite, 'H', 54)

    pick(sprite, FOLHA_SEM_META)
    expect(numAt(sprite, 'W')).toBe(54)
    expect(numAt(sprite, 'H')).toBe(54)

    pick(sprite, FOLHA_COM_META)
    expect(numAt(sprite, 'W')).toBe(54)
    expect(numAt(sprite, 'H')).toBe(54)
  })

  it('default de fábrica recebe a sugestão (a ajuda boa continua existindo)', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    setShadow(sprite, 'W', 40)
    setShadow(sprite, 'H', 40)

    pick(sprite, QUADRADO_32)
    expect(numAt(sprite, 'W')).toBe(64)
    expect(numAt(sprite, 'H')).toBe(64)
  })

  it('trocar de imagem atualiza a sugestão anterior (a cadeia continua)', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    setShadow(sprite, 'W', 40)
    setShadow(sprite, 'H', 40)

    pick(sprite, QUADRADO_16)
    expect(numAt(sprite, 'W')).toBe(48)
    expect(numAt(sprite, 'H')).toBe(48)

    pick(sprite, QUADRADO_32, QUADRADO_16.name)
    expect(numAt(sprite, 'W')).toBe(64)
    expect(numAt(sprite, 'H')).toBe(64)
  })

  it('asset anterior irresolvível degrada conservador: não escreve', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    setShadow(sprite, 'W', 64)
    setShadow(sprite, 'H', 64)

    pick(sprite, QUADRADO_16, 'nome-que-sumiu')
    expect(numAt(sprite, 'W')).toBe(64)
    expect(numAt(sprite, 'H')).toBe(64)
  })

  it('folha com metadado do Pinta sugere o QUADRO, nunca a folha inteira', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    setShadow(sprite, 'W', 40)
    setShadow(sprite, 'H', 40)

    pick(sprite, FOLHA_COM_META)
    // suggestedSpriteSize(32, 32) = 64×64 — jamais 128×32 (a folha).
    expect(numAt(sprite, 'W')).toBe(64)
    expect(numAt(sprite, 'H')).toBe(64)
  })

  it('tudo-ou-nada: um lado digitado preserva o PAR inteiro', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    setShadow(sprite, 'W', 40)
    setShadow(sprite, 'H', 54)

    pick(sprite, QUADRADO_32)
    expect(numAt(sprite, 'W')).toBe(40)
    expect(numAt(sprite, 'H')).toBe(54)
  })

  it('variável plugada bloqueia o par (nem o outro lado muda)', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    const variable = ws.newBlock('sz_val_variable')
    variable.setFieldValue('tamanho', 'NAME')
    const w = sprite.getInput('W')?.connection
    if (!w || !variable.outputConnection) throw new Error('conexões ausentes')
    w.connect(variable.outputConnection)
    setShadow(sprite, 'H', 40)

    pick(sprite, QUADRADO_32)
    expect(sprite.getInput('W')?.connection?.targetBlock()?.type).toBe('sz_val_variable')
    expect(numAt(sprite, 'H')).toBe(40)
  })

  it('literal REAL (pós-Ponte sem cura) não é sombra: nada muda', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    for (const input of ['W', 'H']) {
      const num = ws.newBlock('sz_val_number')
      num.setFieldValue('40', 'NUM')
      const connection = sprite.getInput(input)?.connection
      if (!connection || !num.outputConnection) throw new Error('conexões ausentes')
      connection.connect(num.outputConnection)
    }

    pick(sprite, QUADRADO_32)
    expect(numAt(sprite, 'W')).toBe(40)
    expect(numAt(sprite, 'H')).toBe(40)
    expect(sprite.getInput('W')?.connection?.targetBlock()?.isShadow()).toBe(false)
  })

  it('round-trip: valor digitado curado pela Ponte continua protegido', () => {
    const ws = makeWorkspace()
    const cured = restoreShadowLiterals({
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_g2d_create_image_sprite',
            id: 'sprite-rt',
            x: 0,
            y: 0,
            fields: { NAME: 'estrela', IMAGE: 'nave-frames' },
            inputs: {
              W: { block: { type: 'sz_val_number', id: 'w-rt', fields: { NUM: 54 } } },
              H: { block: { type: 'sz_val_number', id: 'h-rt', fields: { NUM: 54 } } },
            },
          },
        ],
      },
    }) as { blocks: { blocks: [Record<string, unknown>] } }
    const sprite = Blockly.serialization.blocks.append(
      cured.blocks.blocks[0] as unknown as Blockly.serialization.blocks.State,
      ws,
    )
    // A cura re-sombreou o literal — é exatamente o estado que tornava a guarda
    // antiga (isShadow) inútil como sinal de "valor da criança".
    expect(sprite.getInput('W')?.connection?.targetBlock()?.isShadow()).toBe(true)

    pick(sprite, FOLHA_COM_META)
    expect(numAt(sprite, 'W')).toBe(54)
    expect(numAt(sprite, 'H')).toBe(54)
  })

  it('asset sem dimensões não mexe em nada', () => {
    const ws = makeWorkspace()
    const sprite = ws.newBlock('sz_g2d_create_image_sprite')
    setShadow(sprite, 'W', 40)
    setShadow(sprite, 'H', 40)

    pick(sprite, SEM_DIMENSOES)
    expect(numAt(sprite, 'W')).toBe(40)
    expect(numAt(sprite, 'H')).toBe(40)
  })

  it('sz_canvas_draw_image (núcleo, campo SRC) segue a mesma regra', () => {
    const ws = makeWorkspace()
    const draw = ws.newBlock('sz_canvas_draw_image')
    setShadow(draw, 'W', 100)
    setShadow(draw, 'H', 100)
    pick(draw, QUADRADO_32, undefined, 'SRC')
    expect(numAt(draw, 'W')).toBe(64)
    expect(numAt(draw, 'H')).toBe(64)

    setShadow(draw, 'W', 300)
    setShadow(draw, 'H', 200)
    pick(draw, QUADRADO_16, undefined, 'SRC')
    expect(numAt(draw, 'W')).toBe(300)
    expect(numAt(draw, 'H')).toBe(200)
  })

  it('allowlist mata o bug latente: quadro do Mundo 3D fica nas unidades dele', () => {
    const ws = makeWorkspace()
    const totem = ws.newBlock('sz_w3d_totem_image')
    setShadow(totem, 'W', 3)

    pick(totem, QUADRADO_32)
    // Antes a escrita genérica gravava a sugestão em PIXELS (48) numa largura
    // em unidades de MUNDO — um paredão sem erro nenhum.
    expect(numAt(totem, 'W')).toBe(3)
  })
})

describe('applySuggestedSize — FW/FH do Carregar folha vêm do metadado', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
    registerExtensionBlocks(gameKitBlocks)
  })

  function makeLoader(ws: AssetWs, fw: number, fh: number): Blockly.Block {
    const loader = ws.newBlock('sz_g2d_load_spritesheet')
    setShadow(loader, 'FW', fw)
    setShadow(loader, 'FH', fh)
    return loader
  }

  it('metadado do Pinta preenche FW/FH de fábrica (fecha o drift do CLAUDE.md)', () => {
    const ws = makeWorkspace()
    const loader = makeLoader(ws, 32, 32)
    pick(loader, FOLHA_MIUDA)
    expect(numAt(loader, 'FW')).toBe(16)
    expect(numAt(loader, 'FH')).toBe(16)
  })

  it('FW digitado preserva o par', () => {
    const ws = makeWorkspace()
    const loader = makeLoader(ws, 8, 32)
    pick(loader, FOLHA_MIUDA)
    expect(numAt(loader, 'FW')).toBe(8)
    expect(numAt(loader, 'FH')).toBe(32)
  })

  it('folha sem metadado não chuta o quadro: nada muda', () => {
    const ws = makeWorkspace()
    const loader = makeLoader(ws, 32, 32)
    pick(loader, FOLHA_SEM_META)
    expect(numAt(loader, 'FW')).toBe(32)
    expect(numAt(loader, 'FH')).toBe(32)
  })

  it('trocar de folha atualiza o quadro sugerido anterior', () => {
    const ws = makeWorkspace()
    const loader = makeLoader(ws, 32, 32)
    pick(loader, FOLHA_MIUDA)
    expect(numAt(loader, 'FW')).toBe(16)
    pick(loader, FOLHA_COM_META, FOLHA_MIUDA.name)
    expect(numAt(loader, 'FW')).toBe(32)
    expect(numAt(loader, 'FH')).toBe(32)
  })

  it('gk: a folha de andar (fábrica 16/16) recebe o quadro do metadado', () => {
    const ws = makeWorkspace()
    const walk = ws.newBlock('sz_gk_set_walk_sheet')
    setShadow(walk, 'FW', 16)
    setShadow(walk, 'FH', 16)
    pick(walk, FOLHA_COM_META)
    expect(numAt(walk, 'FW')).toBe(32)
    expect(numAt(walk, 'FH')).toBe(32)
  })
})

describe('applySuggestedSize — exceção deliberada do mapa de tiles', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('TILE segue vindo do tileset SEMPRE (tileSize errado quebra a grade)', () => {
    const ws = makeWorkspace()
    const tilemap = ws.newBlock('sz_g2d_create_tilemap')
    setShadow(tilemap, 'TILE', 99)
    pick(tilemap, MAPA_FATIADO)
    expect(numAt(tilemap, 'TILE')).toBe(16)
  })
})

describe('suggestedSizeForAsset — frame-aware', () => {
  it('com metadado usa o QUADRO; sem, a imagem; sem dimensões, null', () => {
    expect(suggestedSizeForAsset(FOLHA_COM_META)).toEqual({ w: 64, h: 64 })
    expect(suggestedSizeForAsset(FOLHA_SEM_META)).toEqual({ w: 128, h: 32 })
    expect(suggestedSizeForAsset(SEM_DIMENSOES)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Drift: o mapa allowlist × as definições e as sombras REAIS das paletas.
// ---------------------------------------------------------------------------

type LooseArg = { type?: string; name?: string; kind?: string }
type LooseDef = Record<string, unknown> & { type?: string }

const ALL_DEFS: LooseDef[] = [
  ...(CORE_BLOCKS as unknown as LooseDef[]),
  ...(gameTwoDBlocks as unknown as LooseDef[]),
  ...(gameKitBlocks as unknown as LooseDef[]),
  ...(gameThreeDBlocks as unknown as LooseDef[]),
  ...(gameKit3DBlocks as unknown as LooseDef[]),
  ...(world3DBlocks as unknown as LooseDef[]),
]

function argsOf(def: LooseDef): LooseArg[] {
  const out: LooseArg[] = []
  for (const [key, value] of Object.entries(def)) {
    if (/^args\d+$/.test(key) && Array.isArray(value)) out.push(...(value as LooseArg[]))
  }
  return out
}

const SIZE_INPUT_NAMES = new Set(['W', 'H', 'FW', 'FH'])

function hasImagePicker(def: LooseDef): boolean {
  return argsOf(def).some(
    (a) => a.type === 'field_asset_picker' && (a.kind === undefined || a.kind === 'image'),
  )
}

function sizeInputNames(def: LooseDef): string[] {
  return argsOf(def)
    .filter((a) => a.type === 'input_value' && a.name !== undefined && SIZE_INPUT_NAMES.has(a.name))
    .map((a) => a.name as string)
}

/** Sombras numéricas de fábrica declaradas na toolbox de uma extensão. */
function collectToolboxShadowNumbers(root: unknown): Map<string, Record<string, number>> {
  const out = new Map<string, Record<string, number>>()
  const stack: unknown[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue
    const entry = node as {
      kind?: string
      type?: string
      contents?: unknown[]
      inputs?: Record<string, { shadow?: { type?: string; fields?: { NUM?: unknown } } }>
    }
    if (Array.isArray(entry.contents)) stack.push(...entry.contents)
    if (entry.kind !== 'block' || !entry.type || !entry.inputs) continue
    const slots: Record<string, number> = {}
    for (const [slot, input] of Object.entries(entry.inputs)) {
      const shadow = input?.shadow
      if (shadow?.type !== 'sz_val_number') continue
      const num = Number(shadow.fields?.NUM)
      if (Number.isFinite(num)) slots[slot] = num
    }
    if (Object.keys(slots).length > 0) out.set(entry.type, slots)
  }
  return out
}

describe('drift: allowlist da sugestão × definições e sombras de fábrica', () => {
  it('todo bloco com seletor de imagem + soquete de tamanho está no mapa OU no opt-out', () => {
    const flagged = ALL_DEFS.filter((d) => hasImagePicker(d) && sizeInputNames(d).length > 0).map(
      (d) => d.type as string,
    )
    // Anti-vácuo: a varredura precisa enxergar os casos conhecidos — se o
    // formato das definições mudar e ela voltar vazia, acusa em vez de passar.
    expect(flagged).toEqual(
      expect.arrayContaining([
        'sz_g2d_create_image_sprite',
        'sz_g2d_load_spritesheet',
        'sz_canvas_draw_image',
        'sz_w3d_totem_image',
        'sz_g3k_part',
      ]),
    )
    const orfaos = flagged.filter(
      (t) => !(t in SUGGESTIBLE_SOCKET_DEFAULTS) && !SUGGESTION_OPT_OUT.has(t),
    )
    expect(orfaos).toEqual([])
  })

  it('nenhuma entrada morta: todo tipo do mapa/opt-out tem seletor de imagem e os soquetes', () => {
    const byType = new Map(ALL_DEFS.map((d) => [d.type as string, d]))
    const mortos: string[] = []
    for (const [type, plan] of Object.entries(SUGGESTIBLE_SOCKET_DEFAULTS)) {
      const def = byType.get(type)
      const inputs = def ? new Set(sizeInputNames(def)) : new Set<string>()
      const wanted = [...(plan.size ? ['W', 'H'] : []), ...(plan.frame ? ['FW', 'FH'] : [])]
      if (!def || !hasImagePicker(def) || !wanted.every((slot) => inputs.has(slot))) {
        mortos.push(type)
      }
    }
    for (const type of SUGGESTION_OPT_OUT) {
      const def = byType.get(type)
      if (!def || !hasImagePicker(def) || sizeInputNames(def).length === 0) mortos.push(type)
    }
    expect(mortos).toEqual([])
  })

  it('cada default do mapa é a sombra de fábrica REAL da paleta', () => {
    const paletteShadows = new Map([
      ...collectToolboxShadowNumbers(gameTwoDToolboxCategory),
      ...collectToolboxShadowNumbers(gameKitToolboxCategory),
    ])
    const factoryOf = (type: string, slot: string): number | undefined =>
      type in VALUE_SOCKETS ? VALUE_SOCKETS[type]?.[slot] : paletteShadows.get(type)?.[slot]
    const divergentes: string[] = []
    for (const [type, plan] of Object.entries(SUGGESTIBLE_SOCKET_DEFAULTS)) {
      const pairs: Array<[string, number]> = [
        ...(plan.size
          ? ([
              ['W', plan.size.W],
              ['H', plan.size.H],
            ] as Array<[string, number]>)
          : []),
        ...(plan.frame
          ? ([
              ['FW', plan.frame.FW],
              ['FH', plan.frame.FH],
            ] as Array<[string, number]>)
          : []),
      ]
      for (const [slot, value] of pairs) {
        if (factoryOf(type, slot) !== value) {
          divergentes.push(`${type}.${slot}: mapa ${value}, paleta ${factoryOf(type, slot)}`)
        }
      }
    }
    expect(divergentes).toEqual([])
  })
})
