import { expect, test } from 'bun:test'
import { DataTexture, Mesh, NoColorSpace, SRGBColorSpace } from 'three'
import { patchSceneMaterial } from '../scene/appearanceCommands'
import { compositeSceneImage, scenePalette } from '../scene/composite'
import { editSceneImageLayers } from '../scene/imageLayerCommands'
import { sceneMaterialImageBase } from '../scene/materialImages'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { SceneRenderResource } from './sceneRenderResource'

test('data channels share neutral raster without sharing color-space ownership, changing geometry or affecting opacity', () => {
  let document = makeSceneAtlasDocument()
  const imageId = document.images[0]!.id
  document = editSceneImageLayers(document, imageId, { kind: 'rgba' })
  const original = document.materials.find((m) => m.colorImageId === imageId)!
  document = patchSceneMaterial(document, original.id, {
    baseColor: { kind: 'rgba', value: [1, 1, 1, 1] },
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
    const geometry = mesh.geometry,
      version = material.version
    document = patchSceneMaterial(document, original.id, {
      normalImageId: imageId,
      roughnessImageId: imageId,
      metalnessImageId: imageId,
      normalStrength: 1 / 7,
      normalFlipY: true,
    })
    resource.update(document)
    expect(material.version).toBeGreaterThan(version)
    expect(mesh.geometry).toBe(geometry)
    expect(material.map.colorSpace).toBe(SRGBColorSpace)
    expect(material.normalMap.colorSpace).toBe(NoColorSpace)
    expect(material.roughnessMap.colorSpace).toBe(NoColorSpace)
    expect(material.metalnessMap).toBe(material.roughnessMap)
    expect(material.map).not.toBe(material.roughnessMap)
    expect(material.normalMap).not.toBe(material.roughnessMap)
    expect(material.normalScale.toArray()).toEqual([1 / 7, -1 / 7])
    expect(material.transparent).toBe(false)
    expect(material.depthWrite).toBe(true)
    const image = document.images[0]!,
      sourceMaterial = document.materials.find((m) => m.id === original.id)!,
      palette = scenePalette(document)
    expect(material.normalMap.image.data).toEqual(
      compositeSceneImage(
        image,
        palette,
        sceneMaterialImageBase(sourceMaterial, palette, 'normal'),
      ),
    )
    const normal = material.normalMap as DataTexture,
      roughness = material.roughnessMap as DataTexture
    let normalDisposals = 0,
      scalarDisposals = 0
    normal.addEventListener('dispose', () => normalDisposals++)
    roughness.addEventListener('dispose', () => scalarDisposals++)
    normal.onUpdate?.(normal)
    roughness.onUpdate?.(roughness)
    const normalVersion = normal.version,
      scalarVersion = roughness.version
    resource.update({ ...document, paletteId: 'pastel' })
    expect(normal.version).toBe(normalVersion)
    expect(roughness.version).toBe(scalarVersion)
    const detached = patchSceneMaterial(document, original.id, {
      normalImageId: null,
      roughnessImageId: null,
    })
    resource.update(detached)
    expect(material.normalMap).toBeNull()
    expect(material.roughnessMap).toBeNull()
    expect(material.metalnessMap).toBe(roughness)
    expect(normalDisposals).toBe(1)
    expect(scalarDisposals).toBe(0)
    resource.dispose()
    resource.dispose()
    expect(normalDisposals).toBe(1)
    expect(scalarDisposals).toBe(1)
  } finally {
    resource.dispose()
  }
})
