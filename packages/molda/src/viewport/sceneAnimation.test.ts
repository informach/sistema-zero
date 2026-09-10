import { expect, test } from 'bun:test'
import {
  BufferAttribute,
  type BufferGeometry,
  DataTexture,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Vector3,
} from 'three'
import { addSceneMirror, groupSceneNodes } from '../scene/commands'
import type { MoldaSceneDocument } from '../scene/document'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { animatedScene, sceneAnimationClip } from '../testing/sceneAnimation'
import { SceneRenderResource } from './sceneRenderResource'

function drawn(resource: SceneRenderResource, id: string): Mesh<BufferGeometry> {
  const mesh = resource.root.children.find((object) => resource.instanceFor(object)?.id === id)
  if (!(mesh instanceof Mesh)) throw new Error(`Missing ${id}`)
  return mesh
}

function versions(geometry: BufferGeometry) {
  return Object.values(geometry.attributes).map((attribute) => {
    if (!(attribute instanceof BufferAttribute)) throw new Error('Unexpected interleaved attribute')
    return attribute.version
  })
}

test('animated matrices move descendants/mirrors and picking, retaining resources, upload versions and isolation', () => {
  const grouped = groupSceneNodes(animatedScene(), ['body'], { nextId: () => 'group' })
  const source: MoldaSceneDocument = {
    ...addSceneMirror(grouped, 'body', { axis: 'x', offset: 0, nextId: () => 'mirror' }),
    animations: [
      {
        ...sceneAnimationClip('group'),
        tracks: [
          {
            nodeId: 'group',
            channel: 'translation',
            keys: [
              { time: 0, value: [0, 0, 0], interpolation: 'linear' },
              { time: 2, value: [8, 0, 0], interpolation: 'linear' },
            ],
          },
        ],
      },
    ],
  }
  const original = structuredClone(source)
  const resource = new SceneRenderResource()
  try {
    resource.update(source)
    const body = drawn(resource, 'body'),
      mirror = drawn(resource, 'mirror')
    const material = (Array.isArray(body.material) ? body.material : [body.material]).find(
      (item) => item instanceof MeshStandardMaterial && item.map instanceof DataTexture,
    )
    if (!(material instanceof MeshStandardMaterial) || !(material.map instanceof DataTexture))
      throw new Error('Missing paint')
    const texture = material.map,
      pixels = texture.image.data,
      textureVersion = texture.version
    const geometry = body.geometry,
      attrs = geometry.attributes,
      materialList = body.material
    const bodyRest = body.matrix.clone(),
      mirrorRest = mirror.matrix.clone()
    const vertexVersions = versions(geometry)
    const center = geometry.boundingBox!.getCenter(new Vector3()).applyMatrix4(body.matrixWorld)
    const ray = new Raycaster(center.clone().add(new Vector3(0, 0, 20)), new Vector3(0, 0, -1))
    const originalHit = ray.intersectObject(body)[0]
    expect(originalHit).toBeDefined()
    drawn(resource, 'wing').visible = false
    const compiled = prepareSceneAnimation(source, 'clip')
    for (let i = 0; i < 300; i++) resource.setPose(compiled.sample(i / 150, false))
    const pose = compiled.sample(2, false)
    expect(resource.setPose(pose)).toBe(true)
    expect(resource.setPose(pose)).toBe(false)
    expect(ray.intersectObject(body)).toHaveLength(0)
    ray.ray.origin.x += 8
    const movedHit = ray.intersectObject(body)[0]!
    expect(movedHit.uv!.x).toBeCloseTo(originalHit!.uv!.x, 12)
    expect(movedHit.uv!.y).toBeCloseTo(originalHit!.uv!.y, 12)
    expect(body.matrix.elements[12]).toBeCloseTo(bodyRest.elements[12]! + 8, 12)
    expect(mirror.matrix.elements[12]).toBeCloseTo(mirrorRest.elements[12]! - 8, 12)
    expect(resource.instanceFor(body)?.worldMatrix).toEqual(body.matrix.elements)
    expect(resource.instanceFor(mirror)?.orientation).toBe(-1)
    expect(drawn(resource, 'wing').visible).toBe(false)
    expect(body.geometry).toBe(geometry)
    expect(geometry.attributes).toBe(attrs)
    expect(versions(geometry)).toEqual(vertexVersions)
    expect(body.material).toBe(materialList)
    expect(texture.image.data).toBe(pixels)
    expect(texture.version).toBe(textureVersion)
    expect(resource.setPose(null)).toBe(true)
    expect(body.matrix).toEqual(bodyRest)
    expect(mirror.matrix).toEqual(mirrorRest)
    expect(resource.setPose(null)).toBe(false)
    expect(source).toEqual(original)
  } finally {
    resource.dispose()
  }
})

test('late poses cannot cross revisions; invalid later transforms are rejected before any mesh moves', () => {
  const source = animatedScene()
  source.animations[0]!.tracks = ['body', 'wing'].map((nodeId) => ({
    nodeId,
    channel: 'translation' as const,
    keys: [
      { time: 0, value: [0, 0, 0], interpolation: 'linear' as const },
      { time: 2, value: [nodeId === 'body' ? 8 : 1e39, 0, 0], interpolation: 'linear' as const },
    ],
  }))
  const resource = new SceneRenderResource()
  try {
    resource.update(source)
    const body = drawn(resource, 'body'),
      wing = drawn(resource, 'wing')
    const beforeBody = body.matrix.clone(),
      beforeWing = wing.matrix.clone()
    const compiled = prepareSceneAnimation(source, 'clip')
    expect(() => resource.setPose(compiled.sample(2, false))).toThrow('precisão')
    expect(body.matrix).toEqual(beforeBody)
    expect(wing.matrix).toEqual(beforeWing)
    const next = { ...source, name: 'Outra revisão' }
    resource.update(next)
    expect(resource.setPose(compiled.sample(0))).toBe(false)
    expect(body.matrix).toEqual(beforeBody)
    resource.dispose()
    expect(() => resource.setPose(null)).toThrow('descartada')
  } finally {
    resource.dispose()
  }
})
