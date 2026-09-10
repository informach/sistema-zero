import { encodePng } from '../export/png'
import type { BbmodelVersion } from '../import/bbmodelEnvelope'
import { BBMODEL_CUBE_DIRECTIONS } from '../import/bbmodelGeometryTypes'
import { convertBbmodelDocument } from '../import/bbmodelNativeDocument'
import type { BbmodelImportRequest } from '../workers/bbmodelImportRequest'

export const bbmodelText = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))

/** Real format bytes exercising every report stage; source expressions/layer payloads stay inert. */
export function bbmodelImportFixture(version: BbmodelVersion = '5.0'): BbmodelImportRequest {
  const png = encodePng(
      Uint8Array.from({ length: 32 }, (_, i) => (i % 4 === 3 ? 255 : i * 7)),
      2,
      4,
    ),
    group = { uuid: 'root', name: 'Grupo', visibility: false, locked: true },
    source = {
      meta: { format_version: version, model_format: 'free' },
      resolution: { width: 2, height: 2 },
      editor_state: { script: 'do_not_execute()' },
      animations: [{ name: 'Pular', expression: 'variable.x; do_not_execute()' }],
      elements: [
        {
          uuid: 'cube',
          type: 'cube',
          name: '',
          from: [0, 0, 0],
          to: [2, 2, 2],
          box_uv: true,
          shade: false,
          export: false,
          faces: Object.fromEntries(
            BBMODEL_CUBE_DIRECTIONS.map((face) => [
              face,
              { uv: [0, 0, 2, 2], texture: face === 'north' ? null : false },
            ]),
          ),
        },
        {
          uuid: 'mesh',
          type: 'mesh',
          name: 'Asa',
          shading: 'smooth',
          render_order: 'in_front',
          seams: { a_b: 'join' },
          vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [2, 2, 0], d: [0, 2, 1], e: [1e-50, 0, 0] },
          faces: {
            quad: {
              vertices: ['a', 'b', 'c', 'd'],
              texture: 0,
              uv: { a: [-1e-308, 0], b: [2, 0], c: [2, 2], e: [0, 0] },
            },
            flat: { vertices: ['a', 'b', 'e'], texture: false, uv: {} },
            line: { vertices: ['e', 'd'], texture: null, uv: {} },
          },
        },
        { uuid: 'unused', type: 'plugin', payload: { script: 'never execute' } },
      ],
      textures: [
        {
          uuid: 'paint',
          name: '',
          width: 9,
          height: 9,
          source: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
          relative_path: 'paint.png',
          path: 'C:/untrusted/paint.png',
          render_sides: 'auto',
          wrap_mode: 'repeat',
          render_mode: 'emissive',
          group: 'pbr',
          pbr_channel: 'normal',
          layers: [{ data_url: 'unused' }],
          fps: 0.5,
          frame_order_type: 'custom',
          frame_order: '0 3 1',
        },
      ],
      texture_groups: [
        {
          uuid: 'pbr',
          name: 'Efeito',
          is_material: true,
          material_config: { expression: 'do_not_execute()' },
        },
      ],
      ...(version === '5.0'
        ? { groups: [group], outliner: [{ uuid: 'root', children: ['cube', 'mesh'] }] }
        : { outliner: [{ ...group, children: ['cube', 'mesh'] }] }),
    }
  return {
    documentId: 'bb-target',
    revision: 7,
    requestId: 2,
    identity: { id: 'bb-target', name: 'Minha criação', createdAt: 1, updatedAt: 2 },
    entryPath: 'model.bbmodel',
    bytes: bbmodelText(source),
    files: [{ path: version === '4.9' ? 'model.bbmodel/paint.png' : 'paint.png', bytes: png }],
    options: {
      sourcePreference: 'prefer-embedded',
      selection: { unlisted: 'omit', unsupportedNodes: 'omit-subtree' },
      geometry: { quads: 'source-triangles', unsupportedFaces: 'omit' },
      positions: { nonPositiveCubes: 'preserve' },
      uvs: { missingMeshUvs: 'zero' },
      surfaces: {
        normals: 'molda-flat',
        renderOrder: 'discard',
        seamLabels: 'discard',
        cubeShade: 'discard',
        outsideFrameUvs: 'clamp',
      },
      nodeMaterials: { untextured: 'uniform', color: [0.5, 0.25, 0.75, 1], doubleSided: true },
      textureMaterials: {
        lighting: 'molda-standard',
        autoSides: 'double',
        repeatWrap: 'clamp',
        renderModes: 'standard',
        pbrGroups: 'texture-only',
      },
      hierarchy: { groupFlags: 'inherit', exportFlags: 'discard' },
      images: { rgba16: 'round-to-rgba8' },
      remainder: { unmapped: 'discard', animations: 'omit' },
    },
  }
}
export function directBbmodelImport(input: BbmodelImportRequest) {
  const result = convertBbmodelDocument(
    {
      bytes: input.bytes,
      files: input.files,
      entryPath: input.entryPath,
    },
    input.identity,
    input.options,
  )
  if (result.status !== 'ready') throw new Error('Ready bbmodel fixture expected')
  return result
}
