/**
 * Escritor GLB (glTF 2.0 binário) próprio e puro. Uma malha, um material com
 * a textura do atlas (`baseColorTexture`, fator branco: o runtime do Estúdio
 * pode tingir `material.color`), sampler NEAREST sem repetição (nada de mipmap
 * nem vazamento entre regiões). Container: header `glTF`/2/tamanho, chunk JSON
 * (padded com espaço até múltiplo de 4), chunk BIN (padded com zero).
 */
import type { BuiltMesh } from '../model/build'
import { encodeGlbContainer, glbAlignedLength } from './glbContainer'

const FLOAT = 5126
const UNSIGNED_SHORT = 5123
const UNSIGNED_INT = 5125
const ARRAY_BUFFER = 34962
const ELEMENT_ARRAY_BUFFER = 34963
const NEAREST = 9728
const CLAMP_TO_EDGE = 33071

export interface GlbInput {
  name: string
  mesh: BuiltMesh
  imagePng: Uint8Array
}

export function encodeGlb(input: GlbInput): Uint8Array {
  const { mesh, imagePng } = input
  const positions = new Uint8Array(
    mesh.positions.buffer,
    mesh.positions.byteOffset,
    mesh.positions.byteLength,
  )
  const normals = new Uint8Array(
    mesh.normals.buffer,
    mesh.normals.byteOffset,
    mesh.normals.byteLength,
  )
  const uvs = new Uint8Array(mesh.uvs.buffer, mesh.uvs.byteOffset, mesh.uvs.byteLength)
  const indices = new Uint8Array(
    mesh.indices.buffer,
    mesh.indices.byteOffset,
    mesh.indices.byteLength,
  )

  const segments = [positions, normals, uvs, indices, imagePng]
  const views: Array<{ byteOffset: number; byteLength: number; target?: number }> = []
  let binLength = 0
  segments.forEach((segment, index) => {
    const target = index < 3 ? ARRAY_BUFFER : index === 3 ? ELEMENT_ARRAY_BUFFER : undefined
    views.push({ byteOffset: binLength, byteLength: segment.length, ...(target ? { target } : {}) })
    binLength += glbAlignedLength(segment.length)
  })

  const json = {
    asset: { version: '2.0', generator: 'Molda' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: input.name }],
    meshes: [
      {
        name: input.name,
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      {
        name: `${input.name}-material`,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [
      { magFilter: NEAREST, minFilter: NEAREST, wrapS: CLAMP_TO_EDGE, wrapT: CLAMP_TO_EDGE },
    ],
    images: [{ bufferView: 4, mimeType: 'image/png' }],
    accessors: [
      {
        bufferView: 0,
        componentType: FLOAT,
        count: mesh.vertexCount,
        type: 'VEC3',
        min: [...mesh.min],
        max: [...mesh.max],
      },
      { bufferView: 1, componentType: FLOAT, count: mesh.vertexCount, type: 'VEC3' },
      { bufferView: 2, componentType: FLOAT, count: mesh.vertexCount, type: 'VEC2' },
      {
        bufferView: 3,
        componentType: mesh.indices instanceof Uint16Array ? UNSIGNED_SHORT : UNSIGNED_INT,
        count: mesh.indices.length,
        type: 'SCALAR',
      },
    ],
    bufferViews: views.map((view) => ({ buffer: 0, ...view })),
    buffers: [{ byteLength: binLength }],
  }

  return encodeGlbContainer(json, segments)
}
