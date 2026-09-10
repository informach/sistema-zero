import { expect, test } from 'bun:test'
import { transformPoint } from '../scene/matrix'
import { readSceneDocument } from '../scene/readDocument'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { assessBbmodelAnimationBounds } from './bbmodelAnimationBounds'
import { convertBbmodelClips } from './bbmodelClips'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { convertBbmodelDocument } from './bbmodelNativeDocument'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelTransforms } from './bbmodelTransforms'

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s static document and converted clips share bounds that contain the native cube motion', (version) => {
  const target = '00000001-0000-0000-0000-000000000000',
    group = { uuid: target, name: 'Corpo', origin: [3, 1, 0], rotation: [10, 20, 30] },
    bytes = new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        ...(version === '5.0'
          ? { groups: [group], outliner: [{ uuid: target, children: ['cube'] }] }
          : { outliner: [{ ...group, children: ['cube'] }] }),
        elements: [
          {
            uuid: 'cube',
            name: 'Caixa',
            type: 'cube',
            origin: [3, 1, 0],
            from: [2, 0, -1],
            to: [4, 2, 1],
            faces: Object.fromEntries(
              BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: false }]),
            ),
          },
        ],
        animations: [
          {
            uuid: 'move',
            name: 'Rodar',
            length: 1,
            animators: {
              [target]: {
                type: 'bone',
                keyframes: [
                  { channel: 'position', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
                  { channel: 'position', time: 1, data_points: [{ x: 5, y: 6, z: 3 }] },
                  { channel: 'rotation', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
                  { channel: 'rotation', time: 1, data_points: [{ x: 30, y: 90, z: 720 }] },
                  { channel: 'scale', time: 0, data_points: [{ x: 1, y: 1, z: 1 }] },
                  { channel: 'scale', time: 1, data_points: [{ x: 2, y: 3, z: 0.5 }] },
                ],
              },
            },
          },
        ],
      }),
    ),
    staticResult = convertBbmodelDocument(
      { bytes, entryPath: 'model.bbmodel', files: [] },
      { id: 'bounds', name: 'Modelo', createdAt: 1, updatedAt: 1 },
      {
        sourcePreference: 'prefer-embedded',
        remainder: { animations: 'omit' },
        surfaces: { normals: 'molda-flat' },
        nodeMaterials: { untextured: 'uniform', color: [0.8, 0.3, 0.2, 1] },
        textureMaterials: { lighting: 'molda-standard' },
      },
    )
  if (staticResult.status !== 'ready') throw new Error('Missing fixture companions')
  const { document } = staticResult,
    envelope = readBbmodelEnvelope(bytes),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph),
    selection = planBbmodelSelection(envelope, graph),
    transforms = readBbmodelTransforms(graph, selection),
    nodeIds = new Map(
      selection.nodes.map(({ node }, index) => {
        const native = document.nodes[index]
        if (!native) throw new Error('Missing fixture native hierarchy node')
        return [node, native.id]
      }),
    ),
    converted = convertBbmodelClips(
      { envelope, graph, metadata, selection, transforms, nodeIds },
      { adaptation: 'continuous-sampled', fps: 16 },
    ),
    meshes = document.geometries.map((geometry) => {
      if (geometry.kind !== 'mesh') throw new Error('Expected converted native mesh')
      return geometry
    }),
    before = structuredClone({ document, converted, bytes }),
    report = assessBbmodelAnimationBounds(document.nodes, meshes, converted.animations)[0],
    read = readSceneDocument({ ...document, animations: converted.animations })
  if (!report || read.status !== 'valid') throw new Error('Invalid fixture animated document')
  const player = prepareSceneAnimation(read.document, 'bbmodel_clip_0')
  for (let frame = 0; frame <= 64; frame++) {
    const pose = player.sample(frame / 64)
    for (const node of read.document.nodes) {
      if (node.kind !== 'mesh') continue
      const geometry = meshes.find((item) => item.id === node.geometryId),
        matrix = pose.worldMatrices.get(node.id)
      if (!geometry || !matrix) throw new Error('Missing fixture mesh pose')
      for (const point of Object.values(geometry.vertices))
        expect(Math.hypot(...transformPoint(matrix, point))).toBeLessThanOrEqual(
          report.maximumPointBound,
        )
    }
  }
  expect({ document, converted, bytes }).toEqual(before)
})
