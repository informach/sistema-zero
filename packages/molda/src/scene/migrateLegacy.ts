/** Unidirectional in-memory migration of an already-readable v1 model. No writes or repairs. */
import { checkMoldaDocumentVersion, MoldaUnsupportedVersionError } from '../core/documentVersion'
import type { FaceId, MoldaModelAsset, MoldaPart, ShapeFaceId, Vec3 } from '../core/model'
import { faceLocalPolygon, meshFaceFrame } from '../model/meshFrame'
import { partFaces } from '../model/shapes'
import { partPivot } from '../model/transform'
import type { MoldaSceneDocument, SceneMaterial, SceneMeshFace, Vec2 } from './document'
import { quaternionFromEulerXYZ } from './matrix'
import { readSceneDocument } from './readDocument'
import { SceneValidationError } from './validation'

export interface LegacyMigrationIssue {
  code: 'degenerate-uv'
  nodeId: string
  faceId: string
}

export interface LegacyModelMigration {
  document: MoldaSceneDocument
  issues: LegacyMigrationIssue[]
}

function relative(point: Vec3, pivot: Vec3): Vec3 {
  return [point[0] - pivot[0], point[1] - pivot[1], point[2] - pivot[2]]
}

function material(id: string, part: MoldaPart, imageId?: string): SceneMaterial {
  return {
    id,
    name: part.name,
    baseColor: { kind: 'palette', index: part.color },
    ...(imageId ? { colorImageId: imageId } : {}),
    roughness: 1,
    metalness: 0,
    doubleSided: false,
  }
}

/** Deterministic IDs preserve all legacy part identities and do not consume new random IDs. */
export function migrateLegacyModel(model: MoldaModelAsset): LegacyModelMigration {
  const version = checkMoldaDocumentVersion(model)
  if (version.status === 'invalid') throw new TypeError('Versão de documento inválida.')
  if (version.status === 'unsupported' || version.version !== 1) {
    throw new MoldaUnsupportedVersionError(version.version)
  }
  const document: MoldaSceneDocument = {
    id: model.id,
    name: model.name,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    ...(model.thumb === undefined ? {} : { thumb: model.thumb }),
    kind: 'model',
    formatVersion: 2,
    paletteId: model.paletteId,
    ...(model.customPalette ? { customPalette: structuredClone(model.customPalette) } : {}),
    ...(model.extraColors ? { extraColors: [...model.extraColors] } : {}),
    settings: { texelsPerUnit: model.texelsPerUnit, snap: model.snap, mirrorX: model.mirrorX },
    nodes: [],
    geometries: [],
    materials: [],
    images: [],
    mirrors: [],
  }
  const issues: LegacyMigrationIssue[] = []
  const byId = new Map(model.parts.map((part) => [part.id, part]))
  if (byId.size !== model.parts.length)
    throw new TypeError('A criação tem identificadores repetidos.')
  for (const part of model.parts) {
    if (part.mirrorOf) {
      const source = byId.get(part.mirrorOf)
      if (!source || source.mirrorOf)
        throw new TypeError('O espelho não tem uma peça de origem válida.')
      document.mirrors.push({
        id: part.id,
        name: part.name,
        sourceId: source.id,
        axis: 'x',
        offset: 0,
      })
      continue
    }
    const pivot = partPivot(part)
    const geometryId = `geometry:${part.id}`
    const materialId = `material:${part.id}`
    document.materials.push(material(materialId, part))
    const faceMaterials = new Map<FaceId, string>()
    for (const face of partFaces(part)) {
      const skin = part.faces[face]
      if (!skin) continue
      const imageId = `image:${part.id}:${face}`
      const paintedMaterialId = `paint:${part.id}:${face}`
      document.images.push({
        id: imageId,
        name: `${part.name} ${face}`,
        width: skin.width,
        height: skin.height,
        encoding: 'indexed',
        layers: [
          {
            id: `layer:${part.id}:${face}`,
            name: 'Pintura',
            visible: true,
            opacity: 1,
            pixels: new Uint8Array(skin.data),
          },
        ],
      })
      document.materials.push(material(paintedMaterialId, part, imageId))
      faceMaterials.set(face, paintedMaterialId)
    }
    if (part.shape === 'mesh') {
      const mesh = part.mesh
      if (!mesh) throw new TypeError('A peça não contém sua malha.')
      const faces: Array<[string, SceneMeshFace]> = []
      for (const [faceId, face] of Object.entries(mesh.faces)) {
        const frame = meshFaceFrame(mesh, faceId as `f_${string}`)
        const points = face.v.map((id) => {
          const point = mesh.vertices[id]
          if (!point) throw new TypeError('A face aponta para um vértice ausente.')
          return point
        })
        const uvs = frame ? faceLocalPolygon(frame, points) : points.map((): Vec2 => [0, 0])
        if (!frame) issues.push({ code: 'degenerate-uv', nodeId: part.id, faceId })
        const paintedMaterialId = faceMaterials.get(faceId as FaceId)
        faces.push([
          faceId,
          {
            corners: face.v.map((vertexId, i) => ({ vertexId, uv: uvs[i] as Vec2 })),
            ...(paintedMaterialId ? { materialId: paintedMaterialId } : {}),
          },
        ])
      }
      document.geometries.push({
        id: geometryId,
        kind: 'mesh',
        vertices: Object.fromEntries(
          Object.entries(mesh.vertices).map(([id, point]) => [id, relative(point, pivot)]),
        ),
        faces: Object.fromEntries(faces),
        looseEdges: (mesh.looseEdges ?? []).map(([a, b]) => [a, b]),
      })
    } else {
      document.geometries.push({
        id: geometryId,
        kind: part.shape,
        from: relative(part.from, pivot),
        to: relative(part.to, pivot),
        surfaces: Object.fromEntries(
          (partFaces(part) as readonly ShapeFaceId[]).map((face) => {
            const paintedMaterialId = faceMaterials.get(face)
            return [
              face,
              {
                ...(paintedMaterialId ? { materialId: paintedMaterialId } : {}),
                uv: { origin: [0, 0], u: [1, 0], v: [0, 1] },
              },
            ]
          }),
        ),
      })
    }
    document.nodes.push({
      id: part.id,
      name: part.name,
      parentId: null,
      kind: 'mesh',
      geometryId,
      materialId,
      hidden: part.hidden === true,
      locked: part.locked === true,
      transform: {
        kind: 'trs',
        translation: pivot,
        rotation: quaternionFromEulerXYZ(part.rotation),
        scale: [1, 1, 1],
      },
    })
  }
  const read = readSceneDocument(document)
  if (read.status !== 'valid') {
    throw new SceneValidationError(
      read.status === 'invalid' ? read.path : 'formatVersion',
      read.status === 'invalid' ? read.message : 'Formato de migração incompatível.',
    )
  }
  return { document: read.document, issues }
}
