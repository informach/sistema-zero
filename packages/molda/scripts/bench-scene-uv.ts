import { createHash } from 'node:crypto'
import { Mesh } from 'three'
import type { MoldaSceneDocument } from '../src/scene/document'
import { buildSceneGeometry } from '../src/scene/geometry'
import { mapMeshUv } from '../src/scene/meshUv'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeModel } from '../src/testing/fixtures'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { SceneRenderResource } from '../src/viewport/sceneRenderResource'

/** CPU and derived buffer ownership only, not a WebGL/GPU or device benchmark. */
function stats(values: number[]) {
  values.sort((a, b) => a - b)
  const percentile = (p: number) => +values[Math.ceil(values.length * p) - 1]!.toFixed(3)
  return { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) }
}

const goldens: Record<string, string> = {
  '256/corner': '575eaefac1e18f9fff739cca0846b9c209e0424ee18ba8f2e15f0bb4bd6b0a98',
  '256/all': '03fec532b7342af42f11608930c77daaa7105d3b52ab280d29b1f0202d6590b2',
  '2304/corner': '865f567467581080d898fdc071e35b4523584fe26535316c5896ca3b2eb086bd',
  '2304/all': '4dd6faec3c541729350c1155bf5fdf5832ab74d33ec1397ca2e151792dfa81d3',
  '9216/corner': '8deaff31861ce779bebec15ee70f92c8dc2864e947e36088139322be38c6c672',
  '9216/all': 'd29a1668c17b917acd6aafb62ba3c4977d5f470e7e3cb22fed37343eabe5ebbc',
}
const profileUpdates = process.argv.includes('--profile-updates')
for (const size of profileUpdates ? [96] : [16, 48, 96]) {
  const base = migrateLegacyModel(makeModel()).document
  const node = base.nodes.find((n) => n.kind === 'mesh')!
  const mesh = makeSceneGridGeometry(size)
  const source: MoldaSceneDocument = {
    ...base,
    nodes: [{ ...node, kind: 'mesh', geometryId: mesh.id, materialId: base.materials[0]!.id }],
    geometries: [mesh],
    mirrors: [],
  }
  for (const scope of ['corner', 'all'] as const) {
    const changed = mapMeshUv(
      mesh,
      scope === 'corner' ? ['f_0_0'] : Object.keys(mesh.faces),
      (uv, _id, i) =>
        scope === 'corner' && i !== 0 ? uv : [uv[0] + 0.123456789, uv[1] - 0.234567891],
    )
    const document = { ...source, geometries: [changed] }
    if (readSceneDocument(document).status !== 'valid') throw new Error('Invalid benchmark')
    if (profileUpdates) {
      const resource = new SceneRenderResource()
      try {
        resource.update(source)
        for (let i = 0; i < 300; i++) resource.update(i % 2 ? source : document)
      } finally {
        resource.dispose()
      }
      continue
    }
    const oracle = buildSceneGeometry(changed)
    const cold: number[] = [],
      update: number[] = [],
      kernel: number[] = []
    let reused = false,
      retainedBytes = 0,
      newAttributeBytes = 0,
      golden = ''
    for (let sample = 0; sample < 23; sample++) {
      const resource = new SceneRenderResource()
      try {
        let start = performance.now()
        resource.update(source)
        const coldMs = performance.now() - start
        const object = resource.root.children[0]
        if (!(object instanceof Mesh)) throw new Error('Missing render mesh')
        const original = object.geometry
        const attributes = { ...original.attributes }
        start = performance.now()
        resource.update(document)
        const updateMs = performance.now() - start
        start = performance.now()
        buildSceneGeometry(changed)
        const kernelMs = performance.now() - start
        const hash = createHash('sha256')
        retainedBytes = 0
        newAttributeBytes = 0
        for (const [name, expected] of [
          ['position', oracle.positions],
          ['normal', oracle.normals],
          ['uv', oracle.uvs],
        ] as const) {
          const attribute = object.geometry.getAttribute(name)
          const actual = attribute.array
          if (
            !(actual instanceof Float32Array) ||
            actual.length !== expected.length ||
            !actual.every((value, i) => Object.is(value, expected[i]))
          )
            throw new Error(`Buffer mismatch: ${name}`)
          hash.update(new Uint8Array(actual.buffer, actual.byteOffset, actual.byteLength))
          retainedBytes += actual.byteLength
          if (attribute !== attributes[name]) newAttributeBytes += actual.byteLength
        }
        golden = hash.digest('hex')
        if (golden !== goldens[`${size * size}/${scope}`]) throw new Error('Golden hash mismatch')
        reused = object.geometry === original
        if (sample >= 3) {
          cold.push(coldMs)
          update.push(updateMs)
          kernel.push(kernelMs)
        }
      } finally {
        resource.dispose()
      }
    }
    console.info(
      JSON.stringify({
        faces: size * size,
        scope,
        samples: update.length,
        coldMs: stats(cold),
        updateMs: stats(update),
        rebuildKernelMs: stats(kernel),
        reused,
        retainedBytes,
        newAttributeBytes,
        golden,
      }),
    )
  }
}
