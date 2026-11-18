import {
  BufferAttribute,
  type BufferGeometry,
  Color,
  DataTexture,
  LinearFilter,
  type Matrix4,
  MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
  Vector3,
} from 'three'
import type { MaterialDaAgua } from '../agua/material'
import { conferirGeometriaEstatica } from './geometria'
import { codificarPngCompilado } from './imagens'
import { rasterizarSuperficie } from './raster'

export interface FonteDeAguaCompilada {
  geometria: BufferGeometry
  matriz: Matrix4
  acabamento: MaterialDaAgua
  /** Quedas usam o UV métrico da faixa vertical, não uma projeção degenerada em XZ. */
  larguraDaQueda?: number
}

/** Cores/profundidade/espuma vêm do próprio material da água, no instante zero.
 * A ondulação dinâmica da normal permanece nos parâmetros do manifesto. */
export function rasterizarAguaCompilada(
  fonte: FonteDeAguaCompilada,
  opcoes: { pixelsPorMetro?: number; sinal?: AbortSignal } = {},
) {
  const g = fonte.geometria
  conferirGeometriaEstatica(g)
  const p = g.getAttribute('position'),
    uv = g.getAttribute('uv'),
    profundidade = g.getAttribute('mcnProfundidadeModelo'),
    n = p.count,
    quantidade = g.index?.count ?? n
  if (
    n > 65000 ||
    quantidade > 390000 ||
    g.drawRange.start !== 0 ||
    (g.drawRange.count !== Infinity && g.drawRange.count !== quantidade)
  )
    throw Error('Divida e materialize a superfície de água antes de assar seu acabamento.')
  if (
    fonte.larguraDaQueda !== undefined &&
    (!uv || !Number.isFinite(fonte.larguraDaQueda) || fonte.larguraDaQueda <= 0)
  )
    throw Error('A cachoeira precisa de UVs e largura válidos para o acabamento portátil.')
  const xs = new Float64Array(n),
    ys = new Float64Array(n),
    mundo = new Float64Array(n * 3),
    ponto = new Vector3(),
    amostra = new Float64Array(4),
    cor = new Color()
  for (let i = 0; i < n; i++) {
    ponto.fromBufferAttribute(p, i).applyMatrix4(fonte.matriz)
    if (![ponto.x, ponto.y, ponto.z].every(Number.isFinite))
      throw Error('Uma posição da água compilada é inválida.')
    mundo.set([ponto.x, ponto.y, ponto.z], i * 3)
    xs[i] = fonte.larguraDaQueda !== undefined ? uv.getX(i) * fonte.larguraDaQueda : ponto.x
    ys[i] = fonte.larguraDaQueda !== undefined ? uv.getY(i) * fonte.larguraDaQueda : ponto.z
  }
  if (fonte.larguraDaQueda === undefined) {
    const a = new Vector3(),
      b = new Vector3(),
      c = new Vector3(),
      normal = new Vector3()
    for (let i = 0; i < quantidade; i += 3) {
      const ids = [0, 1, 2].map((j) => g.index?.getX(i + j) ?? i + j)
      a.fromArray(mundo, ids[0]! * 3)
      b.fromArray(mundo, ids[1]! * 3)
      c.fromArray(mundo, ids[2]! * 3)
      normal.crossVectors(b.sub(a), c.sub(a))
      if (normal.lengthSq() > 1e-20 && Math.abs(normal.y) < normal.length() * 1e-7)
        throw Error(
          'A lâmina contém faces verticais. Confira os materiais do modelo ou use a faixa própria de cachoeira.',
        )
    }
  }
  return rasterizarSuperficie(
    { x: xs, y: ys, ...(g.index ? { indices: { quantidade, ler: (i) => g.index!.getX(i) } } : {}) },
    (contato, pixels) => {
      const { indices: ids, pesos, offset } = contato
      ponto.set(0, 0, 0)
      let uvY = 0,
        porVertice = 0
      for (let j = 0; j < 3; j++) {
        const id = ids[j]!,
          peso = pesos[j]!
        ponto.x += mundo[id * 3]! * peso
        ponto.y += mundo[id * 3 + 1]! * peso
        ponto.z += mundo[id * 3 + 2]! * peso
        uvY += (uv?.getY(id) ?? 0) * peso
        porVertice += (profundidade?.getX(id) ?? 0) * peso
      }
      fonte.acabamento.amostrarEstatico(ponto, uvY, profundidade ? porVertice : undefined, amostra)
      cor.setRGB(amostra[0]!, amostra[1]!, amostra[2]!).convertLinearToSRGB()
      pixels[offset] = Math.round(Math.max(0, Math.min(1, cor.r)) * 255)
      pixels[offset + 1] = Math.round(Math.max(0, Math.min(1, cor.g)) * 255)
      pixels[offset + 2] = Math.round(Math.max(0, Math.min(1, cor.b)) * 255)
      pixels[offset + 3] = Math.round(Math.max(0, Math.min(1, amostra[3]!)) * 255)
    },
    opcoes,
  )
}

export async function prepararAguaCompilada(
  fonte: FonteDeAguaCompilada,
  sinal: AbortSignal,
  pixelsPorMetro = 8,
) {
  const r = rasterizarAguaCompilada(fonte, { pixelsPorMetro, sinal }),
    png = await codificarPngCompilado(r, sinal),
    g = fonte.geometria.clone(),
    mapa = new DataTexture(r.pixels, r.largura, r.altura, RGBAFormat)
  let material: MeshStandardMaterial | undefined,
    descartado = false
  const descartar = () => {
    if (descartado) return
    descartado = true
    g.dispose()
    mapa.dispose()
    material?.dispose()
  }
  try {
    const uv = g.getAttribute('uv')
    if (uv) {
      if (g.hasAttribute('mcnAguaUv'))
        throw Error('O canal reservado de UV da água já existe na fonte.')
      g.setAttribute('mcnAguaUv', uv.clone())
    }
    g.setAttribute('uv', new BufferAttribute(r.uvs, 2))
    g.deleteAttribute('color')
    g.deleteAttribute('tangent')
    mapa.colorSpace = SRGBColorSpace
    mapa.minFilter = mapa.magFilter = LinearFilter
    mapa.generateMipmaps = false
    mapa.needsUpdate = true
    const original = fonte.acabamento.material
    material = new MeshStandardMaterial({
      map: mapa,
      transparent: true,
      depthWrite: false,
      roughness: original.roughness,
      metalness: original.metalness,
      side: original.side,
    })
    material.name = 'mcn_agua_estatica'
    sinal.throwIfAborted()
    return {
      geometria: g,
      material,
      pintura: { png, largura: r.largura, altura: r.altura },
      descartar,
    }
  } catch (erro) {
    descartar()
    throw erro
  }
}
