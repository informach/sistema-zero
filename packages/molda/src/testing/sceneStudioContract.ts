import { bytesToBase64 } from '../core/skinCodec'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneInstances } from '../scene/evaluate'
import { readSceneDocument } from '../scene/readDocument'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { makeSceneGlbFixture } from './sceneGlbFixture'

/** Portable contract data for Studio. No Studio imports or renderer-based pose oracle. */
export function makeSceneStudioContract() {
  const source: MoldaSceneDocument = makeSceneGlbFixture(1, 1, 3, 0)
  source.id = 'molda-studio-contract'
  source.name = 'Personagem articulado'
  const part = source.nodes[0]!
  part.name = 'Braço'
  part.parentId = 'joint'
  part.transform = { kind: 'trs', translation: [1, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
  source.nodes.push(
    {
      id: 'base',
      name: 'Base inclinada',
      kind: 'group',
      parentId: null,
      hidden: false,
      locked: false,
      transform: {
        kind: 'affine',
        matrix: [1, 0, 0, 0, 0.25, 1.5, 0, 0, 0, 0.125, 1, 0, 2, 0, 0, 1],
      },
    },
    {
      id: 'joint',
      name: 'Articulação',
      kind: 'group',
      parentId: 'base',
      hidden: false,
      locked: false,
      transform: { kind: 'trs', translation: [0, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    },
  )
  source.mirrors = [{ id: 'mirror', name: 'Outro braço', sourceId: part.id, axis: 'x', offset: 0 }]
  source.animations = [
    {
      id: 'jump',
      name: 'Saltar',
      duration: 1,
      fps: 24,
      loop: false,
      space: 'local-delta',
      tracks: [
        {
          nodeId: 'joint',
          channel: 'translation',
          keys: [
            { time: 0, value: [0, 0, 0], interpolation: 'linear' },
            { time: 1, value: [0, 2, 0], interpolation: 'linear' },
          ],
        },
        {
          nodeId: part.id,
          channel: 'rotation',
          keys: [
            { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
            { time: 1, value: [0, 0, Math.SQRT1_2, Math.SQRT1_2], interpolation: 'linear' },
          ],
        },
      ],
    },
    {
      id: 'pose',
      name: 'Posar',
      duration: 1,
      fps: 30,
      loop: true,
      space: 'local',
      tracks: [
        {
          nodeId: 'joint',
          channel: 'translation',
          keys: [
            { time: 0, value: [0, 1, 0], interpolation: 'linear' },
            { time: 1, value: [1, 3, 0], interpolation: 'linear' },
          ],
        },
        {
          nodeId: part.id,
          channel: 'scale',
          keys: [
            { time: 0, value: [1, 1, 1], interpolation: 'linear' },
            { time: 1, value: [2, 0.5, 1], interpolation: 'linear' },
          ],
        },
      ],
    },
  ]
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error('Fixture nativa inválida')
  const index = indexSceneDocument(read.document)
  const result = encodeSceneGlb(read.document)
  const describePose = (matrices = index.scene.worldMatrices) =>
    evaluateSceneInstances(index, matrices).map(({ id, worldMatrix }) => ({
      id,
      matrix: [...worldMatrix],
    }))
  return {
    producer: 'Molda native GLB, evolution lot 101',
    dataUrl: `data:model/gltf-binary;base64,${bytesToBase64(result.bytes)}`,
    stats: result.stats,
    rest: describePose(),
    clips: source.animations.map((clip) => ({
      name: clip.name,
      duration: clip.duration,
      end: describePose(
        prepareSceneAnimation(read.document, clip.id).sample(clip.duration, false).worldMatrices,
      ),
    })),
  }
}
