import type { FormaDoRelevo } from './relevo'

/**
 * Os pedaços do relevo em campo como o motor Python os desenha (plano "Mundos de 2 km", lote 6,
 * 23/11/2026). O Raylib do Estúdio não tem neblina nem o material do editor: cada pedaço é uma
 * malha com a COR NO VÉRTICE (as camadas misturadas pelos pesos, vezes a cor média da textura de
 * cada uma, com uma luz simples do relevo) e saias nas bordas. Esta é a referência: o `cenario.py`
 * faz a mesma conta e os casos compartilhados (`gen-raylib-relevo-cases.ts`) conferem as duas.
 *
 * - Vértice a cada `passo` células da grade, as alturas lidas do campo, a MESMA diagonal da malha
 *   desenhada e da colisão (`[a, c, b, b, c, d]`, `malhaDeGradeNaPeca`).
 * - Célula de buraco (a do canto de cada quadrado do pedaço) não tem triângulo.
 * - Saias: cada borda desce o quanto o desenho grosso (um vértice a cada `PEDACOS_DO_RELEVO.grosso`
 *   células) se afasta do fino ao longo dela, mais meio metro; assim pedaços de detalhe diferente
 *   nunca deixam fresta entre si.
 */
export const PEDACOS_DO_RELEVO = {
  /** Células por lado do pedaço completo (128 m com 2 m de passo). */
  celulas: 64,
  /** Células entre vértices no desenho grosso (16 m com 2 m de passo). */
  grosso: 8,
  /** Até onde (em pedaços, do foco à borda do pedaço) vale o desenho completo. */
  alcanceCompleto: 1.5,
} as const

export interface CamadaParaCor {
  cor: string
  corMedia: string
}

export interface DadosDoPedaco {
  forma: FormaDoRelevo
  /** `(colunas + 1) × (linhas + 1)` alturas. */
  alturas: ArrayLike<number>
  /** `colunas × linhas`, 1 = buraco. */
  buracos?: ArrayLike<number>
  /** Um RGBA por vértice da grade em cada arquivo (camadas 1 a 4, depois 5 a 8). */
  pesos: readonly ArrayLike<number>[]
  camadas: readonly CamadaParaCor[]
}

export interface PedacoDoRelevoPython {
  /** A primeira célula do pedaço. */
  i0: number
  j0: number
  /** Células por lado (cortado na borda da grade). */
  celulas: number
  /** Células entre vértices. */
  passo: number
}

export interface MalhaDoPedaco {
  /** x, y, z por vértice (os da grade, linha a linha, e depois os das saias). */
  vertices: number[]
  /** r, g, b, a por vértice. */
  cores: number[]
  indices: number[]
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** A cor de cada camada: a cor dela vezes a cor média da textura (0 a 1). */
export function coresDasCamadas(camadas: readonly CamadaParaCor[]): [number, number, number][] {
  return camadas.map((c) => {
    const a = rgb(c.cor),
      b = rgb(c.corMedia)
    return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]
  })
}

const byte = (v: number) => Math.min(255, Math.max(0, Math.floor(v * 255 + 0.5)))

/** A cor (RGB, 0 a 255) do vértice (i, j) da grade. */
export function corDoVerticeDoRelevo(
  d: DadosDoPedaco,
  cores: readonly (readonly [number, number, number])[],
  i: number,
  j: number,
): [number, number, number] {
  const { colunas, linhas, passo } = d.forma,
    largura = colunas + 1,
    v = j * largura + i
  let r = 0,
    g = 0,
    b = 0
  for (let k = 0; k < cores.length; k++) {
    const w = (d.pesos[k >> 2]![v * 4 + (k & 3)] ?? 0) / 255,
      c = cores[k]!
    r += w * c[0]
    g += w * c[1]
    b += w * c[2]
  }
  const h = (x: number, z: number) => d.alturas[z * largura + x]!
  const xe = Math.max(i - 1, 0),
    xd = Math.min(i + 1, colunas),
    zb = Math.max(j - 1, 0),
    zc = Math.min(j + 1, linhas)
  const dx = (h(xd, j) - h(xe, j)) / ((xd - xe) * passo),
    dz = (h(i, zc) - h(i, zb)) / ((zc - zb) * passo)
  // Raiz quadrada explícita (e não `Math.hypot`): ela é exata no IEEE, e o Python faz a mesma
  // conta na mesma ordem, então as cores saem iguais byte a byte. A luz vem de (0,4; 1; 0,3).
  const l = Math.sqrt(0.4 * 0.4 + 1 + 0.3 * 0.3),
    n = Math.sqrt(dx * dx + 1 + dz * dz)
  const luz = 0.6 + 0.4 * Math.max(0, (-dx * (0.4 / l) + 1 / l - dz * (0.3 / l)) / n)
  return [byte(r * luz), byte(g * luz), byte(b * luz)]
}

/** Quanto a borda fina se afasta do desenho grosso dela (metros), mais meio metro. */
export function saiaDoPedaco(d: DadosDoPedaco, p: PedacoDoRelevoPython): number {
  const { colunas } = d.forma,
    largura = colunas + 1,
    g = PEDACOS_DO_RELEVO.grosso,
    i1 = p.i0 + p.celulas,
    j1 = p.j0 + p.celulas
  const h = (x: number, z: number) => d.alturas[z * largura + x]!
  let pior = 0
  const borda = (fixo: number, de: number, ate: number, vertical: boolean) => {
    for (let k = de; k < ate; k += g) {
      const fim = Math.min(k + g, ate)
      const a = vertical ? h(fixo, k) : h(k, fixo),
        b = vertical ? h(fixo, fim) : h(fim, fixo)
      for (let m = k + 1; m < fim; m++) {
        const t = (m - k) / (fim - k)
        const real = vertical ? h(fixo, m) : h(m, fixo)
        pior = Math.max(pior, Math.abs(real - (a + (b - a) * t)))
      }
    }
  }
  borda(p.j0, p.i0, i1, false)
  borda(j1, p.i0, i1, false)
  borda(p.i0, p.j0, j1, true)
  borda(i1, p.j0, j1, true)
  return pior + 0.5
}

/** A malha de um pedaço, com as saias. */
export function malhaDoPedacoDoRelevo(d: DadosDoPedaco, p: PedacoDoRelevoPython): MalhaDoPedaco {
  const { origem, passo, colunas } = d.forma,
    largura = colunas + 1,
    cores = coresDasCamadas(d.camadas),
    n = p.celulas / p.passo + 1
  if (!Number.isInteger(n) || n < 2) throw new Error('O pedaço do relevo não cabe no passo.')
  const vertices: number[] = [],
    corDe: number[] = [],
    indices: number[] = []
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      const i = p.i0 + b * p.passo,
        j = p.j0 + a * p.passo
      vertices.push(origem.x + i * passo, d.alturas[j * largura + i]!, origem.z + j * passo)
      corDe.push(...corDoVerticeDoRelevo(d, cores, i, j), 255)
    }
  for (let a = 0; a < n - 1; a++)
    for (let b = 0; b < n - 1; b++) {
      const i = p.i0 + b * p.passo,
        j = p.j0 + a * p.passo
      if (d.buracos?.[j * colunas + i]) continue
      const va = a * n + b,
        vb = va + 1,
        vc = va + n,
        vd = vc + 1
      indices.push(va, vc, vb, vb, vc, vd)
    }
  // As saias: a borda copiada para baixo, com a face para fora do pedaço.
  const saia = saiaDoPedaco(d, p)
  const bordas: [number[], boolean][] = [
    [Array.from({ length: n }, (_, b) => b), false], // z mínimo, olha para -z
    [Array.from({ length: n }, (_, b) => (n - 1) * n + b), true], // z máximo, olha para +z
    [Array.from({ length: n }, (_, a) => a * n), true], // x mínimo, olha para -x
    [Array.from({ length: n }, (_, a) => a * n + n - 1), false], // x máximo, olha para +x
  ]
  for (const [lista, inverter] of bordas) {
    const base = vertices.length / 3
    for (const v of lista) {
      vertices.push(vertices[v * 3]!, vertices[v * 3 + 1]! - saia, vertices[v * 3 + 2]!)
      corDe.push(corDe[v * 4]!, corDe[v * 4 + 1]!, corDe[v * 4 + 2]!, 255)
    }
    for (let k = 0; k < n - 1; k++) {
      const s0 = lista[k]!,
        s1 = lista[k + 1]!,
        b0 = base + k,
        b1 = base + k + 1
      if (inverter) indices.push(s0, b0, s1, s1, b0, b1)
      else indices.push(s0, s1, b0, s1, b1, b0)
    }
  }
  return { vertices, cores: corDe, indices }
}
