import { expect, test } from 'bun:test'
import { DataTexture, Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { encodeSceneGlb } from '../export/sceneGlb'
import { patchSceneMaterial } from '../scene/appearanceCommands'
import { setSceneImageFlipbook } from '../scene/imageFlipbookCommands'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { SceneRenderResource } from './sceneRenderResource'

function material(resource: SceneRenderResource, index = 0) {
  const mesh = resource.root.children[index]
  if (!(mesh instanceof Mesh) || !Array.isArray(mesh.material)) throw new Error('Missing mesh')
  const material = mesh.material[0]
  if (!(material instanceof MeshStandardMaterial)) throw new Error('Missing material')
  return material
}

test('MASK flipbooks retain hidden color and reuse texture/shader across frames', () => {
  const base = makeSceneGlbFixture(1, 1, 2, 2)
  base.materials[0]!.baseColor = { kind: 'rgba', value: [0, 0, 0, 0] }
  base.materials[0]!.alphaMask = { cutoff: 0, opacity: 0.37 }
  const pixels = base.images[0]!.layers[0]!.pixels
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 0
  const source = setSceneImageFlipbook(base, 'paint', {
    frameWidth: 1,
    frameHeight: 1,
    frames: [0, 3],
    fps: 8,
    loop: true,
  })
  const resource = new SceneRenderResource()
  try {
    resource.update(source)
    const drawn = material(resource)
    const texture = drawn.map
    if (!(texture instanceof DataTexture)) throw new Error('Missing texture')
    const version = drawn.version
    for (const [frame, offset] of [
      [0, 8],
      [3, 4],
      [0, 8],
    ] as const) {
      resource.setImageFrame('paint', frame)
      expect(drawn.map).toBe(texture)
      expect(texture.image.data).toEqual(pixels.slice(offset, offset + 4))
      expect(drawn.alphaTest).toBe(0)
      expect(drawn.opacity).toBe(0.37)
      expect(drawn.transparent).toBe(false)
      expect(drawn.depthWrite).toBe(true)
      expect(drawn.version).toBe(version)
    }
  } finally {
    resource.dispose()
  }
})

test('MASK agrees with independent GLTFLoader for untextured alpha, zero cutoff and fully hidden surfaces', async () => {
  const source = makeSceneGlbFixture(1, 1, 2, 0)
  source.animations = []
  source.materials[0]!.baseColor = { kind: 'rgba', value: [0.2, 0.4, 0.8, 0.37123456789] }
  const original = structuredClone(source)
  const resource = new SceneRenderResource()
  try {
    for (const cutoff of [0, 0.123456789123, 1.1]) {
      const document = patchSceneMaterial(source, 'material', {
        alphaMask: { cutoff, opacity: 0.731 },
      })
      resource.update(document)
      const actual = material(resource)
      const result = encodeSceneGlb(document)
      await expectValidGlb(result.bytes)
      const loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
      const meshes: Mesh[] = []
      loaded.scene.traverse((object) => {
        if (object instanceof Mesh) meshes.push(object)
      })
      try {
        expect(meshes).toHaveLength(1)
        const expected = meshes[0]!.material
        if (!(expected instanceof MeshStandardMaterial)) throw new Error('Missing loaded material')
        expect(actual.alphaTest).toBe(expected.alphaTest)
        expect(actual.opacity).toBe(expected.opacity)
        expect(actual.transparent).toBe(false)
        expect(actual.depthWrite).toBe(true)
        expect(actual.transparent).toBe(expected.transparent)
        expect(actual.depthWrite).toBe(expected.depthWrite)
      } finally {
        for (const mesh of meshes) {
          mesh.geometry.dispose()
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
            material.dispose()
        }
      }
    }
    expect(source).toEqual(original)
  } finally {
    resource.dispose()
  }
})

test('mask/automatic users share authorial paint, not incompatible rasters; live cutoff, paint and undo preserve contracts', () => {
  const source = makeSceneGlbFixture(2, 1, 2, 2)
  source.materials[0]!.baseColor = { kind: 'rgba', value: [0, 0, 0, 0] }
  source.materials.push({
    ...source.materials[0]!,
    id: 'masked',
    alphaMask: { cutoff: 0, opacity: 0.37 },
  })
  const node = source.nodes[1]!
  if (node.kind !== 'mesh') throw new Error('Expected mesh')
  node.materialId = 'masked'
  source.images[0]!.layers[0]!.pixels.set([193, 47, 91, 0, 73, 23, 197, 64])
  const original = structuredClone(source)
  const resource = new SceneRenderResource()
  try {
    resource.update(source)
    const blended = material(resource)
    const masked = material(resource, 1)
    const texture = masked.map
    if (!(texture instanceof DataTexture) || !(blended.map instanceof DataTexture))
      throw new Error('Missing textures')
    expect(texture).not.toBe(blended.map)
    expect(Array.from(texture.image.data!).slice(0, 8)).toEqual([193, 47, 91, 0, 73, 23, 197, 64])
    expect(Array.from(blended.map.image.data!).slice(0, 4)).toEqual([0, 0, 0, 0])
    expect(masked.opacity).toBe(0.37)
    expect(masked.transparent).toBe(false)
    expect(masked.depthWrite).toBe(true)
    expect(blended.transparent).toBe(true)
    const version = masked.version
    const cut = patchSceneMaterial(source, 'masked', { alphaMask: { cutoff: 0.5, opacity: 0.7 } })
    resource.update(cut)
    expect(masked.version).toBeGreaterThan(version)
    expect(masked.map).toBe(texture)
    const compiled = masked.version
    resource.update(patchSceneMaterial(cut, 'masked', { alphaMask: { cutoff: 0.9, opacity: 0.1 } }))
    expect(masked.version).toBe(compiled)
    const painted = structuredClone(cut)
    painted.images[0]!.layers[0]!.pixels.set([17, 31, 91, 0])
    resource.update(painted)
    expect(masked.map).toBe(texture)
    expect(Array.from(texture.image.data!).slice(0, 4)).toEqual([17, 31, 91, 0])
    expect(masked.transparent).toBe(false)
    resource.update(patchSceneMaterial(cut, 'masked', { alphaMask: null }))
    expect(masked.alphaTest).toBe(0)
    expect(masked.opacity).toBe(1)
    expect(masked.transparent).toBe(true)
    expect(masked.depthWrite).toBe(false)
    resource.update(source)
    expect(masked.alphaTest).toBe(0)
    expect(masked.opacity).toBe(0.37)
    expect(masked.transparent).toBe(false)
    expect(source).toEqual(original)
  } finally {
    resource.dispose()
  }
})
