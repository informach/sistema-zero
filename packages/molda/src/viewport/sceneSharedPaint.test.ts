import { expect, test } from 'bun:test'
import { DataTexture, Mesh, type MeshStandardMaterial } from 'three'
import { deleteSceneNodes } from '../scene/commands'
import { compositeSceneImage, sceneBaseColor, scenePalette } from '../scene/composite'
import type { MoldaSceneDocument, SceneMaterial } from '../scene/document'
import { bakeSceneImageAtlas } from '../scene/imageAtlas'
import { applySceneImageAtlas, prepareSceneImageAtlas } from '../scene/imageAtlasCommands'
import { paintSceneImage } from '../scene/imagePaint'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { SceneRenderResource } from './sceneRenderResource'

function converted() {
  const source = makeSceneAtlasDocument(),
    plan = prepareSceneImageAtlas(source, 'body')
  let id = 0
  return applySceneImageAtlas(
    source,
    plan,
    bakeSceneImageAtlas(plan.images, plan.tiles, plan.palette),
    () => `shared_${++id}`,
  )
}
function body(resource: SceneRenderResource) {
  const mesh = resource.root.children.find((object) => resource.instanceFor(object)?.id === 'body')
  if (!(mesh instanceof Mesh) || !Array.isArray(mesh.material)) throw new Error('Missing mesh')
  return mesh as Mesh<ReturnType<typeof mesh.geometry.clone>, MeshStandardMaterial[]>
}
function paints(resource: SceneRenderResource) {
  return body(resource).material.filter((m) => m.map instanceof DataTexture)
}

test('shared atlas has one texture, independent finishes and one partial upload; alpha/undo update every borrower', () => {
  const resource = new SceneRenderResource()
  try {
    const source = converted()
    resource.update(source)
    const materials = paints(resource)
    expect(materials).toHaveLength(2)
    expect(materials[0]).not.toBe(materials[1])
    const texture = materials[0]!.map as DataTexture
    expect(materials[1]!.map).toBe(texture)
    const image = source.images.at(-1)!
    expect(texture.image.data).toEqual(image.layers[0]!.pixels)
    expect(texture.image.data).not.toBe(image.layers[0]!.pixels)
    const geometry = body(resource).geometry
    const groups = structuredClone(geometry.groups)
    texture.onUpdate?.(texture)
    const version = texture.version
    const material = source.materials.at(-1)!
    const next = paintSceneImage(
      source,
      { nodeId: 'body', materialId: material.id, imageId: image.id, layerId: image.layers[0]!.id },
      { from: [0, 0], to: [0, 0], color: [0, 0, 0, 0], brush: 1 },
    )
    resource.update(next)
    expect(texture.version).toBe(version + 1)
    expect(texture.updateRanges).toEqual([{ start: 0, count: 4 }])
    expect(materials.every((m) => m.transparent && !m.depthWrite)).toBe(true)
    expect(body(resource).geometry).toBe(geometry)
    expect(geometry.groups).toEqual(groups)
    const changedFinish = {
      ...next,
      materials: next.materials.map((m) =>
        m.id === material.id
          ? { ...m, roughness: 0.123456789123, metalness: 0.6, doubleSided: true }
          : m,
      ),
    }
    const uploadVersion = texture.version
    resource.update(changedFinish)
    expect(texture.version).toBe(uploadVersion)
    expect(new Set(materials.map((m) => m.roughness)).size).toBe(2)
    expect(materials.every((m) => m.map === texture)).toBe(true)
    resource.update(source)
    expect(texture.image.data).toEqual(image.layers[0]!.pixels)
    expect(materials.every((m) => !m.transparent && m.depthWrite)).toBe(true)
  } finally {
    resource.dispose()
  }
})

test('exact bases and different image identities stay separate, join safely, follow palette and retain the texture until the last borrower leaves', () => {
  const source = converted()
  const first = source.materials.at(-2)!,
    second = source.materials.at(-1)!
  const resource = new SceneRenderResource()
  const base = [1 / 7, 0.123456789123, 0.4, 1] as [number, number, number, number]
  const patch = (
    document: MoldaSceneDocument,
    id: string,
    value: Partial<SceneMaterial>,
  ): MoldaSceneDocument => ({
    ...document,
    materials: document.materials.map((m) => (m.id === id ? { ...m, ...value } : m)),
  })
  try {
    let document = patch(source, first.id, { baseColor: { kind: 'rgba', value: base } })
    document = patch(document, second.id, {
      baseColor: { kind: 'rgba', value: [base[0] + Number.EPSILON, base[1], base[2], base[3]] },
    })
    resource.update(document)
    const drawn = paints(resource)
    expect(drawn[0]!.map).not.toBe(drawn[1]!.map)
    const beforeTextures = drawn.map((m) => m.map!)
    let retired = 0
    for (const texture of beforeTextures) texture.addEventListener('dispose', () => retired++)
    const joined = patch(document, second.id, { baseColor: { kind: 'rgba', value: base } })
    resource.update(joined)
    expect(drawn[0]!.map).toBe(drawn[1]!.map)
    expect(retired).toBe(1)
    const shared = drawn[0]!.map as DataTexture
    expect(beforeTextures.includes(shared)).toBe(true)
    // A new image ID remains independent even when its bytes are exactly equal.
    const image = source.images.at(-1)!
    const split = patch(
      { ...joined, images: [...joined.images, { ...image, id: 'different_image' }] },
      second.id,
      { colorImageId: 'different_image' },
    )
    resource.update(split)
    expect(drawn[0]!.map).not.toBe(drawn[1]!.map)
    expect(retired).toBe(1)
    resource.update(joined)
    expect(drawn[0]!.map).toBe(shared)
    expect(drawn[1]!.map).toBe(shared)
    const detached = patch(joined, first.id, { colorImageId: undefined })
    resource.update(detached)
    expect(retired).toBe(1)
    expect(drawn.filter((m) => m.map === shared)).toHaveLength(1)
    resource.update(deleteSceneNodes(detached, ['body']))
    expect(retired).toBe(2)
    resource.dispose()
    resource.dispose()
    expect(retired).toBe(2)
  } finally {
    resource.dispose()
  }
})

test('palette changes and image resizing refresh one shared owner; invalid image work leaves all visible resources unchanged', () => {
  const resource = new SceneRenderResource()
  try {
    let source = converted()
    const image = source.images.at(-1)!
    const indexed = {
      ...image,
      width: 2,
      height: 2,
      encoding: 'indexed' as const,
      layers: [{ ...image.layers[0]!, pixels: new Uint8Array([0, 1, 2, 3]) }],
    }
    source = {
      ...source,
      images: [...source.images.slice(0, -1), indexed],
      materials: source.materials.map((m) =>
        m.colorImageId === image.id
          ? { ...m, baseColor: { kind: 'palette' as const, index: 4 } }
          : m,
      ),
    }
    resource.update(source)
    const drawn = paints(resource)
    const old = drawn[0]!.map as DataTexture
    let disposed = 0
    old.addEventListener('dispose', () => disposed++)
    const changed: MoldaSceneDocument = { ...source, paletteId: 'pastel' }
    resource.update(changed)
    expect(drawn[0]!.map).toBe(drawn[1]!.map)
    const texture = drawn[0]!.map as DataTexture
    const palette = scenePalette(changed)
    expect(texture.image.data).toEqual(
      compositeSceneImage(indexed, palette, sceneBaseColor(changed.materials.at(-1)!, palette)),
    )
    const version = texture.version
    const broken = {
      ...changed,
      images: [
        ...changed.images.slice(0, -1),
        { ...indexed, layers: [{ ...indexed.layers[0]!, pixels: new Uint8Array(1) }] },
      ],
    }
    expect(() => resource.update(broken)).toThrow()
    expect(drawn[0]!.map).toBe(texture)
    expect(drawn[1]!.map).toBe(texture)
    expect(texture.version).toBe(version)
    let resizeDisposals = 0
    texture.addEventListener('dispose', () => resizeDisposals++)
    const larger = {
      ...indexed,
      width: 4,
      layers: [{ ...indexed.layers[0]!, pixels: new Uint8Array(8).fill(2) }],
    }
    resource.update({ ...changed, images: [...changed.images.slice(0, -1), larger] })
    expect(resizeDisposals).toBe(1)
    expect(drawn[0]!.map).toBe(drawn[1]!.map)
    expect(drawn[0]!.map).not.toBe(texture)
    expect(disposed).toBe(1)
  } finally {
    resource.dispose()
  }
})
