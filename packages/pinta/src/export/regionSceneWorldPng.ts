import {
  PINTA_IMAGE_WORLD_LIMITS,
  type PintaImageWorld,
} from '@sistemazero/core/studio/pinta-image'
import { readPngDataUrl } from '@sistemazero/core/studio/pinta-png-binary'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from '@sistemazero/core/studio/pinta-region-image-limits'
import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import { embedPintaRegionImage } from './regionImage'
import { readPintaRegionImageWorld } from './regionImageWorld'

/** The first sheet is the cover of this portable world. No full-map raster is needed. */
export async function encodeRegionSceneWorldPng(
  rootId: string,
  scenes: ReadonlyMap<string, PintaRegionSceneWire>,
) {
  if (scenes.size > PINTA_IMAGE_WORLD_LIMITS.maps)
    throw new Error('Este cenário tem mais de 16 lugares ligados.')
  const root = scenes.get(rootId)
  if (!root) throw new Error('O cenário inicial não veio no pacote.')
  const encode = (scene: PintaRegionSceneWire, world?: PintaImageWorld) => {
    const cover = readPngDataUrl(scene.tilesets[0]!.image, PINTA_REGION_IMAGE_PNG_LIMITS).bytes
    return embedPintaRegionImage(cover, JSON.stringify(scene), { world })
  }
  const maps: PintaImageWorld['maps'] = []
  let encodedChars = 0
  for (const [id, scene] of scenes) {
    if (scene.id !== id) throw new Error('Os nomes e identificadores dos cenários não conferem.')
    if (id === rootId) continue
    const { png } = await encode(scene)
    encodedChars += 'data:image/png;base64,'.length + Math.ceil(png.byteLength / 3) * 4
    if (encodedChars > PINTA_IMAGE_WORLD_LIMITS.encodedChars)
      throw new Error('As imagens dos lugares ligados excedem o tamanho do cenário.')
    let binary = ''
    for (let i = 0; i < png.length; i += 8192)
      binary += Reflect.apply(String.fromCharCode, null, png.subarray(i, i + 8192))
    maps.push({
      id,
      name: scene.name,
      png: `data:image/png;base64,${btoa(binary)}`,
    })
  }
  const { png } = await encode(root, { version: 1, rootId, maps })
  return { png, admitted: readPintaRegionImageWorld(png) }
}
