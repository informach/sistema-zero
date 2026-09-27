import { expect, test } from 'bun:test'
import { DataTexture, Mesh } from 'three'
import { patchSceneMaterial } from '../scene/appearanceCommands'
import { compositeSceneImage, scenePalette } from '../scene/composite'
import { sceneFlipbookRegion } from '../scene/imageFlipbook'
import { setSceneImageFlipbook } from '../scene/imageFlipbookCommands'
import { editSceneImageLayers } from '../scene/imageLayerCommands'
import { paintSceneImage } from '../scene/imagePaint'
import { sceneMaterialImageBase } from '../scene/materialImages'
import { SceneRasterWindow } from '../scene/SceneRasterWindow'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { SceneRenderResource } from './sceneRenderResource'

test('flipbook switches reuse all channel textures and geometry; edits stay in the sheet and metadata undo resets the view', () => {
  let document = makeSceneAtlasDocument()
  const imageId = document.images[0]!.id
  document = editSceneImageLayers(document, imageId, { kind: 'rgba' })
  const original = document.materials.find((m) => m.colorImageId === imageId)!
  document = patchSceneMaterial(document, original.id, {
    normalImageId: imageId,
    roughnessImageId: imageId,
    metalnessImageId: imageId,
  })
  const still = document
  const image = still.images.find((i) => i.id === imageId)!
  document = setSceneImageFlipbook(document, imageId, {
    frameWidth: image.width / 2,
    frameHeight: image.height / 2,
    frames: [1, 3, 0, 1],
    fps: 8,
    loop: true,
  })
  const resource = new SceneRenderResource()
  try {
    resource.update(document)
    const mesh = resource.root.children.find(
      (object) => resource.instanceFor(object)?.id === 'body',
    )
    if (!(mesh instanceof Mesh) || !Array.isArray(mesh.material)) throw new Error('Missing mesh')
    const material = mesh.material.find(
      (m) => m.map instanceof DataTexture && m.name === original.name,
    )!
    const texture = material.map as DataTexture
    const normal = material.normalMap as DataTexture
    const roughness = material.roughnessMap as DataTexture
    const geometry = mesh.geometry
    expect(material.metalnessMap).toBe(roughness)
    expect(texture.image.width).toBe(image.width / 2)
    expect(texture.image.height).toBe(image.height / 2)
    const source = document.images.find((i) => i.id === imageId)!
    const verify = (frame: number) => {
      const sourceMaterial = document.materials.find((m) => m.id === original.id)!
      for (const [kind, map] of [
        ['color', texture],
        ['normal', normal],
        ['roughness', roughness],
      ] as const) {
        const oracle = new SceneRasterWindow()
        oracle.update(
          {
            width: image.width,
            height: image.height,
            pixels: compositeSceneImage(
              source,
              scenePalette(document),
              sceneMaterialImageBase(sourceMaterial, scenePalette(document), kind),
            ),
          },
          sceneFlipbookRegion(source, frame),
        )
        expect(map.image.data).toEqual(oracle.raster!.pixels)
      }
    }
    verify(1)
    const materialVersion = material.version
    for (const frame of [3, 0, 1, 3, 0]) {
      expect(resource.setImageFrame(imageId, frame)).toBe(true)
      expect(resource.frameForImage(imageId)).toBe(frame)
      expect(material.map).toBe(texture)
      expect(material.normalMap).toBe(normal)
      expect(material.roughnessMap).toBe(roughness)
      expect(mesh.geometry).toBe(geometry)
      expect(material.version).toBe(materialVersion)
      verify(frame)
    }
    const version = texture.version
    expect(resource.setImageFrame(imageId, 0)).toBe(false)
    expect(texture.version).toBe(version)
    expect(() => resource.setImageFrame(imageId, 4)).toThrow()
    expect(texture.version).toBe(version)
    texture.onUpdate?.(texture)
    // Bottom-right belongs to frame 3, not the current top-left frame 0.
    const point: [number, number] = [image.width - 1, 0]
    const painted = paintSceneImage(
      document,
      { nodeId: 'body', materialId: original.id, imageId, layerId: image.layers[0]!.id },
      { from: point, to: point, color: [1, 2, 3, 255], brush: 1 },
    )
    resource.update(painted)
    expect(texture.version).toBe(version)
    expect(resource.frameForImage(imageId)).toBe(0)
    resource.setImageFrame(imageId, 3)
    const offset = (image.width / 2 - 1) * 4
    expect(texture.image.data!.slice(offset, offset + 4)).toEqual(new Uint8Array([1, 2, 3, 255]))
    let disposed = 0
    texture.addEventListener('dispose', () => disposed++)
    resource.update(still)
    expect(resource.frameForImage(imageId)).toBeNull()
    expect(material.map.image.width).toBe(image.width)
    expect(disposed).toBe(1)
    resource.update(document)
    expect(resource.frameForImage(imageId)).toBe(1)
    expect(mesh.geometry).toBe(geometry)
    resource.dispose()
    expect(resource.frameForImage(imageId)).toBeNull()
    expect(() => resource.setImageFrame(imageId, 0)).toThrow()
  } finally {
    resource.dispose()
  }
})
