/**
 * Pintar no clique: o lugar da tinta que a aba Pintar prepara sozinha.
 *
 * `ensureScenePaintSurface` é puro e devolve UMA revisão: quem chama faz um commit só, um passo
 * de desfazer. Nada muda de aparência: a imagem nova é indexada e o índice 0 mostra a cor base.
 *
 * As regras, na ordem em que valem:
 * 1. A peça precisa ser uma malha destravada, contando a trava herdada do grupo.
 * 2. O material alvo é o da face tocada; sem face, o da peça (ou o da primeira face, quando a
 *    peça não usa o material dela em face nenhuma).
 * 3. Já tem imagem de cor só desta peça: devolve o alvo sem mudar nada (a camada visível de cima).
 *    Sem face tocada, qualquer pintura que a peça já mostra serve, a do material dela primeiro.
 * 4. Material com relevo, brilho ou metal e sem cor: recusa antes de copiar qualquer coisa. Mudar
 *    a UV desalinharia esses mapas.
 * 5. Material ou imagem de outra peça: isola com `copySceneMaterialForNode`. Se a cópia já tem
 *    cor, pinta nela. ⚠️ Pintura existente nunca se move.
 * 6. Só quando o material não tem imagem nenhuma, distribui as faces DELE numa folha: forma e
 *    tubo em prateleiras (um bloco por superfície, no tamanho da pele do editor antigo, e a bola
 *    ou a superfície única com a folha inteira); malha por `autoMeshUv`. Face torta devolve
 *    `crooked` e só é dividida em triângulos com consentimento: nunca pinta sobreposto em silêncio.
 * 7. Cria a imagem indexada vazia e liga ao material.
 */
import { newId } from '../core/id'
import type { ShapeFaceId, Vec3 } from '../core/model'
import { faceUnits, skinDim } from '../model/shapes'
import { copySceneMaterialForNode, createSceneColorImage } from './appearanceCommands'
import { sceneAppearanceUsage } from './appearanceUsage'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import { editSceneMesh } from './commands'
import type {
  ModelSceneNode,
  MoldaSceneDocument,
  SceneGeometry,
  SceneImage,
  SceneMeshGeometry,
  ScenePathGeometry,
  ScenePrimitiveGeometry,
  SceneUvTransform,
} from './document'
import { packSceneShelves } from './imageAtlas'
import type { ScenePaintTarget } from './imagePaint'
import { SCENE_LIMITS } from './limits'
import { sceneMaterialImageIds } from './materialImages'
import { inspectMeshFaceFrame } from './meshFaceFrame'
import { editMeshFaces } from './meshFaces'
import { autoMeshUv } from './meshUvAuto'
import { cachedParametricMesh } from './parametricGeometry'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

export interface ScenePaintSurfaceRequest {
  nodeId: string
  /** A superfície da forma (`px`, `side`) ou a chave da face da malha, como o palco informa. */
  faceId?: string
  /** O consentimento para dividir as faces tortas em triângulos, na mesma revisão. */
  splitCrookedFaces?: boolean
}

export type ScenePaintSurface =
  | { status: 'ready'; document: MoldaSceneDocument; target: ScenePaintTarget; created: boolean }
  | { status: 'crooked'; faces: string[] }

type MeshNode = Extract<ModelSceneNode, { kind: 'mesh' }>
type Usage = ReturnType<typeof sceneAppearanceUsage>

function onlyThis(users: Iterable<string> | undefined, nodeId: string) {
  const list = users ? [...users] : []
  return list.length > 0 && list.every((id) => id === nodeId)
}

function topVisibleLayer(image: SceneImage) {
  for (let i = image.layers.length - 1; i >= 0; i--) {
    const layer = image.layers[i]!
    if (layer.visible && layer.opacity > 0) return layer
  }
  return null
}

function paintNode(document: MoldaSceneDocument, nodeId: string) {
  const usage = sceneAppearanceUsage(document)
  const node = usage.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça para pintar.')
  requireScene(
    !usage.flags.get(nodeId)?.locked,
    `nodes.${nodeId}`,
    'Destrave a peça para pintar nela.',
  )
  const geometry = usage.index.geometries.get(node.geometryId)
  if (!geometry) throw new Error('Geometria ausente no índice.')
  return { usage, node, geometry }
}

function surfaceIds(geometry: ScenePrimitiveGeometry | ScenePathGeometry): ShapeFaceId[] {
  return [...new Set(cachedParametricMesh(geometry).surfaceByFace.values())]
}

/** Cada face (malha) ou superfície (forma e tubo) com o material que ela mostra de fato. */
function bindings(node: MeshNode, geometry: SceneGeometry): Array<[string, string]> {
  return geometry.kind === 'mesh'
    ? Object.entries(geometry.faces).map(([key, face]) => [key, face.materialId ?? node.materialId])
    : surfaceIds(geometry).map((key) => [
        key,
        geometry.surfaces[key]?.materialId ?? node.materialId,
      ])
}

function targetMaterial(node: MeshNode, geometry: SceneGeometry, faceId?: string): string {
  const all = bindings(node, geometry)
  if (faceId !== undefined) {
    const found = all.find(([key]) => key === faceId)
    requireScene(found, 'face', 'Essa face mudou. Toque na peça de novo.')
    return found[1]
  }
  if (!all.length || all.some(([, id]) => id === node.materialId)) return node.materialId
  return all[0]![1]
}

function readyTarget(usage: Usage, nodeId: string, materialId: string): ScenePaintTarget | null {
  const imageId = usage.index.materials.get(materialId)?.colorImageId
  if (
    imageId === undefined ||
    !onlyThis(usage.materials.get(materialId), nodeId) ||
    !onlyThis(usage.images.get(imageId), nodeId)
  )
    return null
  const image = usage.index.images.get(imageId)
  const layer = image ? topVisibleLayer(image) : null
  return layer ? { nodeId, materialId, imageId, layerId: layer.id } : null
}

/**
 * Sem face tocada, qualquer pintura que a peça já mostra serve (a do material dela primeiro):
 * entrar na aba Pintar numa peça que já tem onde pintar não muda nada no documento.
 */
function shownReadyTarget(usage: Usage, node: MeshNode, geometry: SceneGeometry) {
  const shown = new Set(bindings(node, geometry).map(([, id]) => id))
  const order = shown.has(node.materialId) ? [node.materialId, ...shown] : [...shown]
  for (const id of new Set(order)) {
    const target = readyTarget(usage, node.id, id)
    if (target) return target
  }
  return null
}

/** Só leitura: o alvo, quando a peça já pode ser pintada sem mudar nada no documento. */
export function findScenePaintTarget(
  document: MoldaSceneDocument,
  request: Pick<ScenePaintSurfaceRequest, 'nodeId' | 'faceId'>,
): ScenePaintTarget | null {
  const usage = sceneAppearanceUsage(document)
  const node = usage.index.scene.nodes.get(request.nodeId)
  if (node?.kind !== 'mesh' || usage.flags.get(node.id)?.locked) return null
  const geometry = usage.index.geometries.get(node.geometryId)
  if (!geometry) return null
  if (request.faceId === undefined) return shownReadyTarget(usage, node, geometry)
  if (!bindings(node, geometry).some(([key]) => key === request.faceId)) return null
  return readyTarget(usage, node.id, targetMaterial(node, geometry, request.faceId))
}

/** Copy-on-write: outra peça que divide a geometria continua com a UV de antes. */
function replaceGeometry(
  document: MoldaSceneDocument,
  nodeId: string,
  next: SceneGeometry,
  nextId: () => string,
): MoldaSceneDocument {
  const shared = document.nodes.some(
    (node) => node.kind === 'mesh' && node.id !== nodeId && node.geometryId === next.id,
  )
  if (!shared)
    return finishSceneCommand({
      ...document,
      geometries: document.geometries.map((geometry) =>
        geometry.id === next.id ? next : geometry,
      ),
    })
  const copy = { ...next, id: allocateSceneId(document, nextId)() }
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === nodeId && node.kind === 'mesh' ? { ...node, geometryId: copy.id } : node,
    ),
    geometries: [...document.geometries, copy],
  })
}

function pathLength(path: ScenePathGeometry) {
  const points = path.points.map((point) => point.position)
  if (path.closed && points.length > 2) points.push(points[0]!)
  let length = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!
    length += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  }
  return length
}

/** Unidades de mundo que a superfície cobre, na ordem (u, v) da UV dela. */
function surfaceUnits(
  geometry: ScenePrimitiveGeometry | ScenePathGeometry,
  surface: ShapeFaceId,
): [number, number] {
  if (geometry.kind === 'path') {
    const across = 2 * geometry.radius
    return surface === 'side' ? [Math.PI * across, pathLength(geometry)] : [across, across]
  }
  const size: Vec3 = [
    Math.abs(geometry.to[0] - geometry.from[0]),
    Math.abs(geometry.to[1] - geometry.from[1]),
    Math.abs(geometry.to[2] - geometry.from[2]),
  ]
  const units = faceUnits(geometry.kind, size, surface)
  if (!units) throw new Error(`Superfície ${surface} fora da forma ${geometry.kind}.`)
  return units
}

function layOutShape(
  document: MoldaSceneDocument,
  node: MeshNode,
  geometry: ScenePrimitiveGeometry | ScenePathGeometry,
  materialId: string,
  nextId: () => string,
) {
  const tpu = document.settings.texelsPerUnit
  const keys = bindings(node, geometry)
    .filter(([, id]) => id === materialId)
    .map(([key]) => key as ShapeFaceId)
  requireScene(keys.length, 'material', 'Essa peça não mostra esse material em face nenhuma.')
  const sizes = keys.map((key) => {
    const [u, v] = surfaceUnits(geometry, key)
    return { width: skinDim(u, tpu), height: skinDim(v, tpu) }
  })
  let width: number
  let height: number
  let transforms: SceneUvTransform[]
  if (keys.length === 1) {
    // A bola, e toda superfície única, fica com a folha inteira: UV identidade, sem margem.
    ;({ width, height } = sizes[0]!)
    transforms = [{ origin: [0, 0], u: [1, 0], v: [0, 1] }]
  } else {
    const layout = packSceneShelves(sizes)
    requireScene(layout, 'images', 'A pintura desta peça não cabe numa folha só.')
    ;({ width, height } = layout)
    transforms = layout.slots.map((slot) => ({
      origin: [slot.x / width, slot.y / height],
      u: [slot.width / width, 0],
      v: [0, slot.height / height],
    }))
  }
  const surfaces = { ...geometry.surfaces }
  keys.forEach((key, i) => {
    const materialOf = geometry.surfaces[key]?.materialId
    surfaces[key] = {
      ...(materialOf === undefined ? {} : { materialId: materialOf }),
      uv: transforms[i]!,
    }
  })
  return {
    document: replaceGeometry(document, node.id, { ...geometry, surfaces }, nextId),
    width,
    height,
  }
}

function faceArea(mesh: SceneMeshGeometry, id: string) {
  const points = mesh.faces[id]!.corners.map(({ vertexId }) => mesh.vertices[vertexId]!)
  const result = triangulateFace(points)
  if (result.status !== 'ok') return 0
  let area = 0
  for (const [a, b, c] of result.triangles) {
    const p = points[a]!,
      q = points[b]!,
      r = points[c]!
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]],
      w = [r[0] - p[0], r[1] - p[1], r[2] - p[2]]
    area +=
      Math.hypot(
        u[1]! * w[2]! - u[2]! * w[1]!,
        u[2]! * w[0]! - u[0]! * w[2]!,
        u[0]! * w[1]! - u[1]! * w[0]!,
      ) / 2
  }
  return area
}

/**
 * O lado da folha quadrada da malha: a área das faces na densidade da criação, com folga para as
 * prateleiras, e pelo menos 6 pixels por face (2 de margem, para o balde não vazar para a vizinha).
 */
function meshSheetSide(mesh: SceneMeshGeometry, ids: readonly string[], texelsPerUnit: number) {
  let area = 0
  for (const id of ids) area += faceArea(mesh, id)
  const wanted = Math.max(
    16,
    Math.sqrt(area * texelsPerUnit * texelsPerUnit * 2),
    Math.ceil(Math.sqrt(ids.length)) * 6,
  )
  return Math.min(SCENE_LIMITS.imageSide, 2 ** Math.ceil(Math.log2(wanted)))
}

function layOutMesh(
  document: MoldaSceneDocument,
  node: MeshNode,
  mesh: SceneMeshGeometry,
  materialId: string,
  request: ScenePaintSurfaceRequest,
  nextId: () => string,
):
  | { status: 'crooked'; faces: string[] }
  | { status: 'laid'; document: MoldaSceneDocument; side: number } {
  const uses = (source: SceneMeshGeometry) =>
    Object.entries(source.faces)
      .filter(([, face]) => (face.materialId ?? node.materialId) === materialId)
      .map(([key]) => key)
  const shapes = new Map(uses(mesh).map((key) => [key, inspectMeshFaceFrame(mesh, key)]))
  requireScene(
    request.faceId === undefined || shapes.get(request.faceId) !== 'degenerate',
    'face',
    'Essa face não tem área para pintar.',
  )
  const crooked = [...shapes].filter(([, shape]) => shape === 'crooked').map(([key]) => key)
  if (crooked.length && !request.splitCrookedFaces) return { status: 'crooked', faces: crooked }
  let side = 0
  const next = editSceneMesh(
    document,
    node.id,
    (source) => {
      const working = crooked.length
        ? editMeshFaces(source, crooked, 'triangulate', nextId)
        : source
      // Face sem área não desenha e não recebe folha; a UV dela fica como estava.
      const ids = uses(working).filter((key) => inspectMeshFaceFrame(working, key) === 'ok')
      requireScene(ids.length, 'faces', 'Essa peça não tem faces com área para pintar.')
      side = meshSheetSide(working, ids, document.settings.texelsPerUnit)
      return autoMeshUv(working, ids, 2 / side)
    },
    nextId,
  )
  return { status: 'laid', document: next, side }
}

export function ensureScenePaintSurface(
  document: MoldaSceneDocument,
  request: ScenePaintSurfaceRequest,
  nextId: () => string = newId,
): ScenePaintSurface {
  let { usage, node, geometry } = paintNode(document, request.nodeId)
  let materialId = targetMaterial(node, geometry, request.faceId)
  const ready =
    request.faceId === undefined
      ? shownReadyTarget(usage, node, geometry)
      : readyTarget(usage, node.id, materialId)
  if (ready) return { status: 'ready', document, target: ready, created: false }
  let material = usage.index.materials.get(materialId)!
  const images = sceneMaterialImageIds(material)
  requireScene(
    material.colorImageId !== undefined || images.size === 0,
    'material.maps',
    'Esta peça tem relevo, brilho ou metal pintados. Pinte nela pelo caminho avançado.',
  )
  let next = document
  if (
    !onlyThis(usage.materials.get(materialId), node.id) ||
    [...images].some((id) => !onlyThis(usage.images.get(id), node.id))
  ) {
    next = copySceneMaterialForNode(next, node.id, materialId, nextId)
    materialId = next.materials.at(-1)!.id
    ;({ usage, node, geometry } = paintNode(next, node.id))
    const copied = readyTarget(usage, node.id, materialId)
    if (copied) return { status: 'ready', document: next, target: copied, created: true }
    material = usage.index.materials.get(materialId)!
  }
  requireScene(
    material.colorImageId === undefined,
    'layer',
    'Mostre uma camada desta pintura para pintar nela.',
  )
  let width: number
  let height: number
  if (geometry.kind === 'mesh') {
    const laid = layOutMesh(next, node, geometry, materialId, request, nextId)
    if (laid.status === 'crooked') return laid
    next = laid.document
    width = height = laid.side
  } else ({ document: next, width, height } = layOutShape(next, node, geometry, materialId, nextId))
  next = createSceneColorImage(
    next,
    materialId,
    { name: node.name, width, height, encoding: 'indexed' },
    nextId,
  )
  const image = next.images.at(-1)!
  return {
    status: 'ready',
    document: next,
    target: { nodeId: node.id, materialId, imageId: image.id, layerId: image.layers[0]!.id },
    created: true,
  }
}
