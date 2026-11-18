import { CenarioInvalido } from '../validacao'
import {
  alturaDoCampo,
  type CampoDeAlturas,
  type RegiaoDoCampo,
  regiaoDoRetangulo,
  unirRegioes,
} from './campo-de-alturas'
import { suave } from './pinceis-de-terreno'

/**
 * Curvas no chão: a geometria comum de trilha, praça, estrada, cerca, muro, ponte e rio.
 *
 * O documento guarda poucos pontos de controle; daqui saem a curva suave, as faixas de malha,
 * as posições das peças repetidas e o molde que a estrada (ou o leito do rio) imprime no
 * terreno. Tudo puro e determinístico, igual para a mão, o agente e a exportação.
 */
export interface PontoNoChao {
  x: number
  z: number
}
export interface Polilinha {
  pontos: PontoNoChao[]
  /** Distância acumulada até cada ponto; numa curva fechada há um valor a mais, o da volta. */
  distancias: number[]
  comprimento: number
  fechada: boolean
}

const MAX_PONTOS = 16_384
const invalidar = (frase: string): never => {
  throw new CenarioInvalido([frase])
}
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const distancia = (a: PontoNoChao, b: PontoNoChao) => {
  const dx = b.x - a.x,
    dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

function limpar(pontos: readonly PontoNoChao[], fechada: boolean): PontoNoChao[] {
  const r: PontoNoChao[] = []
  for (const p of pontos) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) invalidar('A curva tem um ponto inválido')
    if (!r.length || distancia(r[r.length - 1]!, p) > 1e-6) r.push({ x: p.x, z: p.z })
  }
  if (fechada && r.length > 1 && distancia(r[0]!, r[r.length - 1]!) <= 1e-6) r.pop()
  if (r.length < (fechada ? 3 : 2)) invalidar('A curva precisa de mais pontos diferentes')
  if (r.length > MAX_PONTOS) invalidar('A curva tem pontos demais')
  return r
}

/** Mede uma linha quebrada. Pontos repetidos em sequência são descartados. */
export function medirCurva(pontos: readonly PontoNoChao[], fechada = false): Polilinha {
  const ps = limpar(pontos, fechada),
    distancias = [0]
  for (let i = 1; i < ps.length; i++)
    distancias.push(distancias[i - 1]! + distancia(ps[i - 1]!, ps[i]!))
  if (fechada) distancias.push(distancias[ps.length - 1]! + distancia(ps[ps.length - 1]!, ps[0]!))
  return { pontos: ps, distancias, comprimento: distancias[distancias.length - 1]!, fechada }
}

/**
 * Curva suave que passa por todos os pontos de controle (Catmull-Rom centrípeta: não faz
 * laços nem ultrapassa as esquinas). `passo` é o tamanho aproximado de cada trecho, em metros.
 */
export function suavizarCurva(
  controle: readonly PontoNoChao[],
  opcoes: { fechada?: boolean; passo?: number } = {},
): Polilinha {
  const fechada = opcoes.fechada ?? false,
    passo = opcoes.passo ?? 1
  if (!(passo >= 0.05) || passo > 1000) invalidar('O passo da curva é inválido')
  const ps = limpar(controle, fechada),
    n = ps.length
  if (n === 2) return medirCurva(ps, false)
  const pegar = (i: number): PontoNoChao => {
    if (fechada) return ps[((i % n) + n) % n]!
    if (i < 0) return { x: 2 * ps[0]!.x - ps[1]!.x, z: 2 * ps[0]!.z - ps[1]!.z }
    if (i >= n) return { x: 2 * ps[n - 1]!.x - ps[n - 2]!.x, z: 2 * ps[n - 1]!.z - ps[n - 2]!.z }
    return ps[i]!
  }
  const mistura = (a: PontoNoChao, b: PontoNoChao, ta: number, tb: number, t: number) => {
    const u = (t - ta) / (tb - ta)
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u }
  }
  const saida: PontoNoChao[] = []
  const trechos = fechada ? n : n - 1
  for (let i = 0; i < trechos; i++) {
    const p0 = pegar(i - 1),
      p1 = pegar(i),
      p2 = pegar(i + 1),
      p3 = pegar(i + 2),
      corda = distancia(p1, p2),
      t1 = Math.sqrt(distancia(p0, p1)),
      t2 = t1 + Math.sqrt(corda),
      t3 = t2 + Math.sqrt(distancia(p2, p3)),
      divisoes = limitar(Math.ceil(corda / passo), 1, 256)
    for (let k = 0; k < divisoes; k++) {
      const t = t1 + ((t2 - t1) * k) / divisoes,
        a1 = mistura(p0, p1, 0, t1, t),
        a2 = mistura(p1, p2, t1, t2, t),
        a3 = mistura(p2, p3, t2, t3, t),
        b1 = mistura(a1, a2, 0, t2, t),
        b2 = mistura(a2, a3, t1, t3, t)
      saida.push(k === 0 ? p1 : mistura(b1, b2, t1, t2, t))
    }
  }
  if (!fechada) saida.push(ps[n - 1]!)
  return medirCurva(saida, fechada)
}

export interface PontoDaCurva extends PontoNoChao {
  /** Direção de avanço, de comprimento 1. */
  dx: number
  dz: number
  distancia: number
}

/** Ponto e direção a uma distância do começo. Na curva fechada a distância dá a volta. */
export function pontoNaCurva(c: Polilinha, d: number): PontoDaCurva {
  if (!Number.isFinite(d)) invalidar('A distância na curva é inválida')
  const total = c.comprimento
  const s = c.fechada ? ((d % total) + total) % total : limitar(d, 0, total)
  let a = 0,
    b = c.distancias.length - 1
  while (b - a > 1) {
    const m = (a + b) >> 1
    if (c.distancias[m]! <= s) a = m
    else b = m
  }
  const p = c.pontos[a]!,
    q = c.pontos[(a + 1) % c.pontos.length]!,
    trecho = c.distancias[a + 1]! - c.distancias[a]!,
    t = (s - c.distancias[a]!) / trecho
  return {
    x: p.x + (q.x - p.x) * t,
    z: p.z + (q.z - p.z) * t,
    dx: (q.x - p.x) / trecho,
    dz: (q.z - p.z) / trecho,
    distancia: s,
  }
}

/** Estações igualmente espaçadas, com o espaçamento ajustado para fechar exato no fim. */
export function reamostrarCurva(c: Polilinha, passo: number): PontoDaCurva[] {
  if (!(passo > 0)) invalidar('O passo da curva é inválido')
  const n = Math.max(1, Math.round(c.comprimento / passo))
  if (n > 200_000) invalidar('A curva gera estações demais')
  const r: PontoDaCurva[] = []
  for (let i = 0; i < (c.fechada ? n : n + 1); i++) r.push(pontoNaCurva(c, (c.comprimento * i) / n))
  return r
}

/**
 * Giro em torno da vertical que alinha o eixo X local à direção dada, na convenção do motor
 * (rotação Y positiva leva +X para −Z). Arredondado ao milionésimo de radiano para o valor
 * gravado no documento não depender da última casa do `atan2` de cada máquina.
 */
export const giroDaDirecao = (dx: number, dz: number) =>
  Math.round(Math.atan2(-dz, dx) * 1e6) / 1e6 + 0

export interface PecaNaCurva extends PontoNoChao {
  giro: number
  distancia: number
}

/**
 * Posições para peças soltas ao longo da curva (postes, árvores de alameda, lampiões).
 * `lateral` afasta para a esquerda (positivo) ou direita (negativo) do sentido da curva.
 */
export function distribuirNaCurva(
  c: Polilinha,
  opcoes: { espacamento: number; lateral?: number; ajustar?: boolean },
): PecaNaCurva[] {
  const { espacamento, lateral = 0, ajustar = true } = opcoes
  if (!(espacamento >= 0.05) || !Number.isFinite(lateral))
    invalidar('O espaçamento ao longo da curva é inválido')
  const n = ajustar
    ? Math.max(1, Math.round(c.comprimento / espacamento))
    : Math.floor(c.comprimento / espacamento + 1e-9)
  if (n > 20_000) invalidar('A curva gera peças demais')
  const passo = ajustar ? c.comprimento / n : espacamento,
    quantidade = c.fechada ? (ajustar ? n : Math.ceil(c.comprimento / espacamento - 1e-9)) : n + 1
  const r: PecaNaCurva[] = []
  for (let i = 0; i < quantidade; i++) {
    const p = pontoNaCurva(c, i * passo)
    r.push({
      x: p.x + p.dz * lateral,
      z: p.z - p.dx * lateral,
      giro: giroDaDirecao(p.dx, p.dz),
      distancia: p.distancia,
    })
  }
  return r
}

export interface ModuloNaCurva extends PecaNaCurva {
  /** Fator no eixo do comprimento para o módulo fechar exato entre os dois apoios. */
  escala: number
  de: PontoNoChao
  ate: PontoNoChao
}

/**
 * Módulos de comprimento fixo emendados ao longo da curva (lances de cerca e de muro). Cada
 * módulo vai de um apoio ao seguinte em linha reta e é devolvido pelo ponto do meio.
 */
export function modulosNaCurva(c: Polilinha, comprimentoDoModulo: number): ModuloNaCurva[] {
  if (!(comprimentoDoModulo >= 0.05)) invalidar('O comprimento do módulo é inválido')
  const n = Math.max(c.fechada ? 3 : 1, Math.round(c.comprimento / comprimentoDoModulo))
  if (n > 20_000) invalidar('A curva gera peças demais')
  const apoios: PontoDaCurva[] = []
  for (let i = 0; i <= n; i++) apoios.push(pontoNaCurva(c, (c.comprimento * i) / n))
  if (c.fechada) apoios[n] = apoios[0]!
  const r: ModuloNaCurva[] = []
  for (let i = 0; i < n; i++) {
    const de = apoios[i]!,
      ate = apoios[i + 1]!,
      corda = distancia(de, ate)
    if (corda < 1e-6) continue
    r.push({
      x: (de.x + ate.x) / 2,
      z: (de.z + ate.z) / 2,
      giro: giroDaDirecao((ate.x - de.x) / corda, (ate.z - de.z) / corda),
      distancia: de.distancia,
      escala: corda / comprimentoDoModulo,
      de: { x: de.x, z: de.z },
      ate: { x: ate.x, z: ate.z },
    })
  }
  return r
}

export interface MalhaNoChao {
  /** x, y, z por vértice, em coordenadas de mundo. */
  posicoes: Float32Array
  /** u atravessa a faixa (0 a 1); v avança em larguras, para a textura não esticar. */
  uvs: Float32Array
  indices: Uint32Array
}

/** Normal lateral (à esquerda do avanço) em cada ponto, com a esquina repartida entre os trechos. */
function laterais(c: Polilinha): { x: number; z: number }[] {
  const n = c.pontos.length
  return c.pontos.map((p, i) => {
    const anterior = c.fechada || i > 0 ? c.pontos[(i - 1 + n) % n]! : null,
      seguinte = c.fechada || i < n - 1 ? c.pontos[(i + 1) % n]! : null
    let dx = 0,
      dz = 0
    for (const [a, b] of [
      [anterior, p],
      [p, seguinte],
    ] as const) {
      if (!a || !b) continue
      const d = distancia(a, b)
      dx += (b.x - a.x) / d
      dz += (b.z - a.z) / d
    }
    const m = Math.sqrt(dx * dx + dz * dz)
    // Meia-volta exata: não há bissetriz; vale a direção de chegada.
    if (m < 1e-6) {
      const d = distancia(anterior!, p)
      return { x: (p.z - anterior!.z) / d, z: -(p.x - anterior!.x) / d }
    }
    // Na esquina, a faixa alarga até o dobro para manter a largura dos dois trechos.
    const alargar = anterior && seguinte ? Math.min(2, 2 / m) : 1
    return { x: (dz / m) * alargar, z: (-dx / m) * alargar }
  })
}

/**
 * Faixa de malha deitada sobre o chão ao longo da curva: o piso da trilha e da estrada e a
 * lâmina do rio. `divisoes` reparte a largura para a faixa acompanhar o relevo de través.
 */
export function faixaDaCurva(
  c: Polilinha,
  opcoes: {
    largura: number
    /** Altura do chão sob cada vértice: a faixa acompanha o relevo. */
    alturaEm?: (x: number, z: number) => number
    /** Altura única por ponto da curva, no lugar de `alturaEm`: a lâmina de um rio. */
    alturaDoPonto?: (indice: number) => number
    /** Folga acima do chão, para o piso não brigar com o terreno. Padrão 3 cm. */
    elevacao?: number
    divisoes?: number
  },
): MalhaNoChao {
  const { largura, alturaEm, alturaDoPonto, elevacao = 0.03, divisoes = 2 } = opcoes
  if (!alturaEm === !alturaDoPonto) invalidar('A faixa precisa de uma fonte de altura, e só uma')
  if (
    !(largura > 0) ||
    largura > 512 ||
    !Number.isInteger(divisoes) ||
    divisoes < 1 ||
    divisoes > 16
  )
    invalidar('A faixa da curva é inválida')
  const n = c.pontos.length,
    colunas = divisoes + 1,
    linhas = c.fechada ? n + 1 : n
  if (linhas * colunas > 1_000_000) invalidar('A faixa da curva tem vértices demais')
  const normais = laterais(c),
    posicoes = new Float32Array(linhas * colunas * 3),
    uvs = new Float32Array(linhas * colunas * 2),
    indices = new Uint32Array((linhas - 1) * divisoes * 6)
  for (let i = 0; i < linhas; i++) {
    const p = c.pontos[i % n]!,
      lado = normais[i % n]!
    for (let k = 0; k < colunas; k++) {
      const u = k / divisoes,
        afastamento = (0.5 - u) * largura,
        x = p.x + lado.x * afastamento,
        z = p.z + lado.z * afastamento,
        v = i * colunas + k
      posicoes[v * 3] = x
      posicoes[v * 3 + 1] = (alturaDoPonto ? alturaDoPonto(i % n) : alturaEm!(x, z)) + elevacao
      posicoes[v * 3 + 2] = z
      uvs[v * 2] = u
      uvs[v * 2 + 1] = c.distancias[i]! / largura
    }
  }
  let q = 0
  for (let i = 0; i < linhas - 1; i++)
    for (let k = 0; k < divisoes; k++) {
      const a = i * colunas + k,
        b = a + 1,
        d = a + colunas,
        e = d + 1
      // u = 0 fica à esquerda do avanço: esta ordem deixa a face voltada para cima (+Y).
      indices.set([a, b, d, b, e, d], q)
      q += 6
    }
  return { posicoes, uvs, indices }
}

const areaComSinal = (p: readonly PontoNoChao[]) => {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!,
      b = p[(i + 1) % p.length]!
    s += a.x * b.z - b.x * a.z
  }
  return s / 2
}

/** Área de um polígono no chão, em metros quadrados. */
export const areaDoPoligono = (p: readonly PontoNoChao[]) => Math.abs(areaComSinal(p))

/**
 * Triângulos de um polígono simples (praça, lago), por corte de orelhas. Devolve índices dos
 * pontos recebidos, sempre com a face voltada para cima (+Y).
 */
export function triangularPoligono(pontos: readonly PontoNoChao[]): Uint32Array {
  const n = pontos.length
  if (n < 3 || n > 4096) invalidar('O polígono precisa ter de 3 a 4096 pontos')
  const area = areaComSinal(pontos),
    sentido = area > 0 ? 1 : -1
  if (Math.abs(area) < 1e-9) invalidar('O polígono cruza a si mesmo ou tem área nula')
  const vira = (a: PontoNoChao, b: PontoNoChao, c: PontoNoChao) =>
    sentido * ((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x))
  const resta = Array.from({ length: n }, (_, i) => i),
    saida: number[] = []
  let guarda = 0
  while (resta.length > 3 && guarda < n * n) {
    let cortou = false
    for (let i = 0; i < resta.length; i++) {
      const ia = resta[(i - 1 + resta.length) % resta.length]!,
        ib = resta[i]!,
        ic = resta[(i + 1) % resta.length]!,
        a = pontos[ia]!,
        b = pontos[ib]!,
        c = pontos[ic]!
      guarda++
      if (vira(a, b, c) <= 1e-12) continue
      let livre = true
      for (const j of resta) {
        if (j === ia || j === ib || j === ic) continue
        const p = pontos[j]!
        if (vira(a, b, p) >= 0 && vira(b, c, p) >= 0 && vira(c, a, p) >= 0) {
          livre = false
          break
        }
      }
      if (!livre) continue
      // No plano XZ, anti-horário visto de +Y é área negativa: inverte para a face subir.
      saida.push(ia, ...(sentido > 0 ? [ic, ib] : [ib, ic]))
      resta.splice(i, 1)
      cortou = true
      break
    }
    if (!cortou) invalidar('O polígono cruza a si mesmo ou tem área nula')
  }
  if (resta.length === 3) {
    const [ia, ib, ic] = resta as [number, number, number]
    if (vira(pontos[ia]!, pontos[ib]!, pontos[ic]!) > 1e-12)
      saida.push(ia, ...(sentido > 0 ? [ic, ib] : [ib, ic]))
  }
  // Num polígono que se cruza, as orelhas não somam a área do contorno.
  let coberta = 0
  for (let i = 0; i < saida.length; i += 3)
    coberta += Math.abs(
      areaComSinal([pontos[saida[i]!]!, pontos[saida[i + 1]!]!, pontos[saida[i + 2]!]!]),
    )
  if (Math.abs(coberta - Math.abs(area)) > Math.abs(area) * 1e-6)
    invalidar('O polígono cruza a si mesmo ou tem área nula')
  return Uint32Array.from(saida)
}

export interface TrechoMaisProximo {
  /** Índice do ponto que começa o trecho. */
  indice: number
  /** 0 no começo do trecho, 1 no fim. */
  t: number
  distancia: number
  ponto: PontoNoChao
}

/** Trecho da linha de controle mais perto de um ponto: onde o clique pega a curva. */
export function trechoMaisProximo(
  pontos: readonly PontoNoChao[],
  p: PontoNoChao,
  fechada = false,
): TrechoMaisProximo {
  if (pontos.length < 2) invalidar('A curva precisa de dois pontos')
  let melhor: TrechoMaisProximo | null = null
  for (let i = 0; i < (fechada ? pontos.length : pontos.length - 1); i++) {
    const a = pontos[i]!,
      b = pontos[(i + 1) % pontos.length]!,
      ex = b.x - a.x,
      ez = b.z - a.z,
      c2 = ex * ex + ez * ez,
      t = c2 > 0 ? limitar(((p.x - a.x) * ex + (p.z - a.z) * ez) / c2, 0, 1) : 0,
      ponto = { x: a.x + ex * t, z: a.z + ez * t },
      d = distancia(ponto, p)
    if (!melhor || d < melhor.distancia) melhor = { indice: i, t, distancia: d, ponto }
  }
  return melhor!
}

/** Insere um ponto de controle no trecho mais próximo. Não altera a lista recebida. */
export function inserirPontoNaCurva(
  pontos: readonly PontoNoChao[],
  p: PontoNoChao,
  fechada = false,
): { pontos: PontoNoChao[]; indice: number } {
  const trecho = trechoMaisProximo(pontos, p, fechada),
    novo = pontos.map((q) => ({ x: q.x, z: q.z }))
  novo.splice(trecho.indice + 1, 0, { x: p.x, z: p.z })
  return { pontos: novo, indice: trecho.indice + 1 }
}

/** Retira um ponto de controle, recusando deixar a curva sem o mínimo. */
export function removerPontoDaCurva(
  pontos: readonly PontoNoChao[],
  indice: number,
  fechada = false,
): PontoNoChao[] {
  if (!Number.isInteger(indice) || indice < 0 || indice >= pontos.length)
    invalidar('O ponto não existe na curva')
  if (pontos.length <= (fechada ? 3 : 2)) invalidar('A curva não pode ficar com menos pontos')
  return pontos.filter((_, i) => i !== indice).map((q) => ({ x: q.x, z: q.z }))
}

export interface MoldeDaCurva {
  /** Largura do leito plano, em metros. */
  largura: number
  /** Faixa de talude de cada lado. Padrão: metade da largura. */
  borda?: number
  /** Soma à altura do eixo: negativo cava (leito de rio, vala), positivo levanta (aterro). */
  deslocamento?: number
  /** Janela em metros da média que alisa o sobe e desce do eixo. Padrão: quatro larguras. */
  suavizacao?: number
  /** Verdadeiro: o eixo nunca sobe no sentido da curva. É o que faz a água do rio correr. */
  descer?: boolean
  /** Escavação conserva depressões existentes; nunca aterra o eixo nem os taludes. */
  somenteAbaixar?: boolean
}

/**
 * Imprime a curva no terreno: é a estrada que molda o chão e o rio que cava o leito. O eixo
 * segue o relevo que existia, alisado; cada amostra é levada à altura do ponto mais próximo do
 * eixo, com efeito cheio no leito e suave no talude. Devolve a região tocada e o perfil do eixo.
 */
export function moldarTerrenoPelaCurva(
  campo: CampoDeAlturas,
  curva: Polilinha,
  molde: MoldeDaCurva,
): { regiao: RegiaoDoCampo | null; estacoes: (PontoDaCurva & { y: number })[] } {
  const borda = molde.borda ?? molde.largura / 2,
    deslocamento = molde.deslocamento ?? 0,
    janela = molde.suavizacao ?? molde.largura * 4
  if (
    !(molde.largura > 0) ||
    molde.largura > 512 ||
    !(borda >= 0) ||
    borda > 512 ||
    !Number.isFinite(deslocamento) ||
    Math.abs(deslocamento) > 2000 ||
    !(janela >= 0) ||
    janela > 8192
  )
    invalidar('O molde da curva é inválido')
  const passo = Math.max(campo.passo / 2, curva.comprimento / 50_000),
    pontos = reamostrarCurva(curva, passo),
    n = pontos.length,
    brutas = pontos.map((p) => alturaDoCampo(campo, p.x, p.z)),
    espaco = curva.comprimento / (curva.fechada ? n : n - 1),
    meiaJanela = Math.floor(janela / 2 / espaco),
    acumulada = [0]
  for (const h of brutas) acumulada.push(acumulada[acumulada.length - 1]! + h)
  const alturas = brutas.map((_, i) => {
    const a = Math.max(0, i - meiaJanela),
      b = Math.min(n - 1, i + meiaJanela)
    const media = (acumulada[b + 1]! - acumulada[a]!) / (b - a + 1)
    return molde.somenteAbaixar ? Math.min(media, brutas[i]!) : media
  })
  if (molde.descer) for (let i = 1; i < n; i++) alturas[i] = Math.min(alturas[i]!, alturas[i - 1]!)
  const estacoes = pontos.map((p, i) => ({
    ...p,
    y: limitar(alturas[i]! + deslocamento, campo.min, campo.max),
  }))

  const meia = molde.largura / 2,
    alcance = meia + borda
  let total: RegiaoDoCampo | null = null
  for (const p of pontos)
    total = unirRegioes(
      total,
      regiaoDoRetangulo(campo, p.x - alcance, p.z - alcance, p.x + alcance, p.z + alcance),
    )
  if (!total) return { regiao: null, estacoes }
  // Cada amostra obedece ao ponto do eixo mais próximo dela, e parte sempre da altura
  // original: trechos vizinhos não somam o efeito na emenda nem puxam a altura de longe.
  const lx = total.x1 - total.x0 + 1,
    lz = total.z1 - total.z0 + 1,
    largura = campo.colunas + 1,
    antes = new Float64Array(lx * lz),
    perto = new Float32Array(lx * lz).fill(Number.POSITIVE_INFINITY)
  for (let z = 0; z < lz; z++)
    antes.set(
      campo.alturas.subarray(
        (total.z0 + z) * largura + total.x0,
        (total.z0 + z) * largura + total.x0 + lx,
      ),
      z * lx,
    )
  for (let s = 0; s < (curva.fechada ? n : n - 1); s++) {
    const a = estacoes[s]!,
      b = estacoes[(s + 1) % n]!,
      ex = b.x - a.x,
      ez = b.z - a.z,
      c2 = ex * ex + ez * ez
    if (c2 < 1e-12) continue
    const r = regiaoDoRetangulo(
      campo,
      Math.min(a.x, b.x) - alcance,
      Math.min(a.z, b.z) - alcance,
      Math.max(a.x, b.x) + alcance,
      Math.max(a.z, b.z) + alcance,
    )
    if (!r) continue
    for (let iz = r.z0; iz <= r.z1; iz++) {
      const z = campo.origem.z + iz * campo.passo
      for (let ix = r.x0; ix <= r.x1; ix++) {
        const x = campo.origem.x + ix * campo.passo,
          t = limitar(((x - a.x) * ex + (z - a.z) * ez) / c2, 0, 1),
          dx = x - (a.x + ex * t),
          dz = z - (a.z + ez * t),
          d = Math.sqrt(dx * dx + dz * dz)
        if (d >= alcance) continue
        const k = (iz - total.z0) * lx + ix - total.x0
        if (d >= perto[k]!) continue
        perto[k] = d
        const peso = d <= meia ? 1 : suave(1 - (d - meia) / borda),
          h = antes[k]!
        const nova = limitar(h + (a.y + (b.y - a.y) * t - h) * peso, campo.min, campo.max)
        campo.alturas[iz * largura + ix] = molde.somenteAbaixar ? Math.min(h, nova) : nova
      }
    }
  }
  return { regiao: total, estacoes }
}

export interface EstacaoDaPonte extends PontoNoChao {
  /** Altura do tabuleiro. */
  y: number
  /** Altura do chão embaixo. */
  chao: number
  /** Vão livre entre o tabuleiro e o chão; negativo onde o chão passa do tabuleiro. */
  vao: number
  distancia: number
}

/**
 * Perfil de uma ponte reta: tabuleiro em linha entre as duas cabeceiras e, a cada estação, o
 * vão até o chão. Serve para escolher o comprimento dos pilares e avisar onde o morro atravessa
 * o tabuleiro. Sem `y`, a cabeceira assenta no chão.
 */
export function perfilDaPonte(
  de: PontoNoChao & { y?: number },
  ate: PontoNoChao & { y?: number },
  alturaEm: (x: number, z: number) => number,
  passo = 1,
): { comprimento: number; estacoes: EstacaoDaPonte[]; maiorVao: number; atravessa: boolean } {
  const comprimento = distancia(de, ate)
  if (!(comprimento > 1e-6) || !(passo > 0)) invalidar('A ponte precisa de duas cabeceiras')
  const n = Math.max(1, Math.round(comprimento / passo))
  if (n > 100_000) invalidar('A ponte gera estações demais')
  const ya = de.y ?? alturaEm(de.x, de.z),
    yb = ate.y ?? alturaEm(ate.x, ate.z),
    estacoes: EstacaoDaPonte[] = []
  let maiorVao = 0,
    atravessa = false
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      x = de.x + (ate.x - de.x) * t,
      z = de.z + (ate.z - de.z) * t,
      y = ya + (yb - ya) * t,
      chao = alturaEm(x, z),
      vao = y - chao
    if (vao > maiorVao) maiorVao = vao
    if (vao < -1e-6 && i > 0 && i < n) atravessa = true
    estacoes.push({ x, z, y, chao, vao, distancia: comprimento * t })
  }
  return { comprimento, estacoes, maiorVao, atravessa }
}
