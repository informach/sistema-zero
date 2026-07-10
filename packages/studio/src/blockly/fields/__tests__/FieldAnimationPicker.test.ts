import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import {
  ANIM_PLACEHOLDER,
  deriveAnimationName,
  fillFrames,
  refreshAnimationNames,
  resolveAnimations,
} from '../FieldAnimationPicker'
import { resolveTileset } from '../FieldSolidTilesPicker'

interface AssetWs extends Blockly.Workspace {
  __szAssets?: () => ProjectAsset[]
}

const SHEET_ASSET: ProjectAsset = {
  id: 'x',
  name: 'heroi-sheet',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 48,
  height: 32,
  source: 'library',
  sprite: {
    frameW: 16,
    frameH: 16,
    animations: [
      { name: 'andar', from: 0, to: 3, fps: 8, loop: true },
      { name: 'pular', from: 8, to: 10, fps: 12, loop: false },
    ],
  },
}

const TILESET_ASSET: ProjectAsset = {
  id: 't',
  name: 'pecas',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 48,
  height: 32,
  source: 'library',
  tileset: { tileSize: 16, solid: [1, 3] },
}

describe('FieldAnimationPicker.resolveAnimations', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('resolve as animações via SHEET → bloco Carregar folha → IMAGEM → asset.sprite', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const loader = ws.newBlock('sz_g2d_load_spritesheet')
    loader.setFieldValue('andar', 'NAME')
    loader.setFieldValue('heroi-sheet', 'IMAGE')
    const animate = ws.newBlock('sz_g2d_animate_sprite')
    animate.setFieldValue('andar', 'SHEET')
    ws.__szAssets = () => [SHEET_ASSET]

    const anim = animate.getField('ANIM')
    expect(anim).not.toBeNull()
    expect(resolveAnimations(anim as Blockly.Field).map((a) => a.name)).toEqual(['andar', 'pular'])
  })

  it('vazio quando o nome da folha não casa nenhum bloco Carregar folha', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = ws.newBlock('sz_g2d_animate_sprite')
    animate.setFieldValue('desconhecida', 'SHEET')
    ws.__szAssets = () => [SHEET_ASSET]
    expect(resolveAnimations(animate.getField('ANIM') as Blockly.Field)).toEqual([])
  })

  it('vazio sem metadado no asset (projeto antigo / upload)', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const loader = ws.newBlock('sz_g2d_load_spritesheet')
    loader.setFieldValue('andar', 'NAME')
    loader.setFieldValue('sem-meta', 'IMAGE')
    const animate = ws.newBlock('sz_g2d_animate_sprite')
    animate.setFieldValue('andar', 'SHEET')
    ws.__szAssets = () => [{ ...SHEET_ASSET, name: 'sem-meta', sprite: undefined }]
    expect(resolveAnimations(animate.getField('ANIM') as Blockly.Field)).toEqual([])
  })

  it('o campo ANIM NÃO é serializado (FROM/TO/FPS seguem a fonte da verdade)', () => {
    const ws = new Blockly.Workspace()
    const animate = ws.newBlock('sz_g2d_animate_sprite')
    animate.setFieldValue('correr', 'ANIM')
    animate.setFieldValue('andar', 'SHEET')
    const saved = Blockly.serialization.blocks.save(animate) as {
      fields?: Record<string, unknown>
    }
    expect(saved.fields?.ANIM).toBeUndefined()
    // Controle: um campo serializável (SHEET) É salvo.
    expect(saved.fields?.SHEET).toBe('andar')
  })
})

/** Pluga um literal numérico no soquete: sombra (paleta) ou bloco REAL (pós-Ponte). */
function plugNumber(
  ws: Blockly.Workspace,
  block: Blockly.Block,
  input: string,
  value: number,
  { shadow = false } = {},
): void {
  const connection = block.getInput(input)?.connection
  if (!connection) throw new Error(`soquete ${input} inexistente`)
  if (shadow) {
    connection.setShadowState({ type: 'sz_val_number', fields: { NUM: value } })
    return
  }
  const num = ws.newBlock('sz_val_number')
  num.setFieldValue(String(value), 'NUM')
  if (!num.outputConnection) throw new Error('sz_val_number sem outputConnection')
  connection.connect(num.outputConnection)
}

/** Monta o par Carregar folha + Animar sprite ligado ao asset com animações. */
function buildAnimatePair(ws: AssetWs): Blockly.Block {
  const loader = ws.newBlock('sz_g2d_load_spritesheet')
  loader.setFieldValue('andar', 'NAME')
  loader.setFieldValue('heroi-sheet', 'IMAGE')
  const animate = ws.newBlock('sz_g2d_animate_sprite')
  animate.setFieldValue('andar', 'SHEET')
  ws.__szAssets = () => [SHEET_ASSET]
  return animate
}

describe('deriveAnimationName — a direção reversa do fillFrames', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('deriva o nome de SOMBRAS com match exato', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = buildAnimatePair(ws)
    plugNumber(ws, animate, 'FROM', 0, { shadow: true })
    plugNumber(ws, animate, 'TO', 3, { shadow: true })
    plugNumber(ws, animate, 'FPS', 8, { shadow: true })
    expect(deriveAnimationName(animate, SHEET_ASSET.sprite?.animations ?? [])).toBe('andar')
  })

  it('deriva também de blocos REAIS sz_val_number (estado pós-Ponte)', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = buildAnimatePair(ws)
    plugNumber(ws, animate, 'FROM', 8)
    plugNumber(ws, animate, 'TO', 10)
    plugNumber(ws, animate, 'FPS', 12)
    expect(deriveAnimationName(animate, SHEET_ASSET.sprite?.animations ?? [])).toBe('pular')
  })

  it('variável plugada ou números sem match → null (nunca chuta)', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = buildAnimatePair(ws)
    const variable = ws.newBlock('sz_val_variable')
    variable.setFieldValue('inicio', 'NAME')
    const from = animate.getInput('FROM')?.connection
    if (!from || !variable.outputConnection) throw new Error('conexões ausentes')
    from.connect(variable.outputConnection)
    plugNumber(ws, animate, 'TO', 3, { shadow: true })
    plugNumber(ws, animate, 'FPS', 8, { shadow: true })
    expect(deriveAnimationName(animate, SHEET_ASSET.sprite?.animations ?? [])).toBeNull()

    const ws2 = new Blockly.Workspace() as AssetWs
    const animate2 = buildAnimatePair(ws2)
    plugNumber(ws2, animate2, 'FROM', 0, { shadow: true })
    plugNumber(ws2, animate2, 'TO', 99, { shadow: true })
    plugNumber(ws2, animate2, 'FPS', 8, { shadow: true })
    expect(deriveAnimationName(animate2, SHEET_ASSET.sprite?.animations ?? [])).toBeNull()
  })
})

describe('refreshAnimationNames — restaura o nome exibido sem tempestade de eventos', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('seta o nome derivado no campo ANIM (e é idempotente)', async () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = buildAnimatePair(ws)
    plugNumber(ws, animate, 'FROM', 0, { shadow: true })
    plugNumber(ws, animate, 'TO', 3, { shadow: true })
    plugNumber(ws, animate, 'FPS', 8, { shadow: true })
    // Drena a fila ASSÍNCRONA de eventos do setup (setFieldValue/setShadowState
    // agendam via setTimeout) antes de instalar o listener — só o refresh fica
    // sob vigilância. 5ms: um tick de 0ms nem sempre esvazia a fila do Blockly.
    await Bun.sleep(5)
    // Nenhum BLOCK_CHANGE pode escapar do refresh (Events.disable no set).
    const leaked: string[] = []
    ws.addChangeListener((e) => {
      if (e.type === Blockly.Events.BLOCK_CHANGE) leaked.push(String(e.type))
    })

    refreshAnimationNames(ws)
    await Bun.sleep(0)
    expect(animate.getFieldValue('ANIM')).toBe('andar')

    refreshAnimationNames(ws)
    await Bun.sleep(0)
    expect(animate.getFieldValue('ANIM')).toBe('andar')
    expect(leaked).toEqual([])
  })

  it('nome exibido que os números CONTRADIZEM volta ao placeholder', async () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = buildAnimatePair(ws)
    animate.setFieldValue('andar', 'ANIM')
    plugNumber(ws, animate, 'FROM', 5, { shadow: true })
    plugNumber(ws, animate, 'TO', 6, { shadow: true })
    plugNumber(ws, animate, 'FPS', 8, { shadow: true })

    refreshAnimationNames(ws)
    await Bun.sleep(0)
    expect(animate.getFieldValue('ANIM')).toBe(ANIM_PLACEHOLDER)
  })

  it('lista irresolvível (assets ainda não chegaram) NUNCA mexe no campo', async () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = buildAnimatePair(ws)
    animate.setFieldValue('andar', 'ANIM')
    ws.__szAssets = () => [] // janela async: blocksState chegou antes dos assets

    refreshAnimationNames(ws)
    await Bun.sleep(0)
    expect(animate.getFieldValue('ANIM')).toBe('andar')
  })
})

describe('fillFrames — escreve em sombra E em literal real (nunca em variável)', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('sobrescreve sombra e bloco real; preserva variável plugada', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const animate = buildAnimatePair(ws)
    plugNumber(ws, animate, 'FROM', 99, { shadow: true })
    plugNumber(ws, animate, 'TO', 99) // literal REAL (pós-Ponte)
    const variable = ws.newBlock('sz_val_variable')
    variable.setFieldValue('vel', 'NAME')
    const fps = animate.getInput('FPS')?.connection
    if (!fps || !variable.outputConnection) throw new Error('conexões ausentes')
    fps.connect(variable.outputConnection)

    const field = animate.getField('ANIM')
    if (!field) throw new Error('campo ANIM ausente')
    fillFrames(field, { name: 'pular', from: 8, to: 10, fps: 12, loop: false })

    const numAt = (input: string) =>
      animate.getInput(input)?.connection?.targetBlock()?.getFieldValue('NUM')
    expect(numAt('FROM')).toBe(8)
    expect(numAt('TO')).toBe(10)
    // Variável intocada.
    expect(animate.getInput('FPS')?.connection?.targetBlock()?.type).toBe('sz_val_variable')
  })
})

describe('FieldSolidTilesPicker.resolveTileset', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('resolve tamanho/sólidos + geometria (cols/count) da IMAGEM do bloco', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const tilemap = ws.newBlock('sz_g2d_create_tilemap')
    tilemap.setFieldValue('pecas', 'IMAGE')
    ws.__szAssets = () => [TILESET_ASSET]

    const info = resolveTileset(tilemap.getField('SOLID') as Blockly.Field)
    expect(info).toMatchObject({ tileSize: 16, solid: [1, 3], cols: 3, count: 6 })
  })

  it('o VALOR do campo SOLID continua uma string (round-trip idêntico a field_input)', () => {
    const ws = new Blockly.Workspace()
    const tilemap = ws.newBlock('sz_g2d_create_tilemap')
    tilemap.setFieldValue('0 1 3', 'SOLID')
    const saved = Blockly.serialization.blocks.save(tilemap) as { fields?: Record<string, unknown> }
    expect(saved.fields?.SOLID).toBe('0 1 3')
  })

  it('null sem tileset com metadado (asset de upload / sem dimensões)', () => {
    const ws = new Blockly.Workspace() as AssetWs
    const tilemap = ws.newBlock('sz_g2d_create_tilemap')
    tilemap.setFieldValue('pecas', 'IMAGE')
    ws.__szAssets = () => [{ ...TILESET_ASSET, tileset: undefined }]
    expect(resolveTileset(tilemap.getField('SOLID') as Blockly.Field)).toBeNull()
  })
})
