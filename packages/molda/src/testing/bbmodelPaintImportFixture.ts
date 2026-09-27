import { encodePng } from '../export/png'
import type { BbmodelVersion } from '../import/bbmodelEnvelope'
import type { BbmodelImportRequest } from '../workers/bbmodelImportRequest'
import { bbmodelText } from './bbmodelImportFixture'

export const bbmodelPaintUri = (bytes: Uint8Array) =>
  `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
export function bbmodelPaintSource(version: BbmodelVersion = '5.0') {
  const base = Uint8Array.of(255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 41, 42, 43, 0),
    overlay = Uint8Array.of(0, 0, 255, 128, 255, 0, 0, 255, 255, 255, 255, 255, 99, 77, 55, 0)
  return {
    meta: { format_version: version, model_format: 'free' },
    resolution: { width: 2, height: 2 },
    elements: [
      {
        uuid: 'piece',
        type: 'mesh',
        name: 'Pintura',
        vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [0, 2, 0] },
        faces: {
          face: { vertices: ['a', 'b', 'c'], texture: 0, uv: { a: [0, 0], b: [2, 0], c: [0, 2] } },
        },
      },
    ],
    outliner: ['piece'],
    textures: [
      {
        uuid: 'paint',
        name: 'Minha pintura',
        render_sides: 'front',
        layers_enabled: true,
        // Deliberately different from the editable composition. Never substitute these pixels.
        source: bbmodelPaintUri(encodePng(new Uint8Array(16).fill(255), 2, 2)),
        layers: [
          { name: 'Base', data_url: bbmodelPaintUri(encodePng(base, 2, 2)), width: 2, height: 2 },
          {
            name: 'Detalhes',
            opacity: 50,
            data_url: bbmodelPaintUri(encodePng(overlay, 2, 2)),
            width: 99,
            height: 0,
          },
          {
            name: 'Escondida',
            visible: false,
            opacity: 0,
            data_url: bbmodelPaintUri(encodePng(base, 2, 2)),
          },
        ],
      },
    ],
  }
}
export function bbmodelPaintImportFixture(
  source: unknown = bbmodelPaintSource(),
): BbmodelImportRequest {
  return {
    documentId: 'paint-target',
    revision: 7,
    requestId: 2,
    identity: { id: 'paint-target', name: 'Minha criação', createdAt: 1, updatedAt: 2 },
    entryPath: 'paint.bbmodel',
    bytes: bbmodelText(source),
    files: [],
    options: {
      sourcePreference: 'prefer-embedded',
      surfaces: { normals: 'molda-flat' },
      nodeMaterials: { untextured: 'uniform' },
      textureMaterials: { lighting: 'molda-standard' },
      images: { layers: 'molda-layers' },
    },
  }
}
