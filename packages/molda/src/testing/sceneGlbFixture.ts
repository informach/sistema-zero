import type { SceneAnimationTrack } from '../scene/animation'
import type { MoldaSceneDocument } from '../scene/document'
import { animatedScene } from './sceneAnimation'
import { makeSceneGridGeometry } from './sceneFixtures'

/** Deterministic CPU/transport fixtures. Layer count grows authorial bytes, not exported image count. */
export function makeSceneGlbFixture(
  parts: number,
  grid: number,
  keys: number,
  textureSide: number,
  layers = 1,
): MoldaSceneDocument {
  const base = animatedScene(),
    node = base.nodes[0]!
  const tracks: SceneAnimationTrack[] = Array.from({ length: parts }, (_, i) => ({
    nodeId: `part-${i}`,
    channel: 'translation',
    keys: Array.from({ length: keys }, (_, k) => ({
      time: (k / (keys - 1)) * 2,
      value: [Math.sin(k), 0, Math.cos(k)],
      interpolation: 'linear',
    })),
  }))
  return {
    ...base,
    id: 'benchmark-glb',
    createdAt: 1,
    updatedAt: 1,
    nodes: Array.from({ length: parts }, (_, i) => ({
      ...node,
      id: `part-${i}`,
      kind: 'mesh',
      geometryId: 'surface',
      materialId: 'material',
    })),
    geometries: [makeSceneGridGeometry(grid)],
    materials: [
      {
        id: 'material',
        name: 'Material',
        baseColor: { kind: 'rgba', value: [0.2, 0.4, 0.8, 1] },
        roughness: 1,
        metalness: 0,
        doubleSided: false,
        ...(textureSide ? { colorImageId: 'paint' } : {}),
      },
    ],
    images: textureSide
      ? [
          {
            id: 'paint',
            name: 'Pintura',
            width: textureSide,
            height: textureSide,
            encoding: 'rgba',
            layers: Array.from({ length: layers }, (_, layer) => ({
              id: layer ? `layer-${layer}` : 'layer',
              name: 'Camada',
              visible: true,
              opacity: 1,
              pixels: Uint8Array.from({ length: textureSide * textureSide * 4 }, (_, i) =>
                i % 4 === 3 ? 255 : (i * 31 + layer * 17) % 256,
              ),
            })),
          },
        ]
      : [],
    mirrors: [],
    animations: [
      { id: 'clip', name: 'Mover', duration: 2, fps: 24, loop: true, space: 'local-delta', tracks },
    ],
  }
}
