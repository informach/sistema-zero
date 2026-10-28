/**
 * Caminho pelo chão para quem anda sozinho (o bicho achado correndo até o cercadinho, e depois o
 * bicho que segue a criança). Uma grade de casas livres ou ocupadas e uma busca A* com oito
 * vizinhos; o caminho achado é encurtado ligando os pontos que se veem em linha reta, para o
 * bicho correr reto e não em zigue-zague de casa em casa. Sem React e sem three.
 */

export interface PontoNoChao {
  x: number
  z: number
}

export interface Grade {
  /** O canto de menor x e z (o centro da casa 0, 0). */
  de: PontoNoChao
  passo: number
  colunas: number
  linhas: number
  /** 1 = livre, 0 = ocupada; índice `linha * colunas + coluna`. */
  livre: Uint8Array
}

/** Monta a grade perguntando a `livre` por cada casa (no centro dela). */
export function criarGrade(
  de: PontoNoChao,
  ate: PontoNoChao,
  passo: number,
  livre: (x: number, z: number) => boolean,
): Grade {
  const colunas = Math.max(1, Math.floor((ate.x - de.x) / passo) + 1)
  const linhas = Math.max(1, Math.floor((ate.z - de.z) / passo) + 1)
  const casas = new Uint8Array(colunas * linhas)
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      casas[l * colunas + c] = livre(de.x + c * passo, de.z + l * passo) ? 1 : 0
    }
  }
  return { de, passo, colunas, linhas, livre: casas }
}

function casaDe(g: Grade, p: PontoNoChao): { c: number; l: number } {
  return {
    c: Math.min(g.colunas - 1, Math.max(0, Math.round((p.x - g.de.x) / g.passo))),
    l: Math.min(g.linhas - 1, Math.max(0, Math.round((p.z - g.de.z) / g.passo))),
  }
}

const livreEm = (g: Grade, c: number, l: number) =>
  c >= 0 && l >= 0 && c < g.colunas && l < g.linhas && g.livre[l * g.colunas + c] === 1

/** A casa livre mais perto (procura em anéis), para quando o começo ou o fim caem num obstáculo. */
function casaLivreMaisPerto(g: Grade, c0: number, l0: number): { c: number; l: number } | null {
  if (livreEm(g, c0, l0)) return { c: c0, l: l0 }
  for (let r = 1; r < Math.max(g.colunas, g.linhas); r++) {
    let melhor: { c: number; l: number; d: number } | null = null
    for (let dl = -r; dl <= r; dl++) {
      for (let dc = -r; dc <= r; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dl)) !== r) continue
        const d = dc * dc + dl * dl
        if (livreEm(g, c0 + dc, l0 + dl) && (!melhor || d < melhor.d)) {
          melhor = { c: c0 + dc, l: l0 + dl, d }
        }
      }
    }
    if (melhor) return { c: melhor.c, l: melhor.l }
  }
  return null
}

/** As duas casas se veem em linha reta (todas as casas no meio estão livres)? */
function seVeem(g: Grade, a: { c: number; l: number }, b: { c: number; l: number }): boolean {
  const n = Math.ceil(Math.hypot(b.c - a.c, b.l - a.l) * 2)
  for (let i = 1; i < n; i++) {
    const t = i / n
    if (!livreEm(g, Math.round(a.c + (b.c - a.c) * t), Math.round(a.l + (b.l - a.l) * t)))
      return false
  }
  return true
}

const VIZINHOS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

/**
 * O caminho de `de` até `ate` pelas casas livres (com os dois pontos nas pontas), ou `null` se não
 * houver. Na diagonal só passa se as duas casas do lado também estiverem livres (não corta quina).
 */
export function acharCaminho(g: Grade, de: PontoNoChao, ate: PontoNoChao): PontoNoChao[] | null {
  const a0 = casaDe(g, de)
  const b0 = casaDe(g, ate)
  const a = casaLivreMaisPerto(g, a0.c, a0.l)
  const b = casaLivreMaisPerto(g, b0.c, b0.l)
  if (!a || !b) return null
  const total = g.colunas * g.linhas
  const custo = new Float32Array(total).fill(Number.POSITIVE_INFINITY)
  const veio = new Int32Array(total).fill(-1)
  const fechado = new Uint8Array(total)
  const inicio = a.l * g.colunas + a.c
  const fim = b.l * g.colunas + b.c
  const estimativa = (i: number) =>
    Math.hypot((i % g.colunas) - b.c, Math.floor(i / g.colunas) - b.l)
  // Fila de prioridade simples (lista ordenada por inserção binária): a grade é pequena.
  const abertos: { i: number; f: number }[] = [{ i: inicio, f: estimativa(inicio) }]
  custo[inicio] = 0
  while (abertos.length > 0) {
    const atual = abertos.shift()
    if (!atual) break
    const i = atual.i
    if (fechado[i]) continue
    fechado[i] = 1
    if (i === fim) break
    const c = i % g.colunas
    const l = Math.floor(i / g.colunas)
    for (const [dc, dl] of VIZINHOS) {
      const nc = c + dc
      const nl = l + dl
      if (!livreEm(g, nc, nl)) continue
      if (dc !== 0 && dl !== 0 && (!livreEm(g, c + dc, l) || !livreEm(g, c, l + dl))) continue
      const j = nl * g.colunas + nc
      const novo = (custo[i] ?? 0) + (dc !== 0 && dl !== 0 ? Math.SQRT2 : 1)
      if (novo >= (custo[j] ?? Number.POSITIVE_INFINITY)) continue
      custo[j] = novo
      veio[j] = i
      const f = novo + estimativa(j)
      let lo = 0
      let hi = abertos.length
      while (lo < hi) {
        const m = (lo + hi) >> 1
        if ((abertos[m]?.f ?? 0) < f) lo = m + 1
        else hi = m
      }
      abertos.splice(lo, 0, { i: j, f })
    }
  }
  if (inicio !== fim && veio[fim] === -1) return null
  const casas: { c: number; l: number }[] = []
  for (let i = fim; i !== -1; i = i === inicio ? -1 : (veio[i] ?? -1)) {
    casas.push({ c: i % g.colunas, l: Math.floor(i / g.colunas) })
  }
  casas.reverse()
  // Encurta: de cada ponto, pula para o mais longe que ele ainda vê em linha reta.
  const curtas: { c: number; l: number }[] = []
  let k = 0
  while (k < casas.length) {
    const daqui = casas[k]
    if (!daqui) break
    curtas.push(daqui)
    let longe = k + 1
    for (let m = casas.length - 1; m > k + 1; m--) {
      const ali = casas[m]
      if (ali && seVeem(g, daqui, ali)) {
        longe = m
        break
      }
    }
    k = longe
  }
  const meio = curtas
    .slice(1, -1)
    .map(({ c, l }) => ({ x: g.de.x + c * g.passo, z: g.de.z + l * g.passo }))
  return [{ x: de.x, z: de.z }, ...meio, { x: ate.x, z: ate.z }]
}

/** O comprimento de um caminho no chão. */
export function comprimentoDoCaminho(caminho: readonly PontoNoChao[]): number {
  let total = 0
  for (let i = 1; i < caminho.length; i++) {
    const a = caminho[i - 1]
    const b = caminho[i]
    if (a && b) total += Math.hypot(b.x - a.x, b.z - a.z)
  }
  return total
}

/** O ponto a `distancia` do começo do caminho, e para onde ele aponta ali (`(sin r, cos r)`). */
export function pontoNoCaminho(
  caminho: readonly PontoNoChao[],
  distancia: number,
): { x: number; z: number; rumo: number; fim: boolean } {
  let falta = Math.max(0, distancia)
  for (let i = 1; i < caminho.length; i++) {
    const a = caminho[i - 1]
    const b = caminho[i]
    if (!a || !b) continue
    const d = Math.hypot(b.x - a.x, b.z - a.z)
    const rumo = Math.atan2(b.x - a.x, b.z - a.z)
    if (falta <= d || i === caminho.length - 1) {
      const t = d > 0 ? Math.min(1, falta / d) : 1
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        rumo,
        fim: falta >= d && i === caminho.length - 1,
      }
    }
    falta -= d
  }
  const ultimo = caminho[caminho.length - 1] ?? { x: 0, z: 0 }
  return { x: ultimo.x, z: ultimo.z, rumo: 0, fim: true }
}
