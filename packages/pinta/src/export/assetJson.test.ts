import { describe, expect, it } from 'bun:test'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type PintaAsset,
} from '../core/project'
import { setCell } from '../tiles/tilemapOps'
import { assetBundleToJson, assetFromJson, assetToJson } from './assetJson'
import { galleryToPintaJson, importPintaJson } from './projectJson'

/**
 * O contrato que a AULA depende: o desenho vai ao professor e volta IGUAL, com o mesmo id, para a
 * criança retomar de onde parou em vez de ganhar uma cópia a cada abertura.
 */

/** Um de cada kind, com conteúdo de verdade (asset vazio passaria por acidente). */
function umDeCadaKind(): PintaAsset[] {
  const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
  const cel = sprite.animations[0]?.frames[0]?.[0]
  if (cel) cel.data[0] = 5

  const fundo = createPixelBackgroundAsset({ name: 'ceu', width: 16, height: 12 })
  if (fundo.cels[0]) fundo.cels[0].data[3] = 7

  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  let tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 3, rows: 2 })
  const layerId = tilemap.layers[0]?.id
  if (layerId) tilemap = setCell(tilemap, layerId, 1, 1, 0)

  return [
    sprite,
    fundo,
    tileset,
    tilemap,
    createVectorSpriteAsset({ name: 'nave', frameSize: 64 }),
    createVectorBackgroundAsset({ name: 'livre', width: 480, height: 360 }),
    createVectorTilesetAsset({ name: 'pecas-vetor', tileSize: 16 }),
  ]
}

describe('assetToJson / assetFromJson', () => {
  it('🚨 a ida e volta PRESERVA o desenho, o id e o nome — em todo kind', () => {
    // Sem isto, reabrir o bloco criaria um desenho novo a cada vez (é o que o
    // `galleryStore.importAssets` faz de propósito, e é por isso que este caminho não passa
    // por ele).
    for (const original of umDeCadaKind()) {
      const { asset, warnings } = assetFromJson(assetToJson(original))
      expect(warnings, original.kind).toEqual([])
      expect(asset?.id, original.kind).toBe(original.id)
      expect(asset?.name, original.kind).toBe(original.name)
      expect(asset, original.kind).toEqual(original)
    }

    // ⚠️ Anti-vácuo: dois desenhos VAZIOS também sairiam iguais. Esta asserção prova que o
    // pixel pintado atravessou o RLE+base64 e voltou como `Uint8Array` de verdade.
    const [sprite] = umDeCadaKind()
    if (sprite?.kind !== 'pixel-sprite') throw new Error('fixture inesperada')
    const voltou = assetFromJson(assetToJson(sprite)).asset
    expect(voltou?.kind === 'pixel-sprite' && voltou.animations[0]?.frames[0]?.[0]?.data[0]).toBe(5)
  })

  it('o arquivo é um `.pinta.json` de verdade — a galeria consegue restaurá-lo', () => {
    // É o que faz "baixar no bloco, importar no Pinta completo" funcionar sem ponte nova.
    const [sprite] = umDeCadaKind()
    if (!sprite) throw new Error('fixture vazia')
    expect(assetToJson(sprite)).toBe(galleryToPintaJson([sprite]))
  })

  it('texto ilegível vira recusa explicada, nunca exceção', () => {
    for (const lixo of ['', '{quebrado', '{}', '[]', 'null', JSON.stringify({ format: 'outro' })]) {
      const { asset, warnings } = assetFromJson(lixo)
      expect(asset, lixo).toBeNull()
      expect(warnings.length, lixo).toBeGreaterThan(0)
    }
  })

  it('backup com vários desenhos leva o primeiro e AVISA', () => {
    // A criança pode escolher o backup inteiro da galeria em vez do desenho da aula; recusar
    // seria um beco sem saída.
    const [primeiro, segundo] = umDeCadaKind()
    if (!primeiro || !segundo) throw new Error('fixture vazia')
    const { asset, warnings } = assetFromJson(galleryToPintaJson([primeiro, segundo]))
    expect(asset?.id).toBe(primeiro.id)
    expect(warnings.some((w) => w.includes('mais de um desenho'))).toBe(true)
  })

  it('arquivo válido e VAZIO é recusado com aviso (não devolve null mudo)', () => {
    const { asset, warnings } = assetFromJson(galleryToPintaJson([]))
    expect(asset).toBeNull()
    expect(warnings).toEqual(['O arquivo não tem nenhum desenho.'])
  })

  it('exportação portátil de MAPA leva as peças usadas no mesmo arquivo', () => {
    const gallery = umDeCadaKind()
    const map = gallery.find((asset) => asset.kind === 'tilemap')
    const tileset = gallery.find((asset) => asset.kind === 'tileset')
    if (map?.kind !== 'tilemap' || tileset?.kind !== 'tileset') {
      throw new Error('mapa e peças esperados')
    }

    const json = assetBundleToJson(map, gallery)
    if (!json) throw new Error('arquivo portátil esperado')
    const { assets, warnings } = importPintaJson(json)

    expect(warnings).toEqual([])
    expect(assets.map((asset) => asset.kind)).toEqual(['tileset', 'tilemap'])
    expect(assets.find((asset) => asset.kind === 'tilemap')?.tilesetId).toBe(tileset.id)
  })

  it('exportação portátil de MAPA recusa ficar sem as peças', () => {
    const map = umDeCadaKind().find((asset) => asset.kind === 'tilemap')
    if (map?.kind !== 'tilemap') throw new Error('mapa esperado')
    expect(assetBundleToJson(map, [map])).toBeNull()
  })

  it('exportação portátil dos outros tipos continua levando exatamente um desenho', () => {
    for (const asset of umDeCadaKind().filter((item) => item.kind !== 'tilemap')) {
      const json = assetBundleToJson(asset, [asset])
      if (!json) throw new Error(`arquivo esperado para ${asset.kind}`)
      const { assets, warnings } = importPintaJson(json)
      expect(warnings, asset.kind).toEqual([])
      expect(assets, asset.kind).toHaveLength(1)
      expect(assets[0], asset.kind).toEqual(asset)
    }
  })
})
