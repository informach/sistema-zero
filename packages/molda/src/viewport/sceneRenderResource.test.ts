import { describe, expect, test } from 'bun:test'
import { DataTexture, Mesh, MeshStandardMaterial, Raycaster, SRGBColorSpace, Vector3 } from 'three'
import {
  addSceneMirror,
  deleteSceneNodes,
  groupSceneNodes,
  setSceneNodeFlag,
  transformSceneNodes,
} from '../scene/commands'
import { compositeSceneImage, sceneBaseColor, scenePalette } from '../scene/composite'
import type { MoldaSceneDocument } from '../scene/document'
import { paintSceneImage } from '../scene/imagePaint'
import { identityMatrix } from '../scene/matrix'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { RgbaTexture } from './rgbaTexture'
import { SceneRenderResource } from './sceneRenderResource'

function fixture() {
  return migrateLegacyModel(makeModel()).document
}

function mesh(resource: SceneRenderResource, id: string) {
  const object = resource.root.children.find((object) => resource.instanceFor(object)?.id === id)
  if (!(object instanceof Mesh)) throw new Error(`Missing mesh ${id}`)
  return object
}

function materials(object: Mesh): MeshStandardMaterial[] {
  const entries = Array.isArray(object.material) ? object.material : [object.material]
  return entries.map((material) => {
    if (!(material instanceof MeshStandardMaterial)) throw new Error('Expected standard material')
    return material
  })
}

function paintedMaterial(object: Mesh) {
  const material = materials(object).find((material) => material.map !== null)
  if (!material || !(material.map instanceof DataTexture)) throw new Error('Missing paint texture')
  return { material, texture: material.map }
}

function repaint(document: MoldaSceneDocument) {
  const image = document.images[0]
  const layer = image?.layers[0]
  if (!image || !layer) throw new Error('Missing image')
  const pixels = layer.pixels.slice()
  pixels[0] = 12
  return {
    ...document,
    images: [{ ...image, layers: [{ ...layer, pixels }] }, ...document.images.slice(1)],
  }
}

describe('scene draw resource ownership', () => {
  test('partial paint merges pending upload rows, restores exact undo pixels and skips finish-only texture uploads', () => {
    const resource = new SceneRenderResource()
    try {
      const source = fixture(),
        image = source.images[0]!
      const material = source.materials.find((m) => m.colorImageId === image.id)!
      const target = {
        nodeId: 'body',
        materialId: material.id,
        imageId: image.id,
        layerId: image.layers[0]!.id,
      }
      resource.update(source)
      const { texture } = paintedMaterial(mesh(resource, 'body'))
      texture.onUpdate?.(texture)
      let next = paintSceneImage(source, target, { from: [1, 2], to: [2, 2], color: 7, brush: 1 })
      resource.update(next)
      expect(texture.updateRanges).toEqual([{ start: (2 * image.width + 1) * 4, count: 8 }])
      next = paintSceneImage(next, target, { from: [4, 2], to: [4, 3], color: 5, brush: 1 })
      resource.update(next)
      expect(texture.updateRanges).toEqual([
        { start: (2 * image.width + 1) * 4, count: 16 },
        { start: (3 * image.width + 4) * 4, count: 4 },
      ])
      texture.onUpdate?.(texture)
      const version = texture.version
      resource.update({
        ...next,
        materials: next.materials.map((m) =>
          m.id === material.id ? { ...m, name: 'Metal', roughness: 0.1 } : m,
        ),
      })
      expect(texture.version).toBe(version)
      resource.update(source)
      const palette = scenePalette(source)
      expect(texture.image.data).toEqual(
        compositeSceneImage(image, palette, sceneBaseColor(material, palette)),
      )
    } finally {
      resource.dispose()
    }
  })
  test('partial alpha changes maintain whole-image transparency, depth writing and shader invalidation', () => {
    const resource = new SceneRenderResource()
    try {
      const source = fixture(),
        image = source.images[0]!
      const material = source.materials.find((m) => m.colorImageId === image.id)!
      const target = {
        nodeId: 'body',
        materialId: material.id,
        imageId: image.id,
        layerId: image.layers[0]!.id,
      }
      let document: MoldaSceneDocument = {
        ...source,
        materials: source.materials.map((m) =>
          m === material ? { ...m, baseColor: { kind: 'rgba', value: [0, 0, 0, 0] } } : m,
        ),
        images: source.images.map((i) =>
          i === image
            ? {
                ...image,
                width: 2,
                height: 1,
                encoding: 'rgba',
                layers: [
                  { ...image.layers[0]!, pixels: new Uint8Array([255, 0, 0, 0, 0, 255, 0, 0]) },
                ],
              }
            : i,
        ),
      }
      resource.update(document)
      const drawn = paintedMaterial(mesh(resource, 'body'))
      expect(drawn.material.transparent).toBe(true)
      for (const x of [0, 1]) {
        document = paintSceneImage(document, target, {
          from: [x, 0],
          to: [x, 0],
          color: [10, 20, 30, 255],
          brush: 1,
        })
        resource.update(document)
        expect(drawn.material.transparent).toBe(x === 0)
        expect(drawn.material.depthWrite).toBe(x === 1)
      }
      const version = drawn.material.version
      document = paintSceneImage(document, target, {
        from: [0, 0],
        to: [0, 0],
        color: [0, 0, 0, 0],
        brush: 1,
      })
      resource.update(document)
      expect(drawn.material.transparent).toBe(true)
      expect(drawn.material.version).toBeGreaterThan(version)
    } finally {
      resource.dispose()
    }
  })
  test('procedural mirrors share geometry and materials; transforms do not rebuild paint or GPU attributes', () => {
    const resource = new SceneRenderResource()
    try {
      const source = addSceneMirror(fixture(), 'body', {
        axis: 'x',
        offset: 1,
        nextId: () => 'mirror',
      })
      expect(resource.update(source)).toEqual([])
      const body = mesh(resource, 'body')
      const mirror = mesh(resource, 'mirror')
      expect(mirror.geometry).toBe(body.geometry)
      expect(materials(mirror)[0]).toBe(materials(body)[0])
      expect(mirror.matrixWorld.determinant()).toBeLessThan(0)
      const { texture } = paintedMaterial(body)
      const geometry = body.geometry
      const position = geometry.getAttribute('position')
      const version = texture.version
      const delta = identityMatrix()
      delta[12] = 1.25
      resource.update(transformSceneNodes(source, ['body'], delta))
      expect(mesh(resource, 'body')).toBe(body)
      expect(body.geometry).toBe(geometry)
      expect(body.geometry.getAttribute('position')).toBe(position)
      expect(paintedMaterial(body).texture).toBe(texture)
      expect(texture.version).toBe(version)
      expect(body.matrixWorld.elements[12]).toBeCloseTo(1.25, 8)
    } finally {
      resource.dispose()
    }
  })

  test('paint updates reuse the rectangular texture and do not touch geometry or unrelated materials', () => {
    const resource = new SceneRenderResource()
    try {
      const source = fixture()
      resource.update(source)
      const body = mesh(resource, 'body')
      const wing = mesh(resource, 'wing')
      const { material, texture } = paintedMaterial(body)
      const other = paintedMaterial(wing).texture
      const otherVersion = other.version
      const position = body.geometry.getAttribute('position')
      texture.onUpdate?.(texture)
      const beforeVersion = texture.version
      const next = repaint(source)
      resource.update(next)
      expect(paintedMaterial(body)).toEqual({ material, texture })
      expect(texture.version).toBeGreaterThan(beforeVersion)
      expect(other.version).toBe(otherVersion)
      expect(body.geometry.getAttribute('position')).toBe(position)
      const image = next.images[0]
      const sourceMaterial = next.materials.find((entry) => entry.colorImageId === image?.id)
      if (!image || !sourceMaterial) throw new Error('Missing paint')
      const palette = scenePalette(next)
      expect(texture.image.data).toEqual(
        compositeSceneImage(image, palette, sceneBaseColor(sourceMaterial, palette)),
      )
      expect(texture.colorSpace).toBe(SRGBColorSpace)
      expect(texture.flipY).toBe(false)
      expect(material.color.toArray()).toEqual([1, 1, 1])
    } finally {
      resource.dispose()
    }
  })

  test('real raycasting resolves the authorial source and face without a viewport or WebGL mock', () => {
    const resource = new SceneRenderResource()
    try {
      const source = fixture()
      resource.update(source)
      const ray = new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0))
      const hit = ray.intersectObjects(resource.root.children, false)[0]
      if (!hit || hit.faceIndex == null) throw new Error('Missing ray hit')
      expect(resource.instanceFor(hit.object)?.sourceNodeId).toBe('body')
      expect(resource.faceFor(hit.object, hit.faceIndex)).toBe('py')
      expect(hit.uv?.x).toBeCloseTo(0.5, 5)
      expect(hit.uv?.y).toBeCloseTo(0.5, 5)
    } finally {
      resource.dispose()
    }
  })

  test('group visibility and deletion are derived; obsolete shared resources dispose exactly once', () => {
    const resource = new SceneRenderResource()
    const source = addSceneMirror(
      groupSceneNodes(fixture(), ['body'], { nextId: () => 'group' }),
      'body',
      { axis: 'x', offset: 0, nextId: () => 'mirror' },
    )
    resource.update(source)
    const body = mesh(resource, 'body')
    const { material, texture } = paintedMaterial(body)
    let geometryDisposals = 0
    let materialDisposals = 0
    let textureDisposals = 0
    body.geometry.addEventListener('dispose', () => geometryDisposals++)
    material.addEventListener('dispose', () => materialDisposals++)
    texture.addEventListener('dispose', () => textureDisposals++)
    resource.update(setSceneNodeFlag(source, ['group'], 'hidden', true))
    expect(body.visible).toBe(false)
    expect(mesh(resource, 'mirror').visible).toBe(false)
    resource.update(deleteSceneNodes(source, ['group']))
    expect(resource.root.children).toHaveLength(1)
    expect(resource.instanceFor(body)).toBeNull()
    expect(geometryDisposals).toBe(1)
    expect(materialDisposals).toBe(1)
    expect(textureDisposals).toBe(1)
    resource.dispose()
    resource.dispose()
    expect(geometryDisposals).toBe(1)
    expect(materialDisposals).toBe(1)
    expect(textureDisposals).toBe(1)
    expect(resource.root.children).toHaveLength(0)
  })

  test('invalid changed geometry leaves the previous visible frame and resources untouched', () => {
    const resource = new SceneRenderResource()
    try {
      const source = fixture()
      resource.update(source)
      const body = mesh(resource, 'body')
      const geometry = body.geometry
      const { texture } = paintedMaterial(body)
      const version = texture.version
      const first = source.geometries[0]
      if (!first || first.kind === 'mesh') throw new Error('Missing primitive')
      const broken = {
        ...repaint(source),
        geometries: [
          {
            ...first,
            from: [1e100, 0, 0] as [number, number, number],
            to: [2e100, 2, 2] as [number, number, number],
          },
          ...source.geometries.slice(1),
        ],
      }
      expect(() => resource.update(broken)).toThrow('precisão')
      expect(body.geometry).toBe(geometry)
      expect(texture.version).toBe(version)
      expect(resource.root.children).toHaveLength(2)
    } finally {
      resource.dispose()
    }
  })

  test('rectangular uploads share full-pending and per-row lifecycle with legacy atlases', () => {
    const resource = new RgbaTexture(new Uint8Array(4 * 8 * 4), 4, 8)
    expect(resource.texture.image.width).toBe(4)
    expect(resource.texture.image.height).toBe(8)
    resource.markRows({ x0: 1, x1: 2, y0: 5, y1: 6 })
    expect(resource.texture.updateRanges).toEqual([])
    resource.texture.onUpdate?.(resource.texture)
    resource.markRows({ x0: 1, x1: 2, y0: 5, y1: 6 })
    expect(resource.texture.updateRanges).toEqual([
      { start: 84, count: 8 },
      { start: 100, count: 8 },
    ])
    resource.markAll()
    resource.markRows({ x0: 0, x1: 3, y0: 0, y1: 7 })
    expect(resource.texture.updateRanges).toEqual([])
    resource.dispose()
    expect(() => new RgbaTexture(new Uint8Array(4), 2, 2)).toThrow('Dimensões')
  })
})
