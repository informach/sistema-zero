import { describe, expect, it } from 'bun:test'
import type { VectorShape } from '../vector/model'
import { getPalette } from './palette'
import {
  assetRole,
  assetStyle,
  createBitmap,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  isAnimatedSpriteKind,
  isTilesetKind,
  normalizeAssetName,
  PINTA_LIMITS,
  paletteIdOf,
  resolveAssetPalette,
  sanitizePintaAsset,
} from './project'

function rectShape(id = 's1'): VectorShape {
  return {
    id,
    type: 'rect',
    x: 1,
    y: 2,
    w: 10,
    h: 8,
    rx: 0,
    fill: '#ff2121',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }
}

describe('normalizeAssetName', () => {
  it('kebab-case ASCII, remove acentos', () => {
    expect(normalizeAssetName('Herói do Mar')).toBe('heroi-do-mar')
    expect(normalizeAssetName('  meu_sprite  ')).toBe('meu-sprite')
    expect(normalizeAssetName('---a---')).toBe('a')
  })

  it('vazio/só símbolos/longo demais → null', () => {
    expect(normalizeAssetName('')).toBeNull()
    expect(normalizeAssetName('!!!')).toBeNull()
    expect(normalizeAssetName('a'.repeat(PINTA_LIMITS.maxNameChars + 1))).toBeNull()
  })
})

describe('fábricas', () => {
  it('sprite nasce com a animação "parado" de 1 quadro', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    expect(sprite.animations).toHaveLength(1)
    expect(sprite.animations[0]?.name).toBe('parado')
    expect(sprite.animations[0]?.frames[0]?.[0]?.width).toBe(16)
    expect(sprite.frameWidth).toBe(16)
  })

  it('tamanho de quadro é clampado aos limites', () => {
    expect(createPixelSpriteAsset({ name: 'a', frameSize: 4 }).frameWidth).toBe(
      PINTA_LIMITS.minFrameSize,
    )
    expect(createPixelSpriteAsset({ name: 'a', frameSize: 999 }).frameWidth).toBe(
      PINTA_LIMITS.maxFrameSize,
    )
  })

  it('tilemap nasce com a camada "Chão" cheia de -1', () => {
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 3, rows: 2 })
    expect(tilemap.layers).toHaveLength(1)
    expect(tilemap.layers[0]?.name).toBe('Chão')
    expect([...(tilemap.layers[0]?.cells ?? [])]).toEqual([-1, -1, -1, -1, -1, -1])
  })
})

describe('sanitizePintaAsset (dados do disco/import — nunca lança)', () => {
  it('round-trip das fábricas (TODOS os kinds — guarda contra apagar a galeria)', () => {
    const assets = [
      createPixelSpriteAsset({ name: 'heroi', frameSize: 16 }),
      createPixelBackgroundAsset({ name: 'ceu', width: 160, height: 120 }),
      createTilesetAsset({ name: 'pecas', tileSize: 16 }),
      createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 4, rows: 3 }),
      createVectorBackgroundAsset({ name: 'livre', width: 480, height: 360 }),
      createVectorSpriteAsset({ name: 'heroi-vetor', frameSize: 64 }),
      createVectorTilesetAsset({ name: 'pecas-vetor', tileSize: 32 }),
    ]
    for (const asset of assets) {
      const out = sanitizePintaAsset(asset)
      expect(out).not.toBeNull()
      expect(out?.kind).toBe(asset.kind)
      expect(out?.name).toBe(asset.name)
    }
  })

  it('MIGRAÇÃO das camadas: desenho ANTIGO (sem layers/cels) abre com 1 camada', () => {
    // Cenário antigo: bitmap solto no campo `bitmap`.
    const bitmapAntigo = createBitmap(4, 4)
    bitmapAntigo.data[0] = 7
    const bgAntigo = sanitizePintaAsset({
      id: 'bg-1',
      kind: 'pixel-background',
      name: 'ceu',
      createdAt: 1,
      updatedAt: 1,
      paletteId: 'arcade',
      bitmap: bitmapAntigo,
    })
    expect(bgAntigo?.kind).toBe('pixel-background')
    if (bgAntigo?.kind !== 'pixel-background') return
    expect(bgAntigo.layers).toHaveLength(1)
    expect(bgAntigo.layers[0]?.visible).toBe(true)
    expect(bgAntigo.cels).toHaveLength(1)
    expect(bgAntigo.cels[0]?.data[0]).toBe(7)

    // Sprite antigo: cada quadro era UM bitmap.
    const quadroAntigo = createBitmap(8, 8)
    quadroAntigo.data[3] = 5
    const spriteAntigo = sanitizePintaAsset({
      id: 'sp-1',
      kind: 'pixel-sprite',
      name: 'heroi',
      createdAt: 1,
      updatedAt: 1,
      paletteId: 'arcade',
      frameWidth: 8,
      frameHeight: 8,
      animations: [{ id: 'a1', name: 'parado', fps: 8, loop: true, frames: [quadroAntigo] }],
    })
    expect(spriteAntigo?.kind).toBe('pixel-sprite')
    if (spriteAntigo?.kind !== 'pixel-sprite') return
    expect(spriteAntigo.layers).toHaveLength(1)
    expect(spriteAntigo.animations[0]?.frames[0]).toHaveLength(1)
    expect(spriteAntigo.animations[0]?.frames[0]?.[0]?.data[3]).toBe(5)
  })

  it('camadas: cels a MENOS ganham camada vazia; a MAIS são cortados', () => {
    const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const out = sanitizePintaAsset({
      ...base,
      layers: [
        { id: 'l1', name: 'Camada 1', visible: true },
        { id: 'l2', name: 'Camada 2', visible: false },
      ],
      // Só um cel para duas camadas.
      animations: [{ ...base.animations[0], frames: [[createBitmap(8, 8)]] }],
    })
    if (out?.kind !== 'pixel-sprite') throw new Error('sprite esperado')
    expect(out.layers).toHaveLength(2)
    expect(out.layers[1]?.visible).toBe(false)
    expect(out.animations[0]?.frames[0]).toHaveLength(2)
  })

  it('cadeado da camada: locked true sobrevive; lixo/false OMITE a chave', () => {
    const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const out = sanitizePintaAsset({
      ...base,
      layers: [
        { id: 'l1', name: 'Camada 1', visible: true, locked: true },
        { id: 'l2', name: 'Camada 2', visible: true, locked: false },
        { id: 'l3', name: 'Camada 3', visible: true, locked: 'sim' },
      ],
      animations: [
        {
          ...base.animations[0],
          frames: [[createBitmap(8, 8), createBitmap(8, 8), createBitmap(8, 8)]],
        },
      ],
    })
    if (out?.kind !== 'pixel-sprite') throw new Error('sprite esperado')
    expect(out.layers[0]?.locked).toBe(true)
    expect('locked' in (out.layers[1] ?? {})).toBe(false)
    expect('locked' in (out.layers[2] ?? {})).toBe(false)
  })

  it('camadas inválidas preservam a posição dos cels e dos metadados válidos', () => {
    const background = createPixelBackgroundAsset({ name: 'ceu', width: 4, height: 4 })
    const cels = [1, 2, 3].map((color) => {
      const cel = createBitmap(4, 4)
      cel.data[0] = color
      return cel
    })
    const out = sanitizePintaAsset({
      ...background,
      layers: [
        { id: 'baixo', name: 'Baixo', visible: true },
        null,
        { id: 'topo', name: 'Topo', visible: true },
      ],
      cels,
    })
    if (out?.kind !== 'pixel-background') throw new Error('cenário esperado')
    expect(out.layers).toHaveLength(3)
    expect(out.layers[2]?.name).toBe('Topo')
    expect(out.cels.map((cel) => cel.data[0])).toEqual([1, 2, 3])
  })

  it('regenera ids duplicados sem descartar conteúdo', () => {
    const vector = createVectorBackgroundAsset({ name: 'livre', width: 32, height: 32 })
    const out = sanitizePintaAsset({ ...vector, shapes: [rectShape('igual'), rectShape('igual')] })
    if (out?.kind !== 'vector-background') throw new Error('vetor esperado')
    expect(out.shapes).toHaveLength(2)
    expect(new Set(out.shapes.map((shape) => shape.id)).size).toBe(2)

    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const first = sprite.animations[0]
    if (!first) throw new Error('animação esperada')
    const sanitized = sanitizePintaAsset({
      ...sprite,
      layers: [
        { id: 'camada', name: 'Baixo', visible: true },
        { id: 'camada', name: 'Topo', visible: true },
      ],
      animations: [
        { ...first, id: 'animacao', frames: [[createBitmap(8, 8), createBitmap(8, 8)]] },
        { ...first, id: 'animacao', frames: [[createBitmap(8, 8), createBitmap(8, 8)]] },
      ],
    })
    if (sanitized?.kind !== 'pixel-sprite') throw new Error('sprite esperado')
    expect(new Set(sanitized.layers.map((layer) => layer.id)).size).toBe(2)
    expect(new Set(sanitized.animations.map((animation) => animation.id)).size).toBe(2)
    expect(new Set(sanitized.animations.map((animation) => animation.name)).size).toBe(2)

    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 'pecas', cols: 1, rows: 1 })
    const layer = tilemap.layers[0]
    if (!layer) throw new Error('camada esperada')
    const sanitizedMap = sanitizePintaAsset({
      ...tilemap,
      layers: [layer, { ...layer, cells: new Int16Array([-1]) }],
    })
    if (sanitizedMap?.kind !== 'tilemap') throw new Error('mapa esperado')
    expect(sanitizedMap.layers).toHaveLength(2)
    expect(new Set(sanitizedMap.layers.map((item) => item.id)).size).toBe(2)
  })

  it('projectRef (Pensa) sobrevive ao round-trip: hex minúsculo, teto de cores', () => {
    const sprite = {
      ...createPixelSpriteAsset({ name: 'heroi', frameSize: 16 }),
      projectRef: {
        id: 'pensa-1',
        name: '  Corrida Maluca  ',
        palette: ['#FF2121', '#ff2121', '#00a0c8', 'azul', '#123', ...Array(10).fill('#aabbcc')],
      },
    }
    const out = sanitizePintaAsset(sprite)
    expect(out?.projectRef?.id).toBe('pensa-1')
    expect(out?.projectRef?.name).toBe('Corrida Maluca')
    // Inválidas caem, válidas viram minúsculas e duplicatas não gastam os 8 slots.
    expect(out?.projectRef?.palette).toEqual(['#ff2121', '#00a0c8', '#aabbcc'])
  })

  it('tilesets restaurados respeitam a whitelist dura de tamanho do motor', () => {
    const pixel = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const vector = createVectorTilesetAsset({ name: 'pecas-v', tileSize: 16 })
    expect(sanitizePintaAsset({ ...pixel, tileSize: 17 })).toBeNull()
    expect(sanitizePintaAsset({ ...vector, tileSize: 17 })).toBeNull()
  })

  it('projectRef malformado é DESCARTADO sem derrubar o asset', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    const semId = sanitizePintaAsset({ ...sprite, projectRef: { name: 'jogo' } })
    expect(semId).not.toBeNull()
    expect(semId?.projectRef).toBeUndefined()
    const lixo = sanitizePintaAsset({ ...sprite, projectRef: 'oi' })
    expect(lixo).not.toBeNull()
    expect(lixo?.projectRef).toBeUndefined()
  })

  it('MIGRAÇÃO lazy: kind antigo "vector" volta como vector-background, dados intactos', () => {
    const legacy = {
      ...createVectorBackgroundAsset({ name: 'livre', width: 480, height: 360 }),
      kind: 'vector',
      shapes: [rectShape()],
    }
    const out = sanitizePintaAsset(legacy)
    expect(out?.kind).toBe('vector-background')
    if (out?.kind !== 'vector-background') return
    expect(out.width).toBe(480)
    expect(out.height).toBe(360)
    expect(out.shapes).toHaveLength(1)
    expect(out.shapes[0]?.type).toBe('rect')
  })

  it('vector-sprite: quadro VAZIO é válido; animações sem lista → null', () => {
    const sprite = createVectorSpriteAsset({ name: 'v', frameSize: 64 })
    const out = sanitizePintaAsset(sprite)
    expect(out?.kind).toBe('vector-sprite')
    if (out?.kind !== 'vector-sprite') return
    expect(out.animations[0]?.frames).toEqual([[]])

    expect(sanitizePintaAsset({ ...sprite, animations: [] })).toBeNull()
    expect(sanitizePintaAsset({ ...sprite, animations: 'x' })).toBeNull()
  })

  it('vector-sprite: quotas recortam animações e quadros; shape inválido cai fora', () => {
    const sprite = createVectorSpriteAsset({ name: 'v', frameSize: 32 })
    const base = sprite.animations[0]
    if (!base) throw new Error('animação esperada')
    const overloaded = {
      ...sprite,
      animations: Array.from({ length: PINTA_LIMITS.maxAnimations + 3 }, (_, i) => ({
        ...base,
        id: `anim-${i}`,
        frames: Array.from({ length: PINTA_LIMITS.maxFramesPerAnimation + 3 }, () => [
          rectShape(),
          { ...rectShape('ruim'), fill: 'vermelho' },
        ]),
      })),
    }
    const out = sanitizePintaAsset(overloaded)
    expect(out?.kind).toBe('vector-sprite')
    if (out?.kind !== 'vector-sprite') return
    expect(out.animations).toHaveLength(PINTA_LIMITS.maxAnimations)
    expect(out.animations[0]?.frames).toHaveLength(PINTA_LIMITS.maxFramesPerAnimation)
    // O shape com fill inválido foi descartado; o válido ficou.
    expect(out.animations[0]?.frames[0]).toHaveLength(1)
  })

  it('vector-tileset: solid é realinhado ao número de tiles; tile vazio é válido', () => {
    const tileset = createVectorTilesetAsset({ name: 'pv', tileSize: 16 })
    const out = sanitizePintaAsset({ ...tileset, solid: [true, true, true] })
    expect(out?.kind).toBe('vector-tileset')
    if (out?.kind !== 'vector-tileset') return
    expect(out.solid).toEqual([true])
    expect(out.tiles).toEqual([[]])
  })

  it('coage array simples → typed array (registro sem o typed array do structured clone)', () => {
    const bg = createPixelBackgroundAsset({ name: 'ceu', width: 2, height: 2 })
    const out = sanitizePintaAsset({
      ...bg,
      cels: bg.cels.map((cel) => ({ ...cel, data: Array.from(cel.data) })),
    })
    expect(out?.kind).toBe('pixel-background')
    if (out?.kind !== 'pixel-background') return
    expect(out.cels[0]?.data).toBeInstanceOf(Uint8Array)
    expect(out.cels[0]?.data).toHaveLength(4)

    const map = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 2, rows: 2 })
    const layer0 = map.layers[0]
    if (!layer0) throw new Error('camada esperada')
    const outMap = sanitizePintaAsset({
      ...map,
      layers: [{ ...layer0, cells: Array.from(layer0.cells) }],
    })
    expect(outMap?.kind).toBe('tilemap')
    if (outMap?.kind !== 'tilemap') return
    expect(outMap.layers[0]?.cells).toBeInstanceOf(Int16Array)
    expect(outMap.layers[0]?.cells).toHaveLength(4)
  })
})

describe('helpers de estilo/papel', () => {
  it('assetStyle e assetRole cobrem todos os kinds', () => {
    expect(assetStyle('pixel-sprite')).toBe('pixel')
    expect(assetStyle('vector-tileset')).toBe('vector')
    expect(assetStyle('tilemap')).toBeNull()
    expect(assetRole('vector-sprite')).toBe('sprite')
    expect(assetRole('pixel-background')).toBe('background')
    expect(assetRole('vector-background')).toBe('background')
    expect(assetRole('tilemap')).toBe('tilemap')
  })

  it('isTilesetKind/isAnimatedSpriteKind aceitam os dois estilos', () => {
    expect(isTilesetKind(createTilesetAsset({ name: 'a', tileSize: 16 }))).toBe(true)
    expect(isTilesetKind(createVectorTilesetAsset({ name: 'b', tileSize: 16 }))).toBe(true)
    expect(isTilesetKind(createPixelSpriteAsset({ name: 'c', frameSize: 8 }))).toBe(false)
    expect(isAnimatedSpriteKind(createVectorSpriteAsset({ name: 'd', frameSize: 32 }))).toBe(true)
    expect(isAnimatedSpriteKind(createPixelSpriteAsset({ name: 'e', frameSize: 8 }))).toBe(true)
  })

  it('paletteIdOf devolve a paleta própria ou o default', () => {
    expect(paletteIdOf(createPixelSpriteAsset({ name: 'a', frameSize: 8 }))).toBe('arcade')
    expect(paletteIdOf(createVectorSpriteAsset({ name: 'b', frameSize: 32 }))).toBe('arcade')
    expect(paletteIdOf(createTilemapAsset({ name: 'c', tilesetId: 't', cols: 2, rows: 2 }))).toBe(
      'arcade',
    )
  })

  it('lixo → null', () => {
    expect(sanitizePintaAsset(null)).toBeNull()
    expect(sanitizePintaAsset('oi')).toBeNull()
    expect(sanitizePintaAsset({})).toBeNull()
    expect(sanitizePintaAsset({ kind: 'pixel-sprite' })).toBeNull()
    expect(sanitizePintaAsset({ kind: 'desconhecido', id: 'x', name: 'a' })).toBeNull()
  })

  it('quadro com tamanho errado é descartado; animação vazia derruba o sprite', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    const broken = {
      ...sprite,
      animations: [{ ...sprite.animations[0], frames: [createBitmap(8, 8)] }],
    }
    expect(sanitizePintaAsset(broken)).toBeNull()
  })

  it('excedentes são recortados pelas quotas (animações)', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const base = sprite.animations[0]
    if (!base) throw new Error('animação esperada')
    const spread = {
      ...sprite,
      animations: Array.from({ length: PINTA_LIMITS.maxAnimations + 5 }, (_, i) => ({
        ...base,
        id: `anim-${i}`,
      })),
    }
    const out = sanitizePintaAsset(spread)
    expect(out?.kind).toBe('pixel-sprite')
    if (out?.kind !== 'pixel-sprite') return
    expect(out.animations).toHaveLength(PINTA_LIMITS.maxAnimations)
  })

  it('nome é re-normalizado; id com ":" (separador de chave) é rejeitado', () => {
    const background = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })
    const out = sanitizePintaAsset({ ...background, name: 'Céu Azul' })
    expect(out?.name).toBe('ceu-azul')
    expect(sanitizePintaAsset({ ...background, id: 'a:b' })).toBeNull()
  })

  it('paleta desconhecida cai no default', () => {
    const background = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })
    const out = sanitizePintaAsset({ ...background, paletteId: 'neon' })
    expect(out?.kind === 'pixel-background' && out.paletteId).toBe('arcade')
  })

  it('tileset: solid é realinhado ao número de tiles', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const out = sanitizePintaAsset({ ...tileset, solid: [true, true, true] })
    expect(out?.kind === 'tileset' && out.solid).toEqual([true])
  })

  it('tileset: platform round-trippa; ausente → tudo falso; conflito → sólido vence', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const tiles = [createBitmap(16, 16), createBitmap(16, 16), createBitmap(16, 16)]
    // tile 0 sólido, tile 1 plataforma, tile 2 conflito (os dois true → sólido)
    const out = sanitizePintaAsset({
      ...tileset,
      tiles,
      solid: [true, false, true],
      platform: [true, true, true],
    })
    expect(out?.kind).toBe('tileset')
    if (out?.kind !== 'tileset') return
    expect(out.solid).toEqual([true, false, true])
    expect(out.platform).toEqual([false, true, false]) // 0 e 2 perdem p/ sólido

    // Asset ANTIGO (sem platform) sanitiza para tudo-falso.
    const old = sanitizePintaAsset({
      ...tileset,
      tiles,
      solid: [true, false, false],
      platform: undefined,
    })
    expect(old?.kind === 'tileset' && old.platform).toEqual([false, false, false])
  })

  it('extraColors: normaliza, deduplica e corta no teto; lixo cai', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const out = sanitizePintaAsset({
      ...sprite,
      extraColors: ['#AABBCC', '#aabbcc', '#f80', 'lixo', 42, '#123456'],
    })
    // #AABBCC/#aabbcc dedup para uma; #f80 expande; 'lixo'/42 caem.
    expect(out?.kind === 'pixel-sprite' && out.extraColors).toEqual([
      '#aabbcc',
      '#ff8800',
      '#123456',
    ])
  })

  it('extraColors ausente/ inválido → chave omitida (asset histórico intacto)', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const out = sanitizePintaAsset({ ...sprite, extraColors: ['nada', 7] })
    expect(out?.kind === 'pixel-sprite' && 'extraColors' in out).toBe(false)
  })

  it('resolveAssetPalette = 16 base + extras (na ordem)', () => {
    const base = getPalette('arcade').colors
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    expect(resolveAssetPalette(sprite)).toEqual(base)
    const withExtra = sanitizePintaAsset({ ...sprite, extraColors: ['#b63f16'] })
    if (withExtra?.kind !== 'pixel-sprite') throw new Error('sprite esperado')
    const resolved = resolveAssetPalette(withExtra)
    expect(resolved).toHaveLength(base.length + 1)
    expect(resolved[base.length]).toBe('#b63f16')
  })

  it('easing: "ease" sobrevive; qualquer outro vira linear (omitido)', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const first = sprite.animations[0]
    if (!first) throw new Error('animação esperada')
    const eased = sanitizePintaAsset({
      ...sprite,
      animations: [{ ...first, easing: 'ease' }],
    })
    expect(eased?.kind === 'pixel-sprite' && eased.animations[0]?.easing).toBe('ease')
    const linear = sanitizePintaAsset({
      ...sprite,
      animations: [{ ...first, easing: 'maluco' }],
    })
    expect(linear?.kind === 'pixel-sprite' && linear.animations[0]?.easing).toBeUndefined()
  })
})
