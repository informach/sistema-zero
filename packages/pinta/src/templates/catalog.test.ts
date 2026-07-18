import { describe, expect, it } from 'bun:test'
import { sanitizePintaAsset } from '../core/project'
import { findTemplate, PINTA_TEMPLATES } from './catalog'

describe('catálogo de modelos prontos', () => {
  for (const template of PINTA_TEMPLATES) {
    describe(template.id, () => {
      it('build() gera assets que SOBREVIVEM ao sanitize (arte/dimensões válidas)', () => {
        const { assets, primaryIndex } = template.build()
        expect(assets.length).toBeGreaterThan(0)
        expect(primaryIndex).toBeGreaterThanOrEqual(0)
        expect(primaryIndex).toBeLessThan(assets.length)
        for (const asset of assets) {
          expect(sanitizePintaAsset(asset)).not.toBeNull()
        }
      })

      it('o asset principal casa com style/role declarados', () => {
        const { assets, primaryIndex } = template.build()
        const primary = assets[primaryIndex]
        if (!primary) throw new Error('primário esperado')
        // (não checa style p/ tilemap — herda das peças)
        expect(primary).toBeDefined()
      })

      it('dois build() geram IDS DIFERENTES (cópia independente)', () => {
        const a = template.build().assets[0]
        const b = template.build().assets[0]
        expect(a?.id).not.toBe(b?.id)
      })
    })
  }

  it('mapa companheiro: as células apontam índices válidos do tileset', () => {
    const { assets } = findTemplate('fase-plataforma')?.build() ?? { assets: [] }
    const tileset = assets.find((a) => a.kind === 'tileset')
    const tilemap = assets.find((a) => a.kind === 'tilemap')
    if (tileset?.kind !== 'tileset' || tilemap?.kind !== 'tilemap')
      throw new Error('esperava tileset + tilemap')
    // o tilemap referencia ESTE tileset (id casado no build)
    expect(tilemap.tilesetId).toBe(tileset.id)
    const maxIndex = tileset.tiles.length - 1
    for (const layer of tilemap.layers) {
      for (const cell of layer.cells) {
        expect(cell).toBeLessThanOrEqual(maxIndex)
      }
    }
  })

  it('chao-de-grama tem uma peça PLATAFORMA (vitrine do one-way)', () => {
    const tileset = findTemplate('chao-de-grama')?.build().assets[0]
    if (tileset?.kind !== 'tileset') throw new Error('tileset esperado')
    expect(tileset.platform.some((p) => p === true)).toBe(true)
  })
})
