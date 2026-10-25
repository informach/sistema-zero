/**
 * `buildTilemap`: o mapa montado por CÓDIGO (os mapas da galeria gerados por
 * script). Ele lança no erro de autoria — o sanitize, que nunca lança, apagaria
 * o problema em silêncio no primeiro load.
 */
import { describe, expect, it } from 'bun:test'
import {
  createVectorTilesetAsset,
  isObjectLayer,
  sanitizePintaAsset,
  type TilemapAsset,
} from '../core/project'
import { tileLayerAt } from '../testing/fixtures'
import { buildPixelTileset, buildTilemap } from './builders'

const TILE = ['................', '................'].concat(Array(14).fill('1'.repeat(16)))
const chao = () => buildPixelTileset('chao', 16, [{ art: TILE, collision: 'solid' }, { art: TILE }])
const casas = () => buildPixelTileset('casas', 16, [{ art: TILE }])

function objectsOf(map: TilemapAsset) {
  const layer = map.layers.find(isObjectLayer)
  if (!layer) throw new Error('camada de objetos esperada')
  return layer.objects
}

describe('buildTilemap', () => {
  it('monta peças por camada + objetos e o resultado sobrevive ao load', () => {
    const base = chao()
    const extra = casas()
    const map = buildTilemap({
      name: 'Vila do Herói',
      tileset: base,
      layers: [
        { name: 'Chão', rows: ['0 0 0', '1 1 1'] },
        { name: 'Casas', rows: ['. 0 .', '. . .'], tileset: extra, front: true },
        {
          kind: 'objects',
          name: 'Objetos',
          objects: [
            { name: 'inicio', type: 'jogador', x: 0, y: 0 },
            {
              name: 'porta',
              type: 'porta',
              x: 1,
              y: 0,
              width: 1,
              height: 1,
              properties: { para: 'casa' },
            },
          ],
        },
      ],
      objectUnits: 'tiles',
    })
    expect(map.name).toBe('vila-do-heroi')
    expect(map.tilesetId).toBe(base.id)
    expect(map.cols).toBe(3)
    expect(tileLayerAt(map, 1)).toMatchObject({ tilesetId: extra.id, front: true })
    expect(tileLayerAt(map, 0).tilesetId).toBeUndefined()
    expect(objectsOf(map).map((o) => [o.name, o.x, o.y, o.width, o.height])).toEqual([
      ['inicio', 0, 0, 0, 0],
      ['porta', 16, 0, 16, 16],
    ])
    expect(sanitizePintaAsset(structuredClone(map))).toEqual(map)
  })

  it('tileset citado por id precisa vir em `tilesets`', () => {
    const base = chao()
    const extra = casas()
    const layers = [
      { name: 'Chão', rows: ['0'] },
      { name: 'Casas', rows: ['0'], tileset: extra.id },
    ]
    expect(() => buildTilemap({ name: 'fase', tileset: base, layers })).toThrow(
      /não foram passadas/,
    )
    const map = buildTilemap({ name: 'fase', tileset: base, tilesets: [extra], layers })
    expect(tileLayerAt(map, 1).tilesetId).toBe(extra.id)
  })

  it('LANÇA nos erros de autoria', () => {
    const base = chao()
    const grande = buildPixelTileset('grande', 32, [{ art: Array(32).fill('1'.repeat(32)) }])
    const vetor = createVectorTilesetAsset({ name: 'vetor', tileSize: 16 })
    const make = (layers: Parameters<typeof buildTilemap>[0]['layers']) => () =>
      buildTilemap({ name: 'fase', tileset: base, layers })
    expect(
      make([
        { name: 'a', rows: ['0'] },
        { name: 'b', rows: ['0'], tileset: grande },
      ]),
    ).toThrow(/16 px/)
    expect(
      make([
        { name: 'a', rows: ['0'] },
        { name: 'b', rows: ['0'], tileset: vetor },
      ]),
    ).toThrow(/mesmo estilo/)
    expect(
      make([
        { name: 'a', rows: ['0 0'] },
        { name: 'b', rows: ['0'] },
      ]),
    ).toThrow(/2 × 1/)
    expect(make([{ name: 'a', rows: ['5'] }])).toThrow(/peça 5/)
    expect(make([{ kind: 'objects', name: 'o', objects: [] }])).toThrow()
    expect(
      make([
        { name: 'a', rows: ['0'] },
        { kind: 'objects', name: 'o', objects: [{ name: 'x', x: 99, y: 0 }] },
      ]),
    ).toThrow(/fora do mapa/)
    expect(
      make([
        { name: 'a', rows: ['0'] },
        {
          kind: 'objects',
          name: 'o',
          objects: [{ name: 'x', x: 0, y: 0, properties: { '1a': 1 } }],
        },
      ]),
    ).toThrow(/nome inválido/)
    expect(make(Array.from({ length: 9 }, (_, i) => ({ name: `c${i}`, rows: ['0'] })))).toThrow(
      /máximo/,
    )
  })
})
