import { expect, test } from 'bun:test'
import { readPintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { createRegionSceneQueries } from '@sistemazero/core/studio/pinta-scene-query'
import { createRegionLegacyCollision } from '../regionLegacyCollision'
import { mapTwoDSource } from '../runtime'
import { grid, image } from './regionFixture'

test('legacy raster agrees with the dense player for offsets, signed sets, rotations and reflections', () => {
  const create = new Function(`${mapTwoDSource};return createMap2D;`)()
  const bounds = { col: -8, row: -11, cols: 10, rows: 10 }
  const local = { col: -4, row: 3, cols: 3, rows: 2 }
  const tiles = (id: string, cells: unknown) => ({
    id,
    kind: 'tiles',
    name: id,
    visible: true,
    tilesetId: 'ts',
    cells,
  })
  const createGrid = (
    entries: Array<[number, number, number]>,
    b: typeof bounds,
    regional: boolean,
  ) => {
    if (regional) return grid(entries, b)
    const dense = new Array<number>(b.cols * b.rows).fill(-1)
    for (const [col, row, value] of entries) dense[(row - b.row) * b.cols + col - b.col] = value
    return dense
  }
  for (const rotation of [0, 37, 90, 180, 270])
    for (const flipX of [false, true])
      for (const flipY of [false, true]) {
        function scene(regional: boolean) {
          const root = {
            version: regional ? 4 : 2,
            id: 'world',
            name: 'Vila',
            tileSize: 16,
            cols: bounds.cols,
            rows: bounds.rows,
            ...(regional
              ? { origin: { col: bounds.col, row: bounds.row }, physics: 'legacy' }
              : {}),
            tilesets: [
              { id: 'ts', name: 'Folha', image, columns: 4, count: 4, solid: [0], platform: [1] },
            ],
            sets: [
              {
                id: 'house',
                cols: local.cols,
                rows: local.rows,
                ...(regional ? { origin: { col: local.col, row: local.row } } : {}),
                layers: [
                  {
                    ...tiles(
                      'inside',
                      createGrid(
                        [
                          [-4, 3, 1],
                          [-3, 3, 0],
                          [-2, 4, 0],
                        ],
                        local,
                        regional,
                      ),
                    ),
                    offsetY: 0.125,
                  },
                  { ...tiles('on-top', createGrid([[-3, 3, 1]], local, regional)), offsetX: -0.25 },
                ],
              },
            ],
            layers: [
              {
                ...tiles(
                  'floor',
                  createGrid(
                    [
                      [-5, -7, 1],
                      [-3, -5, 0],
                    ],
                    bounds,
                    regional,
                  ),
                ),
                offsetX: -0.25,
                offsetY: 3.5,
              },
              {
                id: 'objects',
                kind: 'objects',
                name: 'Objetos',
                visible: true,
                offsetX: 0.125,
                objects: [
                  {
                    id: 'set',
                    name: 'Casa',
                    type: '',
                    shape: 'set',
                    setId: 'house',
                    x: regional ? -70.25 : -70.25 - bounds.col * 16,
                    y: regional ? -103.75 : -103.75 - bounds.row * 16,
                    width: 50,
                    height: 70,
                    rotation,
                    ...(flipX ? { flipX: true } : {}),
                    ...(flipY ? { flipY: true } : {}),
                    properties: {},
                  },
                ],
              },
            ],
          }
          return root
        }
        const admitted = readPintaRegionScene(JSON.stringify(scene(true)))
        if (!admitted) throw new Error('Fixture regional inválida.')
        const collisions = createRegionLegacyCollision(createRegionSceneQueries(admitted).context)
        const actual = [...collisions(bounds.col, bounds.row, bounds.col + 9, bounds.row + 9)]
        let expected: Array<[number, number, 0 | 1]> = []
        create({
          meta: () => ({ scene: scene(false) }),
          collision(_name: string, _scene: unknown, cells: number[][]) {
            expected = cells.flatMap((row, r) =>
              row.flatMap<[number, number, 0 | 1]>((value, c) =>
                value === 0 || value === 1 ? [[bounds.row + r, bounds.col + c, value]] : [],
              ),
            )
          },
          image: () => null,
        }).createMapScene('map', 'world')
        expect(actual, `${rotation}/${flipX}/${flipY}`).toEqual(expected)
      }
})
