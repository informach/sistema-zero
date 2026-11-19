import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { vilaEFloresta } from './fixture'

/** Entirely native fixture: integer authoring coordinates and one solid tile in
 * a reusable set. Scaling that set makes the tile narrower than the old samples. */
export function physicsScenario() {
  const fixture = vilaEFloresta()
  const original = fixture.assets.find((a) => a.kind === 'map-set')
  const tiles = fixture.assets.find((a) => a.id === fixture.map.tilesetId)
  if (original?.kind !== 'map-set' || tiles?.kind !== 'tileset')
    throw new Error('Faltam os recursos da Vila')
  const solid = tiles.solid.findIndex(Boolean)
  if (solid < 0) throw new Error('A fixture precisa de uma peça sólida real')
  const set = structuredClone(original)
  set.id = 'qa-physics-wall-set'
  set.name = 'Parede estreita'
  set.map = {
    ...set.map,
    id: 'qa-physics-wall-definition',
    cols: 16,
    rows: 1,
    layers: [
      {
        id: 'wall-tiles',
        name: 'Peça sólida',
        visible: true,
        cells: Int16Array.from([solid, ...Array(15).fill(-1)]),
      },
    ],
  }
  const map = structuredClone(fixture.map)
  map.id = 'qa-physics'
  map.name = 'geometria-fisica'
  map.cols = 8
  map.rows = 4
  map.layers = [
    {
      id: 'floor',
      name: 'Chão',
      visible: true,
      cells: new Int16Array(map.cols * map.rows).fill(-1),
    },
    {
      kind: 'objects',
      id: 'objects',
      name: 'Objetos',
      visible: true,
      objects: [
        {
          id: 'start',
          name: 'Início',
          type: '',
          role: 'start',
          x: 8,
          y: 32,
          width: 0,
          height: 0,
          properties: {},
        },
        {
          id: 'wall',
          name: 'Parede',
          type: '',
          shape: 'set',
          setId: set.id,
          x: 40,
          y: 0,
          width: 1,
          height: 64,
          properties: {},
        },
      ],
    },
  ]
  return { map, assets: [...fixture.assets, set, map] }
}

if (import.meta.main) {
  const out = resolve(process.argv[2] ?? '.tmp/pinta-physics-e2e')
  await mkdir(out, { recursive: true })
  const fixture = physicsScenario()
  await writeFile(resolve(out, 'geometria-fisica.pinta.json'), galleryToPintaJson(fixture.assets))
}
