import { describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import { filterAssetsForPicker } from '../FieldAssetPicker'

/**
 * O `field_asset_picker` ganhou o `kind` (Canvas 3D): a grade lista modelos 3D
 * (.glb/.hdr) e sons, além de imagens. Este teste trava o filtro por família —
 * um seletor de modelo NÃO pode oferecer imagens/sons, e vice-versa.
 */
const a = (
  name: string,
  kind: ProjectAsset['kind'],
  extra: Partial<ProjectAsset> = {},
): ProjectAsset => ({ name, kind, dataUrl: `data:x;base64,${name}`, ...extra }) as ProjectAsset

const ASSETS: ProjectAsset[] = [
  a('heroi', 'image'),
  a('mapa', 'image', {
    tilemap: { tileSize: 16, cols: 1, rows: 1, grid: '0', solid: [] } as never,
  }),
  a('explosao', 'audio'),
  a('caixa', 'model3d', { originalFileName: 'caixa.glb' }),
  a('ceu', 'environment3d', { originalFileName: 'ceu.hdr' }),
]

describe('filterAssetsForPicker — grade por família de asset', () => {
  it("kind '3d' → só modelo .glb + céu .hdr (nada de imagem/som)", () => {
    expect(filterAssetsForPicker(ASSETS, '3d').map((x) => x.name)).toEqual(['caixa', 'ceu'])
  })

  it("kind 'audio' → só sons", () => {
    expect(filterAssetsForPicker(ASSETS, 'audio').map((x) => x.name)).toEqual(['explosao'])
  })

  it("kind 'image' (padrão) → só imagens (modelo/som ficam de fora)", () => {
    expect(filterAssetsForPicker(ASSETS, 'image').map((x) => x.name)).toEqual(['heroi', 'mapa'])
  })

  it("kind 'image' + filtro 'tilemap' → só imagens COM metadado de mapa", () => {
    expect(filterAssetsForPicker(ASSETS, 'image', 'tilemap').map((x) => x.name)).toEqual(['mapa'])
  })
})
