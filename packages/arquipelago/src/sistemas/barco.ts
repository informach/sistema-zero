import type { IlhaId } from '@sistemazero/arquipelago-contracts'
import type { Ponto } from './cipo'

export type PortoId = Exclude<IlhaId, 'farol'>

/** Propostas da fase3-04, em metros e segundos. Sem gravar a viagem. */
export const BARCO = {
  amostrasPorTrecho: 20, // Curva preparada uma vez, com consulta binária no passo.
  passoDoArco: 10, // Graus entre guias no arco externo.
  avancoDaProa: 8, // Sai reto do píer antes de contornar a ilha.
  raioDeSaida: 60, // Canal entre as ilhas antes de alcançar o arco externo.
  velocidade: 12, // Travessia curta, reduzida automaticamente perto dos cais.
  pertoDoCais: 10, // Faixa de aproximação a 2 m/s.
  velocidadeNoCais: 2,
  manobra: 25, // Completa a meia volta em água livre, antes dos últimos 10 m ao deque.
  embarque: 1.5, // Tempo para passar do cais ao convés.
  passoAlto: 0.6, // Eleva os pés acima da amurada durante a passagem.
  alcance: 1.25, // Só embarca junto da âncora, fora da luneta.
  raioExterno: 150, // Fora do anel de 82 m e das rodas de nado.
  setorDeSaida: 110, // Entre Nuvens (80°) e Vale dos Dinos (140°).
  canalDoRecife: -70, // Entrada já medida pelo sudeste, fora do navio e do labirinto.
  corredor: 5, // Meia largura livre nas boias, incluindo casco e pneus.
  esperaDaIlha: 29, // Dentro da ativação de 30 m, antes dos novos deques e sua espera pelo chão.
  esperaMaxima: 20, // Falha de carga devolve ao porto de origem, sem deixar no mar.
} as const

export interface Porto {
  barco: Ponto
  giro: number
  embarque: Ponto
}
export interface AmostraDaRota extends Ponto {
  distancia: number
  giro: number
}
export interface RotaDoBarco {
  pontos: AmostraDaRota[]
  comprimento: number
}
export type FaseDoBarco = 'atracado' | 'embarque' | 'viagem' | 'espera' | 'desembarque'
export interface Travessia {
  itinerario: readonly [PortoId, PortoId]
  portos: readonly [Porto, Porto]
  rota: RotaDoBarco
  passageiro: Ponto
  centros: readonly [Ponto | null, Ponto | null]
  fase: FaseDoBarco
  origem: 0 | 1
  destino: 0 | 1
  distancia: number
  anterior: {
    distancia: number
    tempo: number
    fase: FaseDoBarco
    pose: Ponto & { giro: number }
    pe: Ponto
  }
  tempo: number
  espera: number
  prontos: [boolean, boolean]
  inicio: Ponto
  pose: Ponto & { giro: number }
  pe: Ponto
  /** Âncora animada em coordenadas do mundo, atualizada pelo desenho. */
  visual: Ponto
  devolvendo: boolean
  /** Na volta das boias, o lado e o remo de agora; `undefined` nas viagens entre ilhas. */
  regata?: Regata
}

const rad = (graus: number) => (graus * Math.PI) / 180
const polar = (r: number, graus: number): Ponto => ({
  x: r * Math.cos(rad(graus)),
  y: 0,
  z: r * Math.sin(rad(graus)),
})
const suave = (t: number) => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** Curva amostrada uma vez. O laço só consulta números e escreve na saída recebida. */
export function criarRotaDoBarco(
  a: Porto,
  b: Porto,
  itinerario: readonly [PortoId, PortoId],
): RotaDoBarco {
  const sair = (porto: Porto, id: PortoId): Ponto[] => {
    const p = porto.barco
    const ux = Math.cos(porto.giro),
      uz = -Math.sin(porto.giro)
    if (id === 'sua-ilha')
      return [
        p,
        { x: p.x + ux * BARCO.avancoDaProa, y: 0, z: p.z + uz * BARCO.avancoDaProa },
        polar(BARCO.raioDeSaida, BARCO.setorDeSaida),
        polar(BARCO.raioExterno, BARCO.setorDeSaida),
      ]
    // O Recife já tinha um canal de acesso pelo sudeste. Sair reto pela proa atravessaria
    // a faixa de segurança da área do navio, que não existe nos cinco portos novos.
    if (id === 'recife') return [p, polar(BARCO.raioExterno, BARCO.canalDoRecife)]
    const projecao = p.x * ux + p.z * uz
    const t = -projecao + Math.sqrt(projecao ** 2 + BARCO.raioExterno ** 2 - p.x ** 2 - p.z ** 2)
    return [
      p,
      ...[BARCO.avancoDaProa, 25, t].map((d) => ({ x: p.x + ux * d, y: 0, z: p.z + uz * d })),
    ]
  }
  const ida = sair(a, itinerario[0]),
    volta = sair(b, itinerario[1])
  const foraA = ida.at(-1)!,
    foraB = volta.at(-1)!
  const angulo = Math.atan2(foraA.z, foraA.x)
  const diferenca = Math.atan2(
    Math.sin(Math.atan2(foraB.z, foraB.x) - angulo),
    Math.cos(Math.atan2(foraB.z, foraB.x) - angulo),
  )
  const trechos = Math.ceil(Math.abs(diferenca) / rad(BARCO.passoDoArco))
  const guias = [...ida]
  for (let i = 1; i < trechos; i++) {
    const a = angulo + (diferenca * i) / trechos
    guias.push({ x: BARCO.raioExterno * Math.cos(a), y: 0, z: BARCO.raioExterno * Math.sin(a) })
  }
  guias.push(...volta.reverse())
  return rotaDasGuias(guias, b)
}

/** A rota amostrada por Catmull-Rom a partir das guias, terminando no barco do cais `fim`. */
function rotaDasGuias(guias: readonly Ponto[], fim: Porto): RotaDoBarco {
  const b = fim
  const pontos: AmostraDaRota[] = []
  let comprimento = 0
  for (let i = 0; i < guias.length - 1; i++) {
    const p0 = guias[Math.max(0, i - 1)]!
    const p1 = guias[i]!
    const p2 = guias[i + 1]!
    const p3 = guias[Math.min(guias.length - 1, i + 2)]!
    // Catmull-Rom: vinte amostras por trecho, só na construção da rota.
    for (let j = 0; j < BARCO.amostrasPorTrecho; j++) {
      const t = j / BARCO.amostrasPorTrecho
      const eixo = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t * t +
          (-a + 3 * b - 3 * c + d) * t * t * t)
      const p = {
        x: eixo(p0.x, p1.x, p2.x, p3.x),
        y: 0,
        z: eixo(p0.z, p1.z, p2.z, p3.z),
        distancia: 0,
        giro: 0,
      }
      const anterior = pontos.at(-1)
      if (anterior) comprimento += Math.hypot(p.x - anterior.x, p.z - anterior.z)
      p.distancia = comprimento
      pontos.push(p)
    }
  }
  const ultimo = pontos.at(-1)!
  comprimento += Math.hypot(b.barco.x - ultimo.x, b.barco.z - ultimo.z)
  pontos.push({ ...b.barco, distancia: comprimento, giro: 0 })
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[Math.max(0, i - 1)]!,
      b = pontos[Math.min(pontos.length - 1, i + 1)]!
    pontos[i]!.giro = Math.atan2(-(b.z - a.z), b.x - a.x)
  }
  return { pontos, comprimento }
}

/**
 * A volta das boias (lacunas, 01/11/2026; a proposta: o barco é "um minijogo e um jeito de chegar"):
 * a regata do píer da sua ilha em volta dela, por fora das pontes e do anel (o mesmo canal de
 * saída das viagens, `setorDeSaida`, e a volta inteira no `raioExterno`), de volta ao mesmo píer.
 */
export function criarRotaDaRegata(porto: Porto): RotaDoBarco {
  const p = porto.barco
  const ux = Math.cos(porto.giro),
    uz = -Math.sin(porto.giro)
  const ida: Ponto[] = [
    p,
    { x: p.x + ux * BARCO.avancoDaProa, y: 0, z: p.z + uz * BARCO.avancoDaProa },
    polar(BARCO.raioDeSaida, BARCO.setorDeSaida),
    polar(BARCO.raioExterno, BARCO.setorDeSaida),
  ]
  const guias = [...ida]
  const inicio = rad(BARCO.setorDeSaida)
  const trechos = Math.ceil(360 / BARCO.passoDoArco)
  for (let i = 1; i < trechos; i++) {
    const a = inicio + (Math.PI * 2 * i) / trechos
    guias.push({ x: BARCO.raioExterno * Math.cos(a), y: 0, z: BARCO.raioExterno * Math.sin(a) })
  }
  guias.push(...[...ida].reverse())
  return rotaDasGuias(guias, porto)
}

/** A regata: quanto o barco vai para o lado da rota e quanto se rema (de -1 a 1 e de 0 a 1). */
export interface Regata {
  lado: number
  remo: number
}
export const REGATA = {
  /** Até onde o barco vai para cada lado da linha da rota (o corredor livre tem 5 m de meia largura). */
  lado: 3,
  /** Quão rápido o barco vai para o lado (m/s). */
  rapidezDoLado: 2.5,
  /** Remando, o barco vai até isto mais rápido. */
  remo: 0.4,
} as const

export function amostrarRota(
  rota: RotaDoBarco,
  distancia: number,
  saida: Ponto & { giro: number },
): void {
  const d = Math.max(0, Math.min(rota.comprimento, distancia))
  let baixo = 0
  let alto = rota.pontos.length - 1
  while (alto - baixo > 1) {
    const meio = (baixo + alto) >> 1
    if (rota.pontos[meio]!.distancia < d) baixo = meio
    else alto = meio
  }
  const a = rota.pontos[baixo]!
  const b = rota.pontos[alto]!
  const t = (d - a.distancia) / Math.max(1e-6, b.distancia - a.distancia)
  saida.x = a.x + (b.x - a.x) * t
  saida.y = a.y + (b.y - a.y) * t
  saida.z = a.z + (b.z - a.z) * t
  const giro = b.giro - a.giro
  saida.giro = a.giro + Math.atan2(Math.sin(giro), Math.cos(giro)) * t
}

export function criarTravessia(
  portos: readonly [Porto, Porto],
  passageiro: Ponto,
  centros: readonly [Ponto | null, Ponto | null],
  itinerario: readonly [PortoId, PortoId],
  rota = criarRotaDoBarco(...portos, itinerario),
): Travessia {
  return {
    itinerario,
    portos,
    passageiro,
    centros,
    rota,
    fase: 'atracado',
    origem: 0,
    destino: 1,
    distancia: 0,
    anterior: {
      distancia: 0,
      tempo: 0,
      fase: 'atracado',
      pose: { ...portos[0].barco, giro: portos[0].giro },
      pe: { ...portos[0].embarque },
    },
    tempo: 0,
    espera: 0,
    prontos: [true, false],
    inicio: { x: 0, y: 0, z: 0 },
    pose: { ...portos[0].barco, giro: portos[0].giro },
    pe: { ...portos[0].embarque },
    visual: { ...portos[0].embarque },
    devolvendo: false,
  }
}

export function podeEmbarcar(
  v: Travessia,
  porto: 0 | 1,
  aberta: boolean,
  noChao: boolean,
  p: Ponto,
): boolean {
  const e = v.portos[porto].embarque
  return (
    aberta &&
    noChao &&
    v.fase === 'atracado' &&
    v.prontos[porto] &&
    Math.hypot(p.x - e.x, p.z - e.z) <= BARCO.alcance &&
    Math.abs(p.y - e.y) < 0.5
  )
}

export function embarcar(v: Travessia, porto: 0 | 1, pe: Ponto): void {
  v.origem = porto
  v.destino = porto === 0 ? 1 : 0
  v.fase = 'embarque'
  v.tempo = v.espera = 0
  v.devolvendo = false
  v.distancia = porto === 0 ? 0 : v.rota.comprimento
  Object.assign(v.inicio, pe)
  Object.assign(v.pose, v.portos[porto].barco, { giro: v.portos[porto].giro })
}

function peNoConves(v: Travessia): void {
  const cos = Math.cos(v.pose.giro),
    sin = Math.sin(v.pose.giro)
  v.pe.x = v.pose.x + v.passageiro.x * cos + v.passageiro.z * sin
  v.pe.y = v.pose.y + v.passageiro.y
  v.pe.z = v.pose.z - v.passageiro.x * sin + v.passageiro.z * cos
}

/**
 * Pausa não altera nem o tempo. Destino indisponível devolve pelo mesmo caminho. Na volta das
 * boias, `pedidoX`/`pedidoZ` (o direcional no mundo) guiam o barco para os lados e remam.
 */
export function passoDaTravessia(
  v: Travessia,
  dt: number,
  pausado: boolean,
  pedidoX = 0,
  pedidoZ = 0,
): void {
  if (pausado || v.fase === 'atracado') return
  v.anterior.distancia = v.distancia
  v.anterior.tempo = v.tempo
  v.anterior.fase = v.fase
  Object.assign(v.anterior.pose, v.pose)
  Object.assign(v.anterior.pe, v.pe)
  v.tempo += dt
  if (v.fase === 'embarque' || v.fase === 'desembarque') {
    peNoConves(v)
    const entrando = v.fase === 'embarque'
    const a = v.inicio
    const b = entrando ? v.pe : v.portos[v.destino].embarque
    const t = suave(Math.min(1, v.tempo / BARCO.embarque))
    v.pe.x = a.x + (b.x - a.x) * t
    v.pe.y = a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * BARCO.passoAlto
    v.pe.z = a.z + (b.z - a.z) * t
    if (v.tempo >= BARCO.embarque) {
      v.fase = entrando ? 'viagem' : 'atracado'
      v.tempo = 0
    }
    return
  }
  const centro = v.centros[v.destino]
  const perto = centro && Math.hypot(v.pose.x - centro.x, v.pose.z - centro.z) < BARCO.esperaDaIlha
  if (perto && !v.prontos[v.destino]) {
    v.fase = 'espera'
    v.espera += dt
    if (!v.devolvendo && v.espera >= BARCO.esperaMaxima) {
      v.destino = v.origem
      v.devolvendo = true
      v.fase = 'viagem'
    }
    return
  }
  v.fase = 'viagem'
  const cais = Math.min(v.distancia, v.rota.comprimento - v.distancia)
  // Na regata: o direcional para a frente rema, para o lado leva o barco (longe dos cais).
  const regata = v.regata
  const livre = suave(Math.min(1, Math.max(0, (cais - BARCO.manobra) / BARCO.pertoDoCais)))
  if (regata) {
    const frente = v.destino === 1 ? 1 : -1
    const gx = Math.cos(v.pose.giro) * frente,
      gz = -Math.sin(v.pose.giro) * frente
    regata.remo = Math.max(0, Math.min(1, pedidoX * gx + pedidoZ * gz))
    const pedidoDoLado = Math.max(-1, Math.min(1, pedidoX * -gz + pedidoZ * gx)) * REGATA.lado
    const alvo = pedidoDoLado * livre
    const passo = REGATA.rapidezDoLado * dt
    regata.lado += Math.max(-passo, Math.min(passo, alvo - regata.lado))
  }
  const velocidade =
    (BARCO.velocidadeNoCais +
      (BARCO.velocidade - BARCO.velocidadeNoCais) * suave(Math.min(1, cais / BARCO.pertoDoCais))) *
    (1 + (regata ? REGATA.remo * regata.remo * livre : 0))
  v.distancia = Math.max(
    0,
    Math.min(v.rota.comprimento, v.distancia + (v.destino === 1 ? 1 : -1) * velocidade * dt),
  )
  amostrarRota(v.rota, v.distancia, v.pose)
  if (v.destino === 0) v.pose.giro += Math.PI
  // Mantém o giro da arte no cais, misturando pela menor volta nos últimos metros.
  const indiceDoPorto = v.distancia < v.rota.comprimento / 2 ? 0 : 1
  const porto = v.portos[indiceDoPorto]
  const peso =
    1 -
    suave(
      Math.max(
        0,
        (Math.min(v.distancia, v.rota.comprimento - v.distancia) - BARCO.pertoDoCais) /
          (BARCO.manobra - BARCO.pertoDoCais),
      ),
    )
  const diferenca = porto.giro - v.pose.giro
  // Ao entrar de ré, a meia volta tem lado definido. ±pi é o mesmo rumo, mas alternar o sinal
  // por arredondamento faria o barco virar de um lado para o outro durante a aproximação.
  const volta = Math.PI * 2
  const giro =
    indiceDoPorto === v.destino
      ? ((diferenca % volta) + volta) % volta
      : Math.atan2(Math.sin(diferenca), Math.cos(diferenca))
  v.pose.giro += giro * peso
  if (v.regata) {
    // De lado da rota: a normal da direção (`(cos g, -sen g)` vira `(sen g, cos g)`).
    v.pose.x += Math.sin(v.pose.giro) * v.regata.lado
    v.pose.z += Math.cos(v.pose.giro) * v.regata.lado
  }
  peNoConves(v)
  if (v.distancia === (v.destino === 1 ? v.rota.comprimento : 0)) {
    v.fase = 'desembarque'
    v.tempo = 0
    Object.assign(v.inicio, v.pe)
  }
}

/** Distância ao caminho, usada uma vez para abrir só as boias dos portos. */
export function noCorredorDoBarco(rota: RotaDoBarco, p: { x: number; z: number }): boolean {
  for (let i = 1; i < rota.pontos.length; i++) {
    const a = rota.pontos[i - 1]!,
      b = rota.pontos[i]!
    const dx = b.x - a.x,
      dz = b.z - a.z
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / Math.max(1e-9, dx * dx + dz * dz)),
    )
    if (Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) < BARCO.corredor) return true
  }
  return false
}
