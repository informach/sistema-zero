import { addSceneShape } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'

/** A visible center with fully empty borders; the mesh and its UV stay rectangular. */
export function makeSceneCutoutPlane(atlasBorder = false) {
  const document = addSceneShape(
    createSceneProject({ kind: 'empty', name: 'Plano vazado' }),
    'plane',
    'Plano',
  )
  const pixels = new Uint8Array(8 * 8 * 4)
  if (atlasBorder) {
    for (let i = 0; i < pixels.length; i += 4) pixels.set([20, 55, 150, 255], i)
    for (let y = 2; y < 6; y++)
      for (let x = 2; x < 6; x++) pixels.fill(0, (y * 8 + x) * 4, (y * 8 + x) * 4 + 4)
    for (const geometry of document.geometries)
      if (geometry.kind === 'mesh')
        for (const face of Object.values(geometry.faces))
          for (const corner of face.corners)
            corner.uv = [0.25 + corner.uv[0] * 0.5, 0.25 + corner.uv[1] * 0.5]
  }
  for (let y = atlasBorder ? 3 : 2; y < (atlasBorder ? 5 : 6); y++)
    for (let x = atlasBorder ? 3 : 2; x < (atlasBorder ? 5 : 6); x++)
      pixels.set([150, 110, 90, 255], (y * 8 + x) * 4)
  document.images = [
    {
      id: 'cutout',
      name: 'Pintura',
      width: 8,
      height: 8,
      encoding: 'rgba',
      layers: [{ id: 'paint', name: 'Tinta', visible: true, opacity: 1, pixels }],
    },
  ]
  document.materials = document.materials.map((material) => ({
    ...material,
    colorImageId: 'cutout',
    baseColor: { kind: 'rgba', value: [0, 0, 0, 0] },
    alphaMask: { cutoff: 0.5, opacity: 1 },
  }))
  return document
}
