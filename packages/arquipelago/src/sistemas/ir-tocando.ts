/**
 * Ir tocando (regra pura): a criança toca num lugar do chão e o avatar vai até lá sozinho, andando,
 * pelo caminho que desvia dos obstáculos. Pedido da dona (14/11/2026), além das setas, do WASD, do
 * direcional e do controle.
 *
 * O que ele NÃO faz: pular vão, pegar cipó, subir escada, nadar. Lugar a que não se chega andando é
 * recusado na hora do toque. Qualquer comando dela (andar, pular, usar) cancela a ida.
 */
import { acharCaminho, criarGrade, type Grade, type PontoNoChao } from './caminho'

export const IR_TOCANDO = {
  /** Um toque: o dedo (ou o mouse) sobe em até isto (ms) e a menos de tantos pixels de onde desceu. */
  toqueMs: 350,
  toquePixels: 10,
  /** Até onde se pode tocar, do avatar (m). Mais longe, a tela mal mostra o chão. */
  alcance: 40,
  /** O tamanho das casas da grade de caminho (m) e a folga em volta do trecho (m). */
  passo: 0.5,
  margem: 6,
  /** Chegou ao destino a menos disto (m); um ponto do meio do caminho conta a menos disto. */
  chegou: 0.35,
  pontoDoMeio: 0.6,
  /** Com mais que isto pela frente (m), corre; senão, anda. */
  correrAcimaDe: 7,
  /** Sem avançar `avancoMinimo` (m) por este tempo (s), desiste: alguma coisa segurou. */
  travada: 0.9,
  avancoMinimo: 0.12,
  /** Duas casas vizinhas com mais que isto de diferença de altura são um degrau alto ou um barranco. */
  degrau: 0.5,
  /** O direcional empurrado além disto cancela a ida. */
  cancelaCom: 0.25,
} as const

/** O dedo desceu e subiu no mesmo lugar, depressa: é um toque (arrastar gira a câmera). */
export function foiUmToque(dx: number, dy: number, ms: number): boolean {
  return ms <= IR_TOCANDO.toqueMs && Math.hypot(dx, dy) <= IR_TOCANDO.toquePixels
}

/** Uma ida em andamento: os pontos do caminho (o último é o destino) e onde ela está nele. */
export interface Ida {
  caminho: PontoNoChao[]
  indice: number
  /** Há quanto tempo (s) ela não avança, e de onde se mede o avanço. */
  semAvancar: number
  marca: PontoNoChao
  /** O objeto a usar ao chegar (tocou nele), ou `null` (tocou no chão). */
  usar: string | null
}

export function criarIda(
  caminho: readonly PontoNoChao[],
  de: PontoNoChao,
  usar: string | null = null,
): Ida | null {
  if (caminho.length === 0) return null
  return {
    caminho: caminho.map((p) => ({ x: p.x, z: p.z })),
    indice: 0,
    semAvancar: 0,
    marca: { x: de.x, z: de.z },
    usar,
  }
}

export function destinoDaIda(ida: Ida): PontoNoChao {
  return ida.caminho[ida.caminho.length - 1] as PontoNoChao
}

/** Quanto falta andar (m), de `p` até o destino pelos pontos que restam. */
export function restanteDaIda(ida: Ida, p: PontoNoChao): number {
  let total = 0
  let de = p
  for (let i = ida.indice; i < ida.caminho.length; i++) {
    const ate = ida.caminho[i] as PontoNoChao
    total += Math.hypot(ate.x - de.x, ate.z - de.z)
    de = ate
  }
  return total
}

export type SituacaoDaIda = 'andando' | 'chegou' | 'travada'

/** Para onde andar agora (no mundo, unitário) e se corre. Escrito em `saida`, sem criar lixo. */
export interface RumoDaIda {
  x: number
  z: number
  correr: boolean
}

/**
 * Um passo da ida: avança nos pontos do caminho, diz o rumo e confere se ela travou. Muda a `ida`.
 * Chamado a cada passo da física, com `dt` em segundos.
 */
export function passoDaIda(ida: Ida, p: PontoNoChao, dt: number, saida: RumoDaIda): SituacaoDaIda {
  const ultimo = ida.caminho.length - 1
  // Pula os pontos do meio já alcançados.
  while (ida.indice < ultimo) {
    const alvo = ida.caminho[ida.indice] as PontoNoChao
    if (Math.hypot(alvo.x - p.x, alvo.z - p.z) > IR_TOCANDO.pontoDoMeio) break
    ida.indice += 1
  }
  const alvo = ida.caminho[ida.indice] as PontoNoChao
  const dx = alvo.x - p.x
  const dz = alvo.z - p.z
  const d = Math.hypot(dx, dz)
  if (ida.indice === ultimo && d <= IR_TOCANDO.chegou) return 'chegou'
  // Travou? Mede o avanço em linha reta desde a última marca.
  if (Math.hypot(p.x - ida.marca.x, p.z - ida.marca.z) >= IR_TOCANDO.avancoMinimo) {
    ida.marca.x = p.x
    ida.marca.z = p.z
    ida.semAvancar = 0
  } else {
    ida.semAvancar += dt
    if (ida.semAvancar >= IR_TOCANDO.travada) return 'travada'
  }
  saida.x = d > 0 ? dx / d : 0
  saida.z = d > 0 ? dz / d : 0
  saida.correr = restanteDaIda(ida, p) > IR_TOCANDO.correrAcimaDe
  return 'andando'
}

/** Ela pegou o comando de volta: o direcional, o pulo ou o usar cancelam a ida. */
export function comandoCancela(ix: number, iz: number, pulou: boolean, usou: boolean): boolean {
  return pulou || usou || Math.hypot(ix, iz) > IR_TOCANDO.cancelaCom
}

/** O que o mundo diz de um ponto do chão: a altura do chão ali e se o corpo cabe de pé e seco. */
export interface ChaoNoPonto {
  /** A altura do chão (`null` = não há chão embaixo). */
  y: number | null
  /** O corpo cabe ali de pé, sem encostar em nada, e sem ter de nadar. */
  cabe: boolean
}

/**
 * A grade de caminho entre `de` e `ate`, com a folga em volta. Uma casa é livre quando há chão, o
 * corpo cabe, e nenhuma vizinha de lado tem o chão `degrau` acima ou abaixo (um barranco ou a beira
 * de um deque: dali só se sai pulando).
 */
export function gradeDaIda(
  de: PontoNoChao,
  ate: PontoNoChao,
  chao: (x: number, z: number) => ChaoNoPonto,
): Grade {
  const { passo, margem, degrau } = IR_TOCANDO
  const x0 = Math.min(de.x, ate.x) - margem
  const z0 = Math.min(de.z, ate.z) - margem
  const colunas = Math.floor((Math.max(de.x, ate.x) + margem - x0) / passo) + 1
  const linhas = Math.floor((Math.max(de.z, ate.z) + margem - z0) / passo) + 1
  const altura = new Float32Array(colunas * linhas).fill(Number.NaN)
  const cabe = new Uint8Array(colunas * linhas)
  for (let l = 0; l < linhas; l++)
    for (let c = 0; c < colunas; c++) {
      const ponto = chao(x0 + c * passo, z0 + l * passo)
      if (ponto.y === null) continue
      altura[l * colunas + c] = ponto.y
      cabe[l * colunas + c] = ponto.cabe ? 1 : 0
    }
  const lisa = (c: number, l: number): boolean => {
    const i = l * colunas + c
    if (cabe[i] !== 1) return false
    const y = altura[i] as number
    for (const [dc, dl] of VIZINHAS) {
      const vc = c + dc
      const vl = l + dl
      if (vc < 0 || vl < 0 || vc >= colunas || vl >= linhas) continue
      const vy = altura[vl * colunas + vc] as number
      // Vizinha sem chão é a beira de um buraco: a casa em si ainda vale (a vizinha, não).
      if (!Number.isNaN(vy) && Math.abs(vy - y) > degrau) return false
    }
    return true
  }
  return criarGrade(
    { x: x0, z: z0 },
    { x: x0 + (colunas - 1) * passo, z: z0 + (linhas - 1) * passo },
    passo,
    (x, z) => lisa(Math.round((x - x0) / passo), Math.round((z - z0) / passo)),
  )
}
const VIZINHAS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export type RecusaDaIda = 'longe' | 'sem-caminho'

/**
 * O caminho do toque: de onde ela está até o ponto tocado. Recusa o que fica longe demais e o que
 * não se alcança andando.
 */
export function caminhoDoToque(
  de: PontoNoChao,
  ate: PontoNoChao,
  chao: (x: number, z: number) => ChaoNoPonto,
): { caminho: PontoNoChao[] } | { recusa: RecusaDaIda } {
  if (Math.hypot(ate.x - de.x, ate.z - de.z) > IR_TOCANDO.alcance) return { recusa: 'longe' }
  const grade = gradeDaIda(de, ate, chao)
  // O ponto tocado (ou uma casa colada nele) precisa ser chão em que o corpo cabe: a busca aceita
  // o destino mais perto que achar, e sem isto um toque no telhado virava "ir até a parede".
  if (!temCasaLivrePerto(grade, ate)) return { recusa: 'sem-caminho' }
  const caminho = acharCaminho(grade, de, ate)
  if (!caminho || caminho.length < 2) return { recusa: 'sem-caminho' }
  // O primeiro ponto é onde ela já está.
  return { caminho: caminho.slice(1) }
}

/** A casa do ponto, ou uma das oito em volta, é livre. */
function temCasaLivrePerto(g: Grade, p: PontoNoChao): boolean {
  const c0 = Math.round((p.x - g.de.x) / g.passo)
  const l0 = Math.round((p.z - g.de.z) / g.passo)
  for (let dl = -1; dl <= 1; dl++)
    for (let dc = -1; dc <= 1; dc++) {
      const c = c0 + dc
      const l = l0 + dl
      if (c >= 0 && l >= 0 && c < g.colunas && l < g.linhas && g.livre[l * g.colunas + c] === 1)
        return true
    }
  return false
}

// ── Tocar num objeto: ir até ele e usar ─────────────────────────────────────────────────────────

/** Um interativo como o toque o vê (o mesmo formato do registro do mundo). */
export interface InterativoDoToque {
  x: number
  z: number
  raio: number
  deFundo?: boolean
  rotulo(): string | null
}

/** Um toque a até isto (m) de um objeto conta como tocar nele (o objeto é maior que o ponto dele). */
export const PERTO_DO_OBJETO = 1.2

/**
 * O objeto tocado: o interativo com algo a fazer mais perto do ponto tocado, até o alcance dele (ou
 * `PERTO_DO_OBJETO`, o que for maior). O de fundo (o bicho que segue) não conta: é o objeto que a
 * criança mira, não o que anda junto.
 */
export function interativoNoToque(
  lista: Iterable<[string, InterativoDoToque]>,
  p: PontoNoChao,
): { id: string; x: number; z: number; raio: number } | null {
  let melhor: { id: string; x: number; z: number; raio: number; d: number } | null = null
  for (const [id, it] of lista) {
    if (it.deFundo || !it.rotulo()) continue
    const d = Math.hypot(it.x - p.x, it.z - p.z)
    if (d > Math.max(it.raio, PERTO_DO_OBJETO)) continue
    if (!melhor || d < melhor.d) melhor = { id, x: it.x, z: it.z, raio: it.raio, d }
  }
  return melhor ? { id: melhor.id, x: melhor.x, z: melhor.z, raio: melhor.raio } : null
}

/**
 * Onde parar para usar o objeto: pontos em volta dele, dentro do alcance (com folga), o primeiro no
 * lado de quem chega. Quem chama tenta um por um até achar caminho.
 */
export function pontosParaUsar(
  alvo: { x: number; z: number; raio: number },
  de: PontoNoChao,
): PontoNoChao[] {
  const r = Math.max(0.3, alvo.raio * 0.6)
  const rumo = Math.atan2(de.x - alvo.x, de.z - alvo.z)
  const pontos: PontoNoChao[] = []
  for (const desvio of [0, 1, -1, 2, -2, 3, -3, 4])
    pontos.push({
      x: alvo.x + Math.sin(rumo + (desvio * Math.PI) / 4) * r,
      z: alvo.z + Math.cos(rumo + (desvio * Math.PI) / 4) * r,
    })
  return pontos
}

/** Já está ao alcance do objeto: usa sem andar. */
export function aoAlcance(alvo: { x: number; z: number; raio: number }, p: PontoNoChao): boolean {
  return Math.hypot(alvo.x - p.x, alvo.z - p.z) <= alvo.raio
}

// ── Levar até a tarefa do "Agora" ──────────────────────────────────────────────────────────────

/**
 * Onde se faz cada lembrete do "Agora": ids de interativos (terminados em `-`, o começo do id). O
 * avatar vai até o mais perto deles que tem algo a fazer agora.
 */
export const LUGARES_DOS_LEMBRETES: Readonly<Record<string, readonly string[]>> = {
  porta: ['porta-nova', 'porta-da-casa'],
  fome: ['objeto-geladeira', 'bancada'],
  energia: ['cama'],
  regar: ['canteiro-'],
  colher: ['canteiro-'],
  'primeiro-pedido': ['canteiro-', 'objeto-geladeira'],
  desafio: ['quadro-'],
}

const casa = (id: string, lugares: readonly string[]) =>
  lugares.some((l) => (l.endsWith('-') ? id.startsWith(l) : id === l))

/**
 * O interativo de um lembrete: o mais perto de `de` cujo id casa com um dos lugares, com algo a fazer
 * agora; sem nenhum com algo a fazer, o mais perto mesmo assim (a porta fechada, o canteiro que
 * ainda cresce: ir até lá mostra onde fica).
 */
export function interativoDoLembrete(
  lista: Iterable<[string, InterativoDoToque]>,
  lugares: readonly string[],
  de: PontoNoChao,
): { id: string; x: number; z: number; raio: number } | null {
  let comAcao: { id: string; x: number; z: number; raio: number; d: number } | null = null
  let qualquer: { id: string; x: number; z: number; raio: number; d: number } | null = null
  for (const [id, it] of lista) {
    if (it.deFundo || !casa(id, lugares)) continue
    const d = Math.hypot(it.x - de.x, it.z - de.z)
    const este = { id, x: it.x, z: it.z, raio: it.raio, d }
    if (it.rotulo() && (!comAcao || d < comAcao.d)) comAcao = este
    if (!qualquer || d < qualquer.d) qualquer = este
  }
  const o = comAcao ?? qualquer
  return o ? { id: o.id, x: o.x, z: o.z, raio: o.raio } : null
}

/** O que o Zappy diz quando não acha o caminho até a tarefa (longe, em outra ilha). */
export const FALA_SEM_CAMINHO_ATE_A_TAREFA =
  'Daqui eu não acho o caminho. Chegue mais perto, ou abra o mapa para viajar.'
