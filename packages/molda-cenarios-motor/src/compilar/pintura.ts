import { type CamadaDeSolo, CamadaDeSoloSchema } from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, Color, type Matrix4, SRGBColorSpace, Vector3 } from 'three'
import { rasterizarSuperficie } from './raster'

export interface PixelsDaTextura {
  largura: number
  altura: number
  pixels: Uint8Array | Uint8ClampedArray
  /** Imagens de canvas vêm de cima para baixo; corresponde ao Texture.flipY do palco. */
  flipY: boolean
}
const linear = Float64Array.from(
  { length: 256 },
  (_, i) => new Color().setRGB(i / 255, 0, 0, SRGBColorSpace).r,
)
const repetir = (i: number, n: number) => ((i % n) + n) % n

function amostrar(t: PixelsDaTextura, u: number, v: number, saida: Float64Array) {
  const x = (u - Math.floor(u)) * t.largura - 0.5,
    y = ((t.flipY ? 1 - v : v) - Math.floor(t.flipY ? 1 - v : v)) * t.altura - 0.5,
    ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy
  saida.fill(0)
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) {
      const peso = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy),
        p = (repetir(iy + dy, t.altura) * t.largura + repetir(ix + dx, t.largura)) * 4
      for (let c = 0; c < 3; c++) saida[c] = saida[c]! + peso * linear[t.pixels[p + c]!]!
    }
}

/** Assa a mesma mistura linear de camadas do MaterialDoSolo, por triângulo real.
 * Pesos, repetição em metros e amostras de imagem são preservados; não usa cor média.
 * Sem renderer/DOM. O chamador fornece pixels já decodificados pelo pipeline existente. */
export function rasterizarSoloCompilado(
  g: BufferGeometry,
  mundo: Matrix4,
  camadas: readonly CamadaDeSolo[],
  fontes: ReadonlyMap<string, PixelsDaTextura>,
  opcoes: { pixelsPorMetro?: number; sinal?: AbortSignal } = {},
) {
  const { sinal } = opcoes,
    ppm = opcoes.pixelsPorMetro ?? 8
  sinal?.throwIfAborted()
  if (!Number.isFinite(ppm) || ppm < 1 || ppm > 64 || camadas.length < 1 || camadas.length > 8)
    throw Error('As camadas ou a resolução da pintura compilada são inválidas.')
  const preparadas = camadas.map((entrada) => {
    const c = CamadaDeSoloSchema.parse(entrada)
    const cor = new Color(c.cor),
      textura = c.textura ? fontes.get(c.textura.id) : undefined
    if (c.textura && !textura)
      throw Error(`A textura “${c.textura.id}” precisa ser carregada antes de assar o solo.`)
    if (
      textura &&
      (!Number.isInteger(textura.largura) ||
        !Number.isInteger(textura.altura) ||
        textura.largura < 1 ||
        textura.altura < 1 ||
        textura.largura > 4096 ||
        textura.altura > 4096 ||
        textura.largura * textura.altura > 8388608 ||
        textura.pixels.length !== textura.largura * textura.altura * 4)
    )
      throw Error('Os pixels de uma textura do solo são inválidos.')
    return { cor, textura, metros: c.textura?.repeticaoMetros ?? 2 }
  })
  const pos = g.getAttribute('position'),
    a = g.getAttribute('mcnPesosA'),
    b = g.getAttribute('mcnPesosB'),
    n = pos?.count ?? 0,
    indices = g.index,
    quantidade = indices?.count ?? n
  if (
    !n ||
    n > 65_000 ||
    pos.itemSize !== 3 ||
    !a ||
    a.itemSize !== 4 ||
    a.count !== n ||
    (camadas.length > 4 && (b?.itemSize !== 4 || b.count !== n)) ||
    quantidade > 390_000 ||
    quantidade % 3 ||
    g.drawRange.start !== 0 ||
    (g.drawRange.count !== Infinity && g.drawRange.count !== quantidade) ||
    !mundo.elements.every(Number.isFinite)
  )
    throw Error('Prepare a geometria e os pesos do solo antes de assar a pintura.')
  const xs = new Float64Array(n),
    zs = new Float64Array(n),
    pesos = new Float64Array(n * camadas.length),
    p = new Vector3()
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(mundo)
    if (![p.x, p.y, p.z].every(Number.isFinite)) throw Error('Uma posição da pintura é inválida.')
    xs[i] = p.x
    zs[i] = p.z
    let soma = 0
    for (let c = 0; c < camadas.length; c++) {
      const peso = (c < 4 ? a : b!).getComponent(i, c % 4)
      if (!Number.isFinite(peso) || peso < 0 || peso > 1)
        throw Error('Os pesos do solo são inválidos.')
      pesos[i * camadas.length + c] = peso
      soma += peso
    }
    if (Math.abs(soma - 1) > 1e-5)
      throw Error('Os pesos do solo precisam somar um em cada vértice.')
  }
  const amostra = new Float64Array(3),
    cor = new Color()
  return rasterizarSuperficie(
    {
      x: xs,
      y: zs,
      ...(indices
        ? { indices: { quantidade: indices.count, ler: (i: number) => indices.getX(i) } }
        : {}),
    },
    (contato, pixels) => {
      const { indices: ids, pesos: bar, x: wx, y: wz, offset } = contato
      let r = 0,
        verde = 0,
        azul = 0
      for (let c = 0; c < camadas.length; c++) {
        const peso =
          bar[0]! * pesos[ids[0]! * camadas.length + c]! +
          bar[1]! * pesos[ids[1]! * camadas.length + c]! +
          bar[2]! * pesos[ids[2]! * camadas.length + c]!
        if (peso <= 0) continue
        const camada = preparadas[c]!
        if (camada.textura)
          amostrar(camada.textura, wx / camada.metros, wz / camada.metros, amostra)
        else amostra.fill(1)
        r += peso * camada.cor.r * amostra[0]!
        verde += peso * camada.cor.g * amostra[1]!
        azul += peso * camada.cor.b * amostra[2]!
      }
      cor.setRGB(r, verde, azul).convertLinearToSRGB()
      pixels[offset] = Math.round(Math.max(0, Math.min(1, cor.r)) * 255)
      pixels[offset + 1] = Math.round(Math.max(0, Math.min(1, cor.g)) * 255)
      pixels[offset + 2] = Math.round(Math.max(0, Math.min(1, cor.b)) * 255)
      pixels[offset + 3] = 255
    },
    { pixelsPorMetro: ppm, sinal },
  )
}
