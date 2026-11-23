import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import {
  createPintaProjectionGeometry,
  PINTA_HEX_EMPTY_CELL,
  PINTA_REGION_SIDE,
  unpackPintaHexCell,
} from '@sistemazero/core/creations'
import type { PintaProjectedScene } from '@sistemazero/core/studio/pinta-projected-scene'
import { createProjectedSceneQueries } from '@sistemazero/core/studio/pinta-projected-scene-query'
import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { createRegionSceneQueries } from '@sistemazero/core/studio/pinta-scene-query'
import { sceneLayerState } from '@sistemazero/core/studio/pinta-scene-runtime'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { warnSkippedInCi } from '../../testing/ciPython'
import { projectedVila } from '../../testing/projectedVila'
import { regionVila } from '../../testing/regionVila'
import { exportPintaProjectedScene } from '../projectedScene'
import { exportPintaRegionScene } from '../regionScene'
import { drawScene } from '../sceneDrawing'
import { buildScenePackage } from '../scenePackage'

const tiledBinary = process.env.PINTA_TILED_BIN
warnSkippedInCi(
  tiledBinary,
  'A comparação de pixels com o tmxrasterizer do Tiled pulou: o CI não tem o Tiled (PINTA_TILED_BIN).',
)
/** Tiled keeps an infinite layer in 16 × 16 chunks; its rasterizer frames the used ones. */
const TILED_CHUNK = 16

type Scene = PintaRegionScene | PintaProjectedScene

function geometryOf(scene: Scene) {
  return createPintaProjectionGeometry(
    scene.version === 5
      ? scene.projection
      : { kind: 'orthogonal', tileWidth: scene.tileSize, tileHeight: scene.tileSize },
  )
}

function occupiedCells(scene: Scene) {
  const cells: Array<{ col: number; row: number; value: number; hex: boolean }> = []
  for (const layer of scene.layers) {
    if (layer.kind !== 'tiles' || Array.isArray(layer.cells)) continue
    const hex = layer.cells.kind === 'hex-regions'
    for (const chunk of layer.cells.chunks)
      chunk.cells.forEach((value, index) => {
        if (hex ? value === PINTA_HEX_EMPTY_CELL : value < 0) return
        cells.push({
          col: chunk.col * PINTA_REGION_SIDE + (index % PINTA_REGION_SIDE),
          row: chunk.row * PINTA_REGION_SIDE + Math.floor(index / PINTA_REGION_SIDE),
          value,
          hex,
        })
      })
  }
  return cells
}

/** The rasterizer's image frame, from the used Tiled chunks and the shared projection geometry. */
function tiledFrame(scene: Scene) {
  const cells = occupiedCells(scene)
  const floor = (value: number) => Math.floor(value / TILED_CHUNK) * TILED_CHUNK
  const col = floor(Math.min(...cells.map((cell) => cell.col)))
  const row = floor(Math.min(...cells.map((cell) => cell.row)))
  return geometryOf(scene).worldBounds({
    col,
    row,
    cols: floor(Math.max(...cells.map((cell) => cell.col))) + TILED_CHUNK - col,
    rows: floor(Math.max(...cells.map((cell) => cell.row))) + TILED_CHUNK - row,
  })
}

async function pixels(png: Buffer) {
  const decoded = await loadImage(png)
  const canvas = createCanvas(decoded.width, decoded.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(decoded, 0, 0)
  const { width, height } = canvas
  return { width, height, data: ctx.getImageData(0, 0, width, height).data }
}

/** Pixels covered by the frame of a cell turned by 60° or 120°, with one pixel of margin. */
function turnedFrames(
  scene: Scene,
  width: number,
  height: number,
  origin: { x: number; y: number },
) {
  const geometry = geometryOf(scene)
  const size = scene.tileSize
  const reach = size * Math.SQRT1_2 + 1
  const mask = new Uint8Array(width * height)
  for (const cell of occupiedCells(scene)) {
    if (!cell.hex || !((unpackPintaHexCell(cell.value)?.rotation ?? 0) % 180)) continue
    // The compositor centers the frame like this before turning it.
    const center = geometry.center(cell.col, cell.row)
    const x = center.x + (size - geometry.cellWidth) / 2 - origin.x
    const y = center.y + (geometry.cellHeight - size) / 2 - origin.y
    for (let row = Math.max(0, Math.floor(y - reach)); row < Math.min(height, y + reach); row++)
      for (let col = Math.max(0, Math.floor(x - reach)); col < Math.min(width, x + reach); col++)
        mask[row * width + col] = 1
  }
  return mask
}

/** Only this layer, with its groups, in both passes of the compositor the players use. */
function drawLayer(
  target: CanvasRenderingContext2D,
  scene: Scene,
  layerId: string,
  art: ReadonlyMap<string, CanvasImageSource>,
  view: { x: number; y: number; width: number; height: number },
) {
  const keep = (entry: Scene['layers'][number]) => entry.kind === 'group' || entry.id === layerId
  for (const pass of ['back', 'front'] as const) {
    if (scene.version === 5) {
      const { context } = createProjectedSceneQueries({
        ...scene,
        layers: scene.layers.filter(keep),
      })
      const cells = { ...view, projectedCells: context.regionCells }
      drawScene(target, context, art, pass, 0, { x: 0, y: 0 }, cells)
    } else {
      const { context } = createRegionSceneQueries({ ...scene, layers: scene.layers.filter(keep) })
      drawScene(
        target,
        context,
        art,
        pass,
        0,
        { x: 0, y: 0 },
        { ...view, regionCells: context.regionCells },
      )
    }
  }
}

test.skipIf(!tiledBinary)(
  'tmxrasterizer draws every Vila and Cabana layer like the shared compositor, in the three grids',
  async () => {
    const rasterizer = join(
      dirname(tiledBinary!),
      process.platform === 'win32' ? 'tmxrasterizer.exe' : 'tmxrasterizer',
    )
    const tempRoot = resolve(tmpdir())
    const scratch = await mkdtemp(join(tempRoot, 'pinta-tiled-raster-'))
    if (dirname(scratch) !== tempRoot || !basename(scratch).startsWith('pinta-tiled-raster-'))
      throw new Error('Diretório temporário inesperado.')
    const results: Array<{ map: string; layer: string; differing: number; maxDelta: number }> = []
    try {
      const square = regionVila()
      const projected = projectedVila()
      const findSquare = (id: string) => square.assets.find((asset) => asset.id === id) ?? null
      const findProjected = (id: string) =>
        projected.assets.find((asset) => asset.id === id) ?? null
      const worlds = [
        {
          folder: 'regional',
          files: await buildScenePackage(square.map, square.assets, 'tiled', {
            imageOf: nativeImageOf,
          }),
          scenes: await Promise.all(
            [square.map, square.cabana].map(
              async (source): Promise<Scene> =>
                (await exportPintaRegionScene(source, findSquare, nativeImageOf)).scene,
            ),
          ),
        },
        {
          folder: 'projetado',
          files: await buildScenePackage(projected.map, projected.assets, 'tiled', {
            imageOf: nativeImageOf,
          }),
          scenes: await Promise.all(
            [projected.map, projected.cabana].map(
              async (source): Promise<Scene> =>
                (await exportPintaProjectedScene(source, findProjected, nativeImageOf)).scene,
            ),
          ),
        },
      ]
      for (const world of worlds) {
        for (const [file, content] of Object.entries(world.files)) {
          const path = join(scratch, world.folder, file)
          await mkdir(dirname(path), { recursive: true })
          await writeFile(path, content)
        }
        for (const [index, scene] of world.scenes.entries()) {
          const art = new Map<string, CanvasImageSource>()
          for (const entry of [...scene.tilesets, ...(scene.art ?? [])])
            art.set(entry.id, (await loadImage(entry.image)) as unknown as CanvasImageSource)
          const frame = tiledFrame(scene)
          for (const layer of scene.layers) {
            if (layer.kind !== 'tiles') continue
            const output = join(scratch, world.folder, `raster-${index}-${layer.id}.png`)
            const run = spawnSync(
              rasterizer,
              [
                '--no-smoothing',
                '--show-layer',
                layer.name,
                join(scratch, world.folder, `mapas/mapa-${index}/mapa.tmx`),
                output,
              ],
              { encoding: 'utf8', windowsHide: true, timeout: 20_000 },
            )
            if (run.status !== 0)
              throw new Error(run.stderr || run.error?.message || 'tmxrasterizer failed')
            const tiled = await pixels(await readFile(output))
            const canvas = createCanvas(tiled.width, tiled.height)
            const ctx = canvas.getContext('2d')
            ctx.imageSmoothingEnabled = false
            ctx.translate(-frame.x, -frame.y)
            const view = { x: frame.x, y: frame.y, width: tiled.width, height: tiled.height }
            drawLayer(ctx as unknown as CanvasRenderingContext2D, scene, layer.id, art, view)
            const pinta = ctx.getImageData(0, 0, tiled.width, tiled.height).data
            // Qt and Skia rasterize the edges of a 60° or 120° turn differently. Those frames
            // keep their raw flags under the GID and Godot proofs; every other pixel must match.
            const turned = turnedFrames(scene, tiled.width, tiled.height, frame)
            // A fractional layer opacity is composed in 8-bit premultiplied color by both
            // libraries; their rounding may differ by a few levels, never in coverage.
            const tolerance = sceneLayerState(scene.layers, layer).opacity < 1 ? 3 : 0
            let differing = 0
            let maxDelta = 0
            for (let pixel = 0; pixel < turned.length; pixel++) {
              if (turned[pixel]) continue
              const at = pixel * 4
              let delta = 0
              for (let k = 0; k < 4; k++)
                delta = Math.max(delta, Math.abs(tiled.data[at + k]! - pinta[at + k]!))
              if (!tiled.data[at + 3] !== !pinta[at + 3]) delta = 255
              maxDelta = Math.max(maxDelta, delta)
              if (delta > tolerance) differing++
            }
            results.push({
              map: `${world.folder}/${scene.id}`,
              layer: layer.id,
              differing,
              maxDelta,
            })
          }
        }
      }
    } finally {
      await rm(scratch, { force: true, recursive: true })
    }
    console.log(JSON.stringify(results))
    // 16 square Vila layers, the Cabana, the same 16 in the diamond grid and the hex Cabana.
    expect(results).toHaveLength(34)
    expect(results.filter((result) => result.differing)).toEqual([])
  },
  180_000,
)
