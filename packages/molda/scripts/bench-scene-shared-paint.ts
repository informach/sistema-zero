import { DataTexture, Mesh } from 'three'
import type { MoldaSceneDocument, SceneImage, SceneMaterial } from '../src/scene/document'
import { bakeSceneImageAtlas } from '../src/scene/imageAtlas'
import { applySceneImageAtlas, prepareSceneImageAtlas } from '../src/scene/imageAtlasCommands'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeSceneAtlasDocument } from '../src/testing/sceneAtlasFixture'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { SceneRenderResource } from '../src/viewport/sceneRenderResource'

/** CPU/resource identity only: no WebGL allocation, GPU timing, FPS or device claim. */
const stats = (values: number[]) => {
  values.sort((a, b) => a - b)
  return {
    p50: +values[Math.floor(values.length / 2)]!.toFixed(3),
    p95: +values[Math.ceil(values.length * 0.95) - 1]!.toFixed(3),
  }
}
for (const count of [8, 32, 128]) {
  const original = makeSceneAtlasDocument()
  const node = original.nodes[0]!
  if (node.kind !== 'mesh') throw new Error('Missing mesh')
  const images: SceneImage[] = Array.from({ length: Math.min(16, count) }, (_, i) => ({
    id: `image_${i}`,
    name: 'Paint',
    width: 64,
    height: 64,
    encoding: 'indexed',
    layers: [
      {
        id: 'layer',
        name: 'Paint',
        opacity: 1,
        visible: true,
        pixels: new Uint8Array(64 * 64).fill((i % 7) + 1),
      },
    ],
  }))
  const materials: SceneMaterial[] = Array.from({ length: count }, (_, i) => ({
    id: `material_${i}`,
    name: 'Finish',
    baseColor: { kind: 'rgba', value: [0, 0, 0, 0] },
    colorImageId: images[i % images.length]!.id,
    roughness: i / count,
    metalness: 0,
    doubleSided: false,
  }))
  const geometry = makeSceneGridGeometry(16)
  Object.values(geometry.faces).forEach((face, i) => {
    face.materialId = materials[i % count]!.id
  })
  const source: MoldaSceneDocument = {
    ...original,
    nodes: [{ ...node, geometryId: geometry.id, materialId: materials[0]!.id }],
    geometries: [geometry],
    materials,
    images,
    mirrors: [],
  }
  const plan = prepareSceneImageAtlas(source, node.id)
  const raster = bakeSceneImageAtlas(plan.images, plan.tiles, plan.palette)
  let id = 0
  const document = applySceneImageAtlas(source, plan, raster, () => `added_${++id}`)
  if (readSceneDocument(document).status !== 'valid') throw new Error('Invalid benchmark')
  const cold: number[] = [],
    change: number[] = []
  let textures = 0,
    bytes = 0
  for (let sample = 0; sample < 23; sample++) {
    const resource = new SceneRenderResource()
    try {
      let start = performance.now()
      resource.update(document)
      const coldMs = performance.now() - start
      const image = document.images.at(-1)!,
        layer = image.layers[0]!
      const pixels = layer.pixels.slice()
      pixels.set([17, 33, 65, 255], 0)
      const changed = {
        ...document,
        images: [...document.images.slice(0, -1), { ...image, layers: [{ ...layer, pixels }] }],
      }
      start = performance.now()
      resource.update(changed)
      const changeMs = performance.now() - start
      const maps = new Set<DataTexture>()
      resource.root.traverse((object) => {
        if (!(object instanceof Mesh)) return
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          if (material.map instanceof DataTexture) maps.add(material.map)
      })
      textures = maps.size
      bytes = [...maps].reduce((n, texture) => n + texture.image.data.byteLength, 0)
      for (const texture of maps)
        if (!pixels.every((byte, i) => texture.image.data[i] === byte))
          throw new Error('Raster mismatch')
      if (sample >= 3) {
        cold.push(coldMs)
        change.push(changeMs)
      }
    } finally {
      resource.dispose()
    }
  }
  console.info(
    JSON.stringify({
      materials: count,
      atlas: [raster.width, raster.height],
      samples: cold.length,
      coldMs: stats(cold),
      paintUpdateMs: stats(change),
      textures,
      textureBytes: bytes,
    }),
  )
}
