// Contract fixtures only; no production writer or renderer is selected here.
import { encodePintaRegionLayers, type PintaRegionCells } from '../../src/creations/pinta-regions'

export const scene4Bounds = { col: -64, row: -64, cols: 10000, rows: 10000 }
export function scene4Grid(): PintaRegionCells {
  const cells = new Int16Array(1024).fill(-1)
  for (let flags = 0; flags < 8; flags++) cells[flags] = flags * 4096 + 2
  return { kind: 'regions', version: 1, side: 32, chunks: [{ col: -2, row: -2, cells }] }
}

export function scene4BudgetFixture(layerCount = 32, chunksPerLayer = 64) {
  const source = scene4Fixture()
  const cells: PintaRegionCells = {
    kind: 'regions',
    version: 1,
    side: 32,
    chunks: Array.from({ length: chunksPerLayer }, (_, index) => ({
      col: index % 64,
      row: Math.floor(index / 64),
      cells: new Int16Array(1024).fill(0),
    })),
  }
  const wire = encodePintaRegionLayers([cells], scene4Bounds)?.[0]
  if (!wire) throw Error('Fixture fora do orçamento')
  return {
    ...source,
    layers: Array.from({ length: layerCount }, (_, index) => ({
      id: `layer-${index}`,
      kind: 'tiles' as const,
      name: 'Chão',
      visible: true,
      tilesetId: 'ground',
      cells: wire,
    })),
  }
}
export function scene4Fixture() {
  const cells = encodePintaRegionLayers([scene4Grid()], scene4Bounds)![0]!
  return {
    version: 4,
    id: 'world',
    name: 'Vila',
    tileSize: 16,
    cols: scene4Bounds.cols,
    rows: scene4Bounds.rows,
    origin: { col: scene4Bounds.col, row: scene4Bounds.row },
    tilesets: [
      {
        id: 'ground',
        name: 'Chão',
        image: 'data:image/png;base64,AA==',
        columns: 4,
        count: 4,
        solid: [0],
        platform: [1],
        animations: { 2: [{ tile: 3, duration: 100 }] },
      },
    ],
    layers: [
      { id: 'group', kind: 'group', name: 'Vila', visible: true, opacity: 0.5, offsetX: -0.25 },
      ...Array.from({ length: 16 }, (_, index) => ({
        id: `floor-${index}`,
        kind: 'tiles',
        name: 'Chão',
        visible: true,
        parentId: 'group',
        tilesetId: 'ground',
        cells,
        ...(index === 15 ? { front: true } : {}),
      })),
      {
        id: 'places',
        kind: 'objects',
        name: 'Lugares',
        visible: true,
        objects: [
          {
            id: 'hero-object',
            name: 'Morador',
            type: '',
            x: -1023.5,
            y: -511.25,
            width: 16,
            height: 16,
            properties: { life: { type: 'int', value: 3 } },
            shape: 'art',
            art: { assetId: 'hero', animationId: 'walk' },
            collision: true,
          },
        ],
      },
    ],
    art: [
      {
        id: 'hero',
        image: 'data:image/png;base64,AA==',
        width: 16,
        height: 16,
        sprite: {
          frameWidth: 16,
          frameHeight: 16,
          columns: 1,
          animations: [
            {
              id: 'walk',
              name: 'Andar',
              loop: true,
              frames: [{ tile: 0, duration: 100 }],
            },
          ],
        },
      },
    ],
    resources: [{ id: 'ground', sourceId: 'live-ground', capturedAt: 1 }],
  }
}
