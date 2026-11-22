import type { PintaRegionSceneQuery } from '@sistemazero/core/studio/pinta-scene-query'
import { sceneLayerState } from '@sistemazero/core/studio/pinta-scene-runtime'
import { cellTile } from '../../../../pinta/src/tiles/cell'

type GridBox = { left: number; top: number; right: number; bottom: number }
type Cell = [row: number, col: number, material: 0 | 1]

/** Same cell-center raster as the dense player, computed only within the collision query.
 * Stream bounded bands even when a scaled set projects one source cell to the entire world.
 */
export function createRegionLegacyCollision(scene: PintaRegionSceneQuery) {
  const size = scene.tileSize
  const bounds = (map: Pick<PintaRegionSceneQuery, 'origin' | 'cols' | 'rows'>) => ({
    left: map.origin.col,
    top: map.origin.row,
    right: map.origin.col + map.cols,
    bottom: map.origin.row + map.rows,
  })
  const world = bounds(scene)
  type Layers = PintaRegionSceneQuery['layers']
  function tileLayers(layers: Layers) {
    return layers.flatMap((layer) => {
      if (layer.kind !== 'tiles') return []
      const e = sceneLayerState(layers, layer)
      const sheet = scene.tilesets.find((t) => t.id === layer.tilesetId)
      if (!e.visible || !sheet) return []
      const solid = new Set(sheet.solid),
        platform = new Set(sheet.platform)
      if (!layer.collision && !solid.size && !platform.size) return []
      return [
        {
          dx: Math.floor(e.offsetX / size),
          dy: Math.floor(e.offsetY / size),
          reader: scene.regionCells(layer.cells),
          material(cell: number): -1 | Cell[2] {
            const tile = cellTile(cell)
            if (layer.collision || solid.has(tile)) return 0
            return platform.has(tile) ? 1 : -1
          },
        },
      ]
    })
  }
  function visit(
    layers: ReturnType<typeof tileLayers>,
    box: GridBox,
    emit: (col: number, row: number, material: Cell[2]) => void,
  ) {
    for (const layer of layers) {
      layer.reader.visitOccupied(
        {
          col: box.left - layer.dx,
          row: box.top - layer.dy,
          cols: box.right - box.left,
          rows: box.bottom - box.top,
        },
        (cell, col, row) => {
          const value = layer.material(cell)
          if (value !== -1) emit(col + layer.dx, row + layer.dy, value)
        },
      )
    }
  }
  const rootLayers = tileLayers(scene.layers)
  const sets = new Map(
    scene.sets?.map((set) => [
      set.id,
      {
        bounds: bounds(set),
        layers: tileLayers(set.layers),
        cols: set.cols,
        rows: set.rows,
      },
    ]),
  )
  const instances = scene.layers.flatMap((layer) => {
    if (layer.kind !== 'objects') return []
    const e = sceneLayerState(scene.layers, layer)
    if (!e.visible) return []
    return layer.objects.flatMap((object) => {
      const set = object.setId ? sets.get(object.setId) : undefined
      if (!set?.layers.length || !object.width || !object.height) return []
      const x = (object.x + e.offsetX) / size,
        y = (object.y + e.offsetY) / size,
        width = object.width / size,
        height = object.height / size,
        a = ((object.rotation ?? 0) * Math.PI) / 180,
        c = Math.cos(a),
        s = Math.sin(a),
        sx = width / set.cols,
        sy = height / set.rows
      const toWorld = (col: number, row: number) => {
        const lx = (col - set.bounds.left) * sx,
          ly = (row - set.bounds.top) * sy,
          px = object.flipX ? width - lx : lx,
          py = object.flipY ? height - ly : ly
        return { x: x + px * c - py * s, y: y + px * s + py * c }
      }
      const toSet = (col: number, row: number) => {
        const dx = col - x,
          dy = row - y,
          px = dx * c + dy * s,
          py = -dx * s + dy * c
        return {
          x: (object.flipX ? width - px : px) / sx + set.bounds.left,
          y: (object.flipY ? height - py : py) / sy + set.bounds.top,
        }
      }
      return [{ ...set, toWorld, toSet }]
    })
  })

  return function* collisionCells(c0: number, r0: number, c1: number, r1: number): Generator<Cell> {
    const box = clip(world, { left: c0, top: r0, right: c1 + 1, bottom: r1 + 1 })
    if (!(box.left < box.right && box.top < box.bottom)) return
    for (let top = box.top; top < box.bottom; top += PINTA_REGION_SIDE) {
      const band = { ...box, top, bottom: Math.min(top + PINTA_REGION_SIDE, box.bottom) }
      const hits = new Map<number, Map<number, Cell[2]>>()
      const emit = (col: number, row: number, material: Cell[2]) => {
        let columns = hits.get(row)
        if (!columns) {
          columns = new Map()
          hits.set(row, columns)
        }
        if (material === 0 || !columns.has(col)) columns.set(col, material)
      }
      visit(rootLayers, band, emit)
      for (const instance of instances) {
        const local = clip(instance.bounds, transformBox(band, instance.toSet))
        visit(instance.layers, local, (col, row, material) => {
          const projected = clip(
            band,
            transformBox(
              {
                left: col,
                top: row,
                right: col + 1,
                bottom: row + 1,
              },
              instance.toWorld,
            ),
          )
          for (let y = projected.top; y < projected.bottom; y++)
            for (let x = projected.left; x < projected.right; x++) {
              const at = instance.toSet(x + 0.5, y + 0.5)
              if (Math.floor(at.x) === col && Math.floor(at.y) === row) emit(x, y, material)
            }
        })
      }
      for (let row = band.top; row < band.bottom; row++) {
        const columns = hits.get(row)
        if (!columns) continue
        for (const [col, material] of [...columns].sort((a, b) => a[0] - b[0]))
          yield [row, col, material]
      }
    }
  }
}

function clip(a: GridBox, b: GridBox): GridBox {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  }
}

function transformBox(
  box: GridBox,
  point: (x: number, y: number) => { x: number; y: number },
): GridBox {
  const corners = [
    point(box.left, box.top),
    point(box.right, box.top),
    point(box.left, box.bottom),
    point(box.right, box.bottom),
  ]
  return {
    left: Math.floor(Math.min(...corners.map((p) => p.x))),
    top: Math.floor(Math.min(...corners.map((p) => p.y))),
    right: Math.ceil(Math.max(...corners.map((p) => p.x))),
    bottom: Math.ceil(Math.max(...corners.map((p) => p.y))),
  }
}

import { PINTA_REGION_SIDE } from '@sistemazero/core/creations'
