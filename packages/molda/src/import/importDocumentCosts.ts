import type { MoldaSceneDocument } from '../scene/document'
import { requireScene } from '../scene/validation'

export interface NativeImportCosts {
  nodes: number
  instances: number
  geometries: number
  vertices: number
  looseEdges: number
  storedTriangles: number
  /** Authorial triangles per instance, including faces the renderer may skip. */
  drawTriangles: number
  materials: number
  images: number
  /** Final authorial pixels only, NOT peak conversion memory or RSS. */
  pixelBytes: number
  skins: number
  weightedVertices: number
  clips: number
  tracks: number
  keys: number
}

/** Validated import domain: editable meshes and explicit instances, never parametric primitives/mirrors. */
export function importDocumentCosts(document: MoldaSceneDocument): NativeImportCosts {
  const clips = document.animations ?? [],
    skins = document.skins ?? [],
    triangles = new Map<string, number>(),
    costs: NativeImportCosts = {
      nodes: document.nodes.length,
      instances: 0,
      geometries: document.geometries.length,
      vertices: 0,
      looseEdges: 0,
      storedTriangles: 0,
      drawTriangles: 0,
      materials: document.materials.length,
      images: document.images.length,
      pixelBytes: 0,
      skins: skins.length,
      weightedVertices: 0,
      clips: clips.length,
      tracks: 0,
      keys: 0,
    }
  for (const geometry of document.geometries) {
    requireScene(
      geometry.kind === 'mesh',
      'native.geometries',
      'Uma forma importada precisa ser uma malha.',
    )
    costs.vertices += Object.keys(geometry.vertices).length
    costs.looseEdges += geometry.looseEdges.length
    let count = 0
    for (const face of Object.values(geometry.faces)) count += face.corners.length - 2
    costs.storedTriangles += count
    triangles.set(geometry.id, count)
  }
  requireScene(
    document.mirrors.length === 0,
    'native.mirrors',
    'Espelhos importados precisam ser instâncias explícitas.',
  )
  for (const node of document.nodes)
    if (node.kind === 'mesh') {
      costs.instances++
      costs.drawTriangles += triangles.get(node.geometryId)!
    }
  for (const image of document.images)
    for (const layer of image.layers) costs.pixelBytes += layer.pixels.byteLength
  for (const skin of skins) costs.weightedVertices += Object.keys(skin.weights).length
  for (const clip of clips) {
    costs.tracks += clip.tracks.length
    for (const track of clip.tracks) costs.keys += track.keys.length
  }
  return costs
}
