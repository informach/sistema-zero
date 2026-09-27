import type { BbmodelVersion } from '../import/bbmodelEnvelope'
import { BBMODEL_CUBE_DIRECTIONS } from '../import/bbmodelGeometryTypes'
import type { BbmodelImportRequest } from '../workers/bbmodelImportRequest'
import { bbmodelText } from './bbmodelImportFixture'

export const BBMODEL_ANIMATED_TARGET = '00000001-0000-0000-0000-000000000000'

export function bbmodelAnimatedSource(version: BbmodelVersion = '5.0') {
  const group = { uuid: BBMODEL_ANIMATED_TARGET, name: 'Corpo', origin: [3, 1, 0] }
  return {
    meta: { format_version: version, model_format: 'free' },
    ...(version === '5.0'
      ? { groups: [group], outliner: [{ uuid: group.uuid, children: ['cube'] }] }
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
        loop: 'loop',
        animators: {
          [BBMODEL_ANIMATED_TARGET]: {
            type: 'bone',
            keyframes: [
              { channel: 'position', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
              { channel: 'position', time: 1, data_points: [{ x: 5, y: 6, z: 3 }] },
              { channel: 'rotation', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
              { channel: 'rotation', time: 1, data_points: [{ x: 30, y: 90, z: 360 }] },
            ],
          },
        },
      },
    ],
  }
}

export function bbmodelAnimatedImportFixture(
  source: unknown = bbmodelAnimatedSource(),
): BbmodelImportRequest {
  return {
    documentId: 'moving',
    revision: 7,
    requestId: 2,
    identity: { id: 'moving', name: 'Minha criação', createdAt: 1, updatedAt: 2 },
    entryPath: 'model.bbmodel',
    bytes: bbmodelText(source),
    files: [],
    options: {
      sourcePreference: 'prefer-embedded',
      remainder: { animations: 'convert' },
      clips: { adaptation: 'continuous-sampled', fps: 16 },
      surfaces: { normals: 'molda-flat' },
      nodeMaterials: { untextured: 'uniform', color: [0.8, 0.3, 0.2, 1] },
      textureMaterials: { lighting: 'molda-standard' },
    },
  }
}
