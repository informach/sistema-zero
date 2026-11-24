export interface ContatoDoRaster {
  /** Referências transitórias: o raster as reutiliza a cada texel. */
  indices: readonly number[]
  pesos: readonly number[]
  x: number
  y: number
  offset: number
}
export interface FonteDoRaster {
  x: ArrayLike<number>
  y: ArrayLike<number>
  indices?: { quantidade: number; ler(i: number): number }
}

/** Um rasterizador para solo e água: mesmas fronteiras, UVs e dilatação.
 * O callback escreve RGBA; os geradores de aparência conservam suas próprias regras. */
export function rasterizarSuperficie(
  fonte: FonteDoRaster,
  amostrar: (contato: ContatoDoRaster, pixels: Uint8Array) => void,
  opcoes: { pixelsPorMetro?: number; sinal?: AbortSignal } = {},
) {
  const { sinal } = opcoes,
    ppm = opcoes.pixelsPorMetro ?? 8,
    n = fonte.x.length,
    quantidade = fonte.indices?.quantidade ?? n
  sinal?.throwIfAborted()
  if (
    !Number.isSafeInteger(n) ||
    n < 1 ||
    n > 65000 ||
    fonte.y.length !== n ||
    !Number.isSafeInteger(quantidade) ||
    quantidade < 0 ||
    quantidade > 390000 ||
    quantidade % 3 ||
    !Number.isFinite(ppm) ||
    ppm < 1 ||
    ppm > 64
  )
    throw Error('A superfície ou resolução do raster compilado é inválida.')
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (let i = 0; i < n; i++) {
    const x = fonte.x[i]!,
      y = fonte.y[i]!
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw Error('Uma coordenada do raster não é finita.')
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const dx = maxX - minX,
    dy = maxY - minY,
    largura = Math.max(2, Math.ceil(dx * ppm)),
    altura = Math.max(2, Math.ceil(dy * ppm))
  if (!(dx > 0 && dy > 0) || largura > 2048 || altura > 2048 || largura * altura > 4194304)
    throw Error(
      'A resolução da pintura excede o limite de pixels por parte. Divida a superfície em setores.',
    )
  const uvs = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    uvs[i * 2] = (fonte.x[i]! - minX) / dx
    uvs[i * 2 + 1] = (fonte.y[i]! - minY) / dy
  }
  const indice = (i: number) => (fonte.indices ? fonte.indices.ler(i) : i),
    limites = (i: number) => {
      const ids = [indice(i), indice(i + 1), indice(i + 2)]
      if (ids.some((v) => !Number.isSafeInteger(v) || v < 0 || v >= n))
        throw Error('Um índice da pintura é inválido.')
      const vx = ids.map((id) => ((fonte.x[id]! - minX) / dx) * largura),
        vy = ids.map((id) => ((fonte.y[id]! - minY) / dy) * altura),
        area = (vx[1]! - vx[0]!) * (vy[2]! - vy[0]!) - (vx[2]! - vx[0]!) * (vy[1]! - vy[0]!),
        x0 = Math.max(0, Math.ceil(Math.min(...vx) - 0.5)),
        x1 = Math.min(largura - 1, Math.floor(Math.max(...vx) - 0.5)),
        y0 = Math.max(0, Math.ceil(Math.min(...vy) - 0.5)),
        y1 = Math.min(altura - 1, Math.floor(Math.max(...vy) - 0.5))
      return { ids, vx, vy, area, x0, x1, y0, y1 }
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
    pesos = [0, 0, 0],
    contato: ContatoDoRaster = { indices: [], pesos, x: 0, y: 0, offset: 0 }
  for (let i = 0; i < quantidade; i += 3) {
    sinal?.throwIfAborted()
    const { ids, vx, vy, area, x0, x1, y0, y1 } = limites(i)
    if (Math.abs(area) < 1e-12) continue
    contato.indices = ids
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const qx = x + 0.5 - vx[0]!,
          qy = y + 0.5 - vy[0]!,
          wb = (qx * (vy[2]! - vy[0]!) - (vx[2]! - vx[0]!) * qy) / area,
          wc = ((vx[1]! - vx[0]!) * qy - qx * (vy[1]! - vy[0]!)) / area,
          wa = 1 - wb - wc
        if (wa < -1e-8 || wb < -1e-8 || wc < -1e-8) continue
        pesos[0] = wa
        pesos[1] = wb
        pesos[2] = wc
        contato.x = minX + ((x + 0.5) / largura) * dx
        contato.y = minY + ((y + 0.5) / altura) * dy
        const pixel = y * largura + x
        contato.offset = pixel * 4
        amostrar(contato, pixels)
        cobertos[pixel] = 1
      }
  }
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
