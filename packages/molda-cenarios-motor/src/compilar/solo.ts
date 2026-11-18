import type { CamadaDeSolo } from '@sistemazero/molda-cenarios-core/v2'
import {
  BufferAttribute,
  type BufferGeometry,
  DataTexture,
  LinearFilter,
  type Matrix4,
  MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
} from 'three'
import { conferirGeometriaEstatica } from './geometria'
import { codificarPngCompilado } from './imagens'
import { type PixelsDaTextura, rasterizarSoloCompilado } from './pintura'

/** Acabamento portátil por parte de setor; mantém geometria/altura e dono do palco intactos. */
export async function prepararSoloCompilado(
  fonte: { geometria: BufferGeometry; matriz: Matrix4; material: MeshStandardMaterial },
  camadas: readonly CamadaDeSolo[] | undefined,
  imagens: ReadonlyMap<string, PixelsDaTextura>,
  sinal: AbortSignal,
  pixelsPorMetro = 8,
) {
  sinal.throwIfAborted()
  conferirGeometriaEstatica(fonte.geometria)
  if (
    fonte.geometria.getAttribute('position').count > 65000 ||
    (fonte.geometria.index?.count ?? fonte.geometria.getAttribute('position').count) > 390000
  )
    throw Error('Divida o setor antes de preparar o acabamento do solo.')
  const geometria = fonte.geometria.clone()
  let material: MeshStandardMaterial | undefined,
    mapa: DataTexture | undefined,
    descartado = false
  const descartar = () => {
    if (descartado) return
    descartado = true
    geometria.dispose()
    material?.dispose()
    mapa?.dispose()
  }
  try {
    let pintura: { png: Uint8Array; largura: number; altura: number } | undefined
    if (camadas) {
      const r = rasterizarSoloCompilado(fonte.geometria, fonte.matriz, camadas, imagens, {
          pixelsPorMetro,
          sinal,
        }),
        png = await codificarPngCompilado(r, sinal)
      geometria.setAttribute('uv', new BufferAttribute(r.uvs, 2))
      geometria.deleteAttribute('color')
      geometria.deleteAttribute('mcnPesosA')
      geometria.deleteAttribute('mcnPesosB')
      mapa = new DataTexture(r.pixels, r.largura, r.altura, RGBAFormat)
      mapa.colorSpace = SRGBColorSpace
      mapa.minFilter = mapa.magFilter = LinearFilter
      mapa.generateMipmaps = false
      mapa.needsUpdate = true
      material = new MeshStandardMaterial({
        map: mapa,
        roughness: 1,
        metalness: 0,
        side: fonte.material.side,
      })
      pintura = { png, largura: r.largura, altura: r.altura }
    } else material = fonte.material.clone()
    sinal.throwIfAborted()
    return { geometria, material, pintura, descartar }
  } catch (erro) {
    descartar()
    throw erro
  }
}
