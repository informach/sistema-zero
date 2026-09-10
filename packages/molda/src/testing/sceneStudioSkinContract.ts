import { bytesToBase64 } from '../core/skinCodec'
import { encodeSceneGlb } from '../export/sceneGlb'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneInstances } from '../scene/evaluate'
import { buildSceneGeometry } from '../scene/geometry'
import { quaternionFromEulerXYZ, transformPoint } from '../scene/matrix'
import { readSceneDocument } from '../scene/readDocument'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { createSceneSkin } from '../scene/skinCommands'
import { deformSceneSkin, prepareSceneSkin } from '../scene/skinPose'
import { makeSceneSkinFixture } from './sceneSkin'

/** Pure native oracle + exported bytes. Studio consumes the recorded JSON, never Molda code. */
export function makeSceneStudioSkinContract() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    source = createSceneSkin(document, input, () => id)
  source.id = 'molda-studio-skin-contract'
  source.name = 'Personagem com pesos'
  source.nodes = source.nodes.map((node) =>
    node.id === 'upper' ? { ...node, hidden: true } : node,
  )
  source.mirrors = [
    { id: 'mirror-x', name: 'Espelho X', sourceId: input.nodeId, axis: 'x', offset: 2 },
    { id: 'mirror-z', name: 'Espelho Z', sourceId: input.nodeId, axis: 'z', offset: -1 },
  ]
  source.animations = [
    {
      id: 'wave',
      name: 'Acenar',
      duration: 1,
      fps: 30,
      loop: false,
      space: 'local-delta',
      tracks: [
        {
          nodeId: 'upper',
          channel: 'translation',
          keys: [
            { time: 0, value: [0, 0, 0], interpolation: 'smooth' },
            { time: 1, value: [1, 0.5, -0.25], interpolation: 'linear' },
          ],
        },
        {
          nodeId: 'lower',
          channel: 'rotation',
          keys: [
            { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
            { time: 1, value: quaternionFromEulerXYZ([50, 20, -35]), interpolation: 'linear' },
          ],
        },
      ],
    },
    {
      id: 'stretch',
      name: 'Esticar',
      duration: 1,
      fps: 24,
      loop: true,
      space: 'local',
      tracks: [
        {
          nodeId: 'upper',
          channel: 'translation',
          keys: [
            { time: 0, value: [0, 1, 0], interpolation: 'linear' },
            { time: 1, value: [-1, 2, 1], interpolation: 'linear' },
          ],
        },
        {
          nodeId: 'lower',
          channel: 'scale',
          keys: [
            { time: 0, value: [1, 1, 1], interpolation: 'linear' },
            { time: 1, value: [0, 1.5, 1], interpolation: 'linear' },
          ],
        },
      ],
    },
  ]
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error('Fixture nativa de pesos inválida')
  const asset = read.document,
    index = indexSceneDocument(asset),
    skin = prepareSceneSkin(asset, asset.skins![0]!),
    geometry = asset.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Malha esperada')
  const built = buildSceneGeometry(geometry),
    vertexIndices = new Map(skin.vertexIds.map((id, i) => [id, i])),
    corners = built.cornerIndices.map(
      (corner, i) =>
        vertexIndices.get(
          geometry.faces[built.faceIds[Math.floor(i / 3)]!]!.corners[corner]!.vertexId,
        )!,
    ),
    result = encodeSceneGlb(asset, { allowLosses: true })
  const pose = (worldMatrices = index.scene.worldMatrices) => {
    const deformed = deformSceneSkin(skin, worldMatrices)
    return evaluateSceneInstances(index, worldMatrices).map(({ id, worldMatrix }) => ({
      id,
      matrix: [...worldMatrix],
      points: Array.from(corners, (vertex) =>
        transformPoint(worldMatrix, [
          deformed[vertex * 3]!,
          deformed[vertex * 3 + 1]!,
          deformed[vertex * 3 + 2]!,
        ]),
      ),
    }))
  }
  return {
    producer: 'Molda native skin GLB, evolution lot 117',
    dataUrl: `data:model/gltf-binary;base64,${bytesToBase64(result.bytes)}`,
    stats: result.stats,
    rest: pose(),
    clips: asset.animations!.map((clip) => ({
      name: clip.name,
      duration: clip.duration,
      end: pose(prepareSceneAnimation(asset, clip.id).sample(clip.duration, false).worldMatrices),
    })),
  }
}
