import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import { resolveAnimations } from '../FieldAnimationPicker'
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
