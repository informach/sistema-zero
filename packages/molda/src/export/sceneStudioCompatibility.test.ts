import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type BufferGeometry, type Material, Mesh, SkinnedMesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MOLDA_LIMITS } from '../core/limits'
import { bytesToBase64 } from '../core/skinCodec'
import { readSceneDocument } from '../scene/readDocument'
import { createSceneSkin } from '../scene/skinCommands'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { encodeSceneGlb } from './sceneGlb'
import { inspectSceneStudioCompatibility, SCENE_STUDIO_LIMITS } from './sceneStudioCompatibility'

test('Studio budget mirrors stay tied to both current runtimes, without cross-package imports', () => {
  const root = resolve(import.meta.dir, '../../../..')
  const { bones: _bones, ...staticLimits } = SCENE_STUDIO_LIMITS
  for (const [file, limits] of [
    ['official-extensions/game-3d/runtimeModelAssets.ts', staticLimits],
    ['official-extensions/game-3d-advanced/runtime.ts', SCENE_STUDIO_LIMITS],
    ['core/project.ts', { data_url_chars: MOLDA_LIMITS.studioMax3DChars }],
  ] as const) {
    const source = readFileSync(resolve(root, 'packages/studio/src', file), 'utf8')
    for (const [key, maximum] of Object.entries(limits)) {
      const constant =
        key === 'data_url_chars'
          ? 'MAX_MODEL3D_DATA_URL_CHARS'
          : `MAX_MODEL_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`
      const match = source.match(new RegExp(`(?:var|const) ${constant} = ([\\d_]+);?`))
      expect(match !== null).toBe(true)
      expect(Number(match?.[1]?.replaceAll('_', ''))).toBe(maximum)
    }
  }
})

test('shared definitions and multiple materials are counted as actual GLTFLoader meshes at the 48/50 boundary', async () => {
  for (const parts of [24, 25]) {
    const source = makeSceneGlbFixture(parts, 2, 3, 0)
    source.materials.push({ ...source.materials[0]!, id: 'other', name: 'Outro' })
    const geometry = source.geometries[0]!
    if (geometry.kind !== 'mesh') throw new Error('Malha esperada')
    Object.values(geometry.faces)[0]!.materialId = 'other'
    expect(readSceneDocument(source).status).toBe('valid')
    const before = structuredClone(source)
    const result = encodeSceneGlb(source)
    const report = inspectSceneStudioCompatibility({
      stats: result.stats,
      byteLength: result.bytes.byteLength,
    })
    const gltf = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
    let loadedMeshes = 0
    const loadedMaterials = new Set<Material>(),
      geometries = new Set<BufferGeometry>()
    gltf.scene.traverse((node) => {
      if (!(node instanceof Mesh)) return
      loadedMeshes++
      geometries.add(node.geometry)
      for (const material of Array.isArray(node.material) ? node.material : [node.material])
        loadedMaterials.add(material)
    })
    expect(result.stats.meshes).toBe(1)
    expect(result.stats.renderedParts).toBe(parts)
    expect(loadedMeshes).toBe(parts * 2)
    expect(report.costs.meshes).toBe(loadedMeshes)
    expect(report.costs.materials).toBe(loadedMaterials.size)
    expect(report.animated).toBe(true)
    expect(report.fitsSingleCopy).toBe(parts === 24)
    expect(report.exceeded.map((row) => row.limit)).toEqual(parts === 24 ? [] : ['meshes'])
    expect(source).toEqual(before)
    for (const geometry of geometries) geometry.dispose()
    for (const material of loadedMaterials) material.dispose()
  }
})

test('byte ceiling includes the exact MIME prefix and base64 padding, without allocating encoded data in production', () => {
  const result = encodeSceneGlb(makeSceneGlbFixture(1, 1, 3, 0))
  const maximum = Math.floor((MOLDA_LIMITS.studioMax3DChars - 30) / 4) * 3
  for (const byteLength of [maximum - 3, maximum - 2, maximum - 1, maximum, maximum + 1]) {
    const actual = `data:model/gltf-binary;base64,${bytesToBase64(new Uint8Array(byteLength))}`
    const report = inspectSceneStudioCompatibility({ stats: result.stats, byteLength })
    expect(report.fitsSingleCopy).toBe(actual.length <= MOLDA_LIMITS.studioMax3DChars)
    expect(report.exceeded).toEqual(
      byteLength > maximum ? [{ limit: 'bytes', actual: byteLength, maximum }] : [],
    )
  }
})

test('skin mirrors and material splits keep actual GLTFLoader mesh counts at the Studio 48/50 boundary', async () => {
  for (const parts of [24, 25]) {
    const {
        document,
        input: { id, ...input },
      } = makeSceneSkinFixture(),
      geometry = makeSceneGridGeometry(2)
    document.geometries = [geometry]
    document.materials.push({ ...document.materials[0]!, id: 'other', name: 'Outro' })
    geometry.faces.f_0_0!.materialId = 'other'
    input.weights = Object.fromEntries(
      Object.keys(geometry.vertices).map((id) => [id, [{ jointId: 'upper', weight: 1 }]]),
    )
    document.mirrors = Array.from({ length: parts - 1 }, (_, i) => ({
      id: `mirror-${i}`,
      name: 'Espelho',
      sourceId: input.nodeId,
      axis: 'x',
      offset: 0,
    }))
    const source = createSceneSkin(document, input, () => id),
      before = structuredClone(source),
      result = encodeSceneGlb(source, { allowLosses: true }),
      report = inspectSceneStudioCompatibility({
        stats: result.stats,
        byteLength: result.bytes.byteLength,
      }),
      loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, ''),
      meshes: Mesh[] = []
    loaded.scene.traverse((object) => {
      if (object instanceof Mesh) meshes.push(object)
    })
    expect(meshes).toHaveLength(parts * 2)
    expect(result.stats.meshes).toBe(1)
    expect(result.stats.renderedParts).toBe(parts)
    expect(result.stats.bones).toBe(4)
    expect(report.costs.meshes).toBe(meshes.length)
    expect(report.fitsSingleCopy).toBe(parts === 24)
    expect(report.exceeded.map((row) => row.limit)).toEqual(parts === 24 ? [] : ['meshes'])
    expect(source).toEqual(before)
    const geometries = new Set(meshes.map((mesh) => mesh.geometry)),
      materials = new Set<Material>(),
      skeletons = new Set<SkinnedMesh['skeleton']>()
    for (const mesh of meshes) {
      if (mesh instanceof SkinnedMesh) skeletons.add(mesh.skeleton)
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        materials.add(material)
    }
    for (const geometry of geometries) geometry.dispose()
    for (const material of materials) material.dispose()
    for (const skeleton of skeletons) skeleton.dispose()
  }
})

test('reflected joint trees count once per real bone, not per skin or material, at the Studio 256/258 boundary', async () => {
  for (const joints of [128, 129]) {
    const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture()
    for (let i = 2; i < joints; i++) {
      const nodeId = `bone-${i}`
      input.jointIds.push(nodeId)
      document.nodes.push({
        ...document.nodes.find((node) => node.id === 'lower')!,
        id: nodeId,
        parentId: null,
      })
    }
    document.mirrors = [
      { id: 'mirror', name: 'Espelho', sourceId: input.nodeId, axis: 'x', offset: 0 },
    ]
    const source = createSceneSkin(document, input, () => id),
      result = encodeSceneGlb(source, { allowLosses: true }),
      report = inspectSceneStudioCompatibility({
        stats: result.stats,
        byteLength: result.bytes.byteLength,
      }),
      loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
    let bones = 0
    loaded.scene.traverse((object) => {
      if (object.type === 'Bone') bones++
    })
    expect(bones).toBe(joints * 2)
    expect(report.fitsSingleCopy).toBe(joints === 128)
    expect(report.exceeded.map((row) => row.limit)).toEqual(joints === 128 ? [] : ['bones'])
    const meshes: SkinnedMesh[] = []
    loaded.scene.traverse((object) => {
      if (object instanceof SkinnedMesh) meshes.push(object)
    })
    for (const skeleton of new Set(meshes.map((mesh) => mesh.skeleton))) skeleton.dispose()
    for (const geometry of new Set(meshes.map((mesh) => mesh.geometry))) geometry.dispose()
    const materials = new Set<Material>()
    for (const mesh of meshes)
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        materials.add(material)
    for (const material of materials) material.dispose()
  }
})

test('every exact complexity ceiling passes, each overflow is reported and unrelated portable export remains unchanged', () => {
  const result = encodeSceneGlb(makeSceneGlbFixture(1, 1, 3, 0))
  for (const limit of ['meshes', 'bones', 'triangles', 'materials', 'drawCalls'] as const) {
    const key = limit === 'meshes' ? 'drawCalls' : limit
    const maximum = SCENE_STUDIO_LIMITS[limit]
    for (const delta of [0, 1]) {
      const report = inspectSceneStudioCompatibility({
        stats: { ...result.stats, [key]: maximum + delta },
        byteLength: result.bytes.byteLength,
      })
      expect(report.exceeded.some((row) => row.limit === limit)).toBe(delta === 1)
    }
  }
  const empty = inspectSceneStudioCompatibility({
    stats: { ...result.stats, drawCalls: 0, clips: 0 },
    byteLength: result.bytes.byteLength,
  })
  expect(empty.fitsSingleCopy).toBe(false)
  expect(empty.empty).toBe(true)
  expect(empty.animated).toBe(false)
})
