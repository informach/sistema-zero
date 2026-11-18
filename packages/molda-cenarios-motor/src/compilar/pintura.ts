import { type CamadaDeSolo, CamadaDeSoloSchema } from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, Color, type Matrix4, SRGBColorSpace, Vector3 } from 'three'

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
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(mundo)
    if (![p.x, p.y, p.z].every(Number.isFinite)) throw Error('Uma posição da pintura é inválida.')
    xs[i] = p.x
    zs[i] = p.z
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
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
  const dx = maxX - minX,
    dz = maxZ - minZ,
    largura = Math.max(2, Math.ceil(dx * ppm)),
    altura = Math.max(2, Math.ceil(dz * ppm))
  if (!(dx > 0 && dz > 0) || largura > 2048 || altura > 2048 || largura * altura > 4194304)
    throw Error(
      'A resolução da pintura excede o limite de pixels por parte. Divida o terreno em setores.',
    )
  const uvs = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    uvs[i * 2] = (xs[i]! - minX) / dx
    uvs[i * 2 + 1] = (zs[i]! - minZ) / dz
  }
  const indice = (i: number) => (indices ? indices.getX(i) : i)
  const limites = (i: number) => {
    const ids = [indice(i), indice(i + 1), indice(i + 2)]
    if (ids.some((v) => !Number.isSafeInteger(v) || v < 0 || v >= n))
      throw Error('Um índice da pintura é inválido.')
    const vx = ids.map((id) => ((xs[id]! - minX) / dx) * largura),
      vz = ids.map((id) => ((zs[id]! - minZ) / dz) * altura),
      area = (vx[1]! - vx[0]!) * (vz[2]! - vz[0]!) - (vx[2]! - vx[0]!) * (vz[1]! - vz[0]!),
      x0 = Math.max(0, Math.ceil(Math.min(...vx) - 0.5)),
      x1 = Math.min(largura - 1, Math.floor(Math.max(...vx) - 0.5)),
      y0 = Math.max(0, Math.ceil(Math.min(...vz) - 0.5)),
      y1 = Math.min(altura - 1, Math.floor(Math.max(...vz) - 0.5))
    return { ids, vx, vz, area, x0, x1, y0, y1 }
  }
  let trabalho = 0
  for (let i = 0; i < quantidade; i += 3) {
    const t = limites(i)
    if (Math.abs(t.area) < 1e-12) continue
    trabalho += Math.max(0, t.x1 - t.x0 + 1) * Math.max(0, t.y1 - t.y0 + 1)
    if (trabalho > 16777216)
      throw Error('A sobreposição dos triângulos excede o orçamento da pintura.')
  }
  const pixels = new Uint8Array(largura * altura * 4),
    cobertos = new Uint8Array(largura * altura),
    amostra = new Float64Array(3),
    cor = new Color()
  for (let i = 0; i < quantidade; i += 3) {
    sinal?.throwIfAborted()
    const { ids, vx, vz, area, x0, x1, y0, y1 } = limites(i)
    if (Math.abs(area) < 1e-12) continue
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const qx = x + 0.5 - vx[0]!,
          qz = y + 0.5 - vz[0]!,
          wb = (qx * (vz[2]! - vz[0]!) - (vx[2]! - vx[0]!) * qz) / area,
          wc = ((vx[1]! - vx[0]!) * qz - qx * (vz[1]! - vz[0]!)) / area,
          wa = 1 - wb - wc
        if (wa < -1e-8 || wb < -1e-8 || wc < -1e-8) continue
        let r = 0,
          verde = 0,
          azul = 0
        const wx = minX + ((x + 0.5) / largura) * dx,
          wz = minZ + ((y + 0.5) / altura) * dz
        for (let c = 0; c < camadas.length; c++) {
          const peso =
            wa * pesos[ids[0]! * camadas.length + c]! +
            wb * pesos[ids[1]! * camadas.length + c]! +
            wc * pesos[ids[2]! * camadas.length + c]!
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
        const pixel = y * largura + x,
          offset = pixel * 4
        pixels[offset] = Math.round(Math.max(0, Math.min(1, cor.r)) * 255)
        pixels[offset + 1] = Math.round(Math.max(0, Math.min(1, cor.g)) * 255)
        pixels[offset + 2] = Math.round(Math.max(0, Math.min(1, cor.b)) * 255)
        pixels[offset + 3] = 255
        cobertos[pixel] = 1
      }
  }
  // Dilatação só fora das faces: impede halos pretos nas bordas filtradas/recortes.
  for (let passo = 1; passo <= 2; passo++)
    for (let y = 0; y < altura; y++)
      for (let x = 0; x < largura; x++) {
        const id = y * largura + x
        if (cobertos[id]) continue
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          if (nx! < 0 || ny! < 0 || nx! >= largura || ny! >= altura) continue
          const vizinho = ny! * largura + nx!,
            nivel = cobertos[vizinho]!
          if (!nivel || nivel > passo) continue
          pixels.set(pixels.subarray(vizinho * 4, vizinho * 4 + 4), id * 4)
          cobertos[id] = passo + 1
          break
        }
      }
  return { largura, altura, pixels, uvs }
}
